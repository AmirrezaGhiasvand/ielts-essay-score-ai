import os
import json
import time
from dotenv import load_dotenv
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document, HumanMessage, AIMessage
from langchain.schema.output_parser import StrOutputParser
from app.services.examples import build_few_shot_context
import numpy as np
from rank_bm25 import BM25Okapi
from app.models.schemas import (
    ScoringResponse,
    LLMScoringOutput,
    SimilarEssay,
)

load_dotenv()


# -------- Settings --------

OLLAMA_BASE_URL    = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL       = os.getenv("OLLAMA_MODEL", "mistral:7b")
GROQ_API_KEY       = os.getenv("GROQ_API_KEY")
GROQ_MODEL         = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL   = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
PROVIDER           = os.getenv("PROVIDER", "ollama")
EMBEDDING_MODEL    = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
CHROMA_DB_PATH     = os.getenv("CHROMA_DB_PATH", "./chroma_db")
CHROMA_COLLECTION  = os.getenv("CHROMA_COLLECTION_NAME", "ielts_essays")

# official IELTS minimum word counts
MIN_WORDS = {1: 150, 2: 250}

# language code to full name mapping
LANGUAGE_MAP = {
    "en": "English",
    "fa": "Persian/Farsi",
    "ar": "Arabic",
    "zh": "Chinese",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "tr": "Turkish",
}


# -------- Singletons --------

_embeddings   = None
_vector_store = None


def get_embeddings() -> OllamaEmbeddings:
    global _embeddings
    if _embeddings is None:
        print("Initializing embedding model...")
        _embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    return _embeddings


def get_vector_store() -> Chroma:
    global _vector_store
    if _vector_store is None:
        print("Connecting to ChromaDB...")
        _vector_store = Chroma(
            collection_name=CHROMA_COLLECTION,
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_DB_PATH,
        )
    return _vector_store

# -------- Hybrid retrieval --------

def hybrid_retrieve(
    essay:     str,
    question:  str,
    task_type: int,
    k:         int = 3,
) -> list[Document]:

    vector_store = get_vector_store()

    # ---- Step 1: Semantic search on essay ----
    essay_docs = vector_store.similarity_search(
        query=essay,
        k=20,
        filter={"task_type": task_type},
    )

    # ---- Step 2: Semantic search on question ----
    question_docs = vector_store.similarity_search(
        query=question,
        k=20,
        filter={"task_type": task_type},
    )

    # ---- Step 3: Merge candidate pool ----
    seen     = set()
    all_docs = []
    for doc in essay_docs + question_docs:
        key = doc.page_content[:100]
        if key not in seen:
            seen.add(key)
            all_docs.append(doc)

    if not all_docs:
        return []

    # ---- Step 4: BM25 on combined essay + question ----
    query_text = f"{question} {essay}"
    tokenized_query  = query_text.lower().split()
    tokenized_corpus = [doc.page_content.lower().split() for doc in all_docs]

    bm25        = BM25Okapi(tokenized_corpus)
    bm25_scores = bm25.get_scores(tokenized_query)

    # normalize BM25 scores to 0-1
    bm25_max = bm25_scores.max()
    if bm25_max > 0:
        bm25_scores = bm25_scores / bm25_max

    # ---- Step 5: Semantic scores via embeddings ----
    embeddings    = get_embeddings()
    essay_vec     = embeddings.embed_query(essay)
    question_vec  = embeddings.embed_query(question)
    doc_vecs      = embeddings.embed_documents([d.page_content for d in all_docs])

    def cosine(a, b):
        a, b   = np.array(a), np.array(b)
        denom  = np.linalg.norm(a) * np.linalg.norm(b)
        return float(np.dot(a, b) / denom) if denom > 0 else 0.0

    essay_scores    = [cosine(essay_vec, dv) for dv in doc_vecs]
    question_scores = [cosine(question_vec, dv) for dv in doc_vecs]

    # ---- Step 6: Weighted combination ----
    # essay semantic: 40%, question semantic: 30%, BM25 keyword: 30%
    final_scores = [
        0.4 * es + 0.3 * qs + 0.3 * bs
        for es, qs, bs in zip(essay_scores, question_scores, bm25_scores)
    ]

    # ---- Step 7: Sort and return top k with band diversity ----
    ranked = sorted(
        zip(all_docs, final_scores),
        key=lambda x: x[1],
        reverse=True,
    )

    # apply band diversity — avoid returning same band twice
    selected       = []
    selected_bands = set()

    for doc, score in ranked:
        band = doc.metadata.get("overall_band")
        if band not in selected_bands:
            selected.append(doc)
            selected_bands.add(band)
        elif len(selected) < k:
            selected.append(doc)
        if len(selected) >= k:
            break

    return selected

def get_llm(provider_override: str = None, model_override: str = None):
    # use override if provided, otherwise fall back to env settings
    active_provider = provider_override or PROVIDER
    
    if active_provider == "groq":
        print("Using Groq cloud provider...")
        return ChatGroq(
            api_key=GROQ_API_KEY,
            model=model_override or GROQ_MODEL,
            temperature=0.2,
        )
    elif active_provider == "openrouter":
        print("Using OpenRouter cloud provider...")
        return ChatOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            model=model_override or OPENROUTER_MODEL,
            temperature=0.2,
        )
    print("Using local Ollama provider...")
    return ChatOllama(
        model=model_override or OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.2,
    )


# -------- Official IELTS rounding --------

def official_ielts_round(score: float) -> float:
    # official IELTS rounding rules:
    # .00      → x.0
    # .01–.24  → x.0  (round down)
    # .25–.74  → x.5  (round to .5)
    # .75–.99  → x+1  (round up)
    decimal = score % 1
    base    = int(score)
    if decimal < 0.25:
        return float(base)
    elif decimal < 0.75:
        return base + 0.5
    else:
        return float(base + 1)


# -------- Format retrieved docs as context --------

def format_docs(docs: list[Document]) -> str:
    if not docs:
        return "No similar essays found in the database."

    context = "REFERENCE ESSAYS FROM EXAMINER DATABASE:\n"
    for i, doc in enumerate(docs, 1):
        band    = doc.metadata.get("overall_band", "N/A")
        comment = doc.metadata.get("examiner_comment", "")
        context += f"\nReference {i} (Band {band}):\n"
        if comment:
            context += f"Examiner Comment: {comment}\n"
        else:
            context += "No examiner comment available.\n"
    return context

# -------- Build full context (RAG + few-shot examples) --------

def build_context(docs: list[Document], task_type: int) -> str:
    rag_context      = format_docs(docs)
    few_shot_context = build_few_shot_context(task_type)
    return f"{few_shot_context}\n{rag_context}"

# -------- Scoring prompt --------

SCORING_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert IELTS examiner with years of experience scoring Task {task_type} essays.
Score the essay strictly based on the four official IELTS criteria below.

IELTS BAND DESCRIPTORS:

1. Task Achievement/Response:
   - Band 9: Fully addresses all parts of the task with well-developed ideas
   - Band 8: Covers all requirements sufficiently, presents and highlights key features
   - Band 7: Covers all requirements with well-extended ideas, minor lapses
   - Band 6: Addresses all parts, some more fully than others
   - Band 5: Partially addresses the task, format may be inappropriate
   - Band 4: Minimally addresses the task, tangential content
   - Band 3: Fails to address the task, very limited response
   - Band 2: Barely responds to the task, content is largely irrelevant
   - Band 1: No meaningful attempt to address the task

2. Coherence and Cohesion:
   - Band 9: Seamless cohesion, skilled paragraphing
   - Band 8: Sequences information and ideas logically, manages paragraphing well
   - Band 7: Logical progression, few errors in cohesion
   - Band 6: Coherent arrangement, effective cohesive devices
   - Band 5: Some organization, limited range of cohesive devices
   - Band 4: Basic arrangement, some faulty cohesion
   - Band 3: Very little control of organizational features, minimal cohesion
   - Band 2: No clear sequence, cohesive devices rarely used or inaccurate
   - Band 1: Lack of any organizational structure

3. Lexical Resource:
   - Band 9: Full flexibility, precise use of rare items
   - Band 8: Wide resource, fluent and flexible use, rare errors
   - Band 7: Sufficient range, some errors in word choice
   - Band 6: Adequate range, some errors in word choice/spelling
   - Band 5: Limited range, noticeable errors
   - Band 4: Basic vocabulary, errors may cause strain
   - Band 3: Very limited vocabulary, frequent errors
   - Band 2: Extremely limited vocabulary, meaning barely communicated
   - Band 1: No resource available except isolated words

4. Grammatical Range and Accuracy:
   - Band 9: Wide range of structures, rare errors
   - Band 8: Wide range of structures, majority of sentences error-free
   - Band 7: Variety of structures, some errors
   - Band 6: Mix of simple and complex structures, some errors
   - Band 5: Limited range, frequent errors
   - Band 4: Very limited range, frequent errors distort meaning
   - Band 3: Attempts basic structures, numerous errors dominate
   - Band 2: Cannot use sentence forms except memorized phrases
   - Band 1: No use of sentence forms at all

REFERENCE ESSAYS:
{context}

IMPORTANT RULES:
- Scores must be in 0.5 increments only (e.g. 5.0, 5.5, 6.0)
- DO NOT calculate overall band
- Respond in this language: {language}
- Respond ONLY in this exact JSON format with no other text:
{{
    "task_achievement": {{"score": 0.0, "feedback": "..."}},
    "coherence_cohesion": {{"score": 0.0, "feedback": "..."}},
    "lexical_resource": {{"score": 0.0, "feedback": "..."}},
    "grammatical_range_accuracy": {{"score": 0.0, "feedback": "..."}},
    "overall_feedback": "..."
}}
"""),
    ("human", """Task Type: Task {task_type}

Question:
{question}

Essay:
{essay}"""),
])


# -------- Score essay --------

def score_essay(
    task_type: int,
    question:  str,
    essay:     str,
    language:  str = "en",
    provider:  str = None,
    model:     str = None,
) -> ScoringResponse:

    # ---- Start timer ----
    start_time = time.time()

    # ---- Task 1 disabled until multimodal support ----
    if task_type == 1:
        raise ValueError(
            "Task 1 scoring requires a chart or diagram image. "
            "Multimodal support is coming soon."
        )

    # ---- Validate word count ----
    word_count = len(essay.split())
    min_words  = MIN_WORDS[task_type]
    if word_count < min_words:
        raise ValueError(
            f"Essay is too short ({word_count} words). "
            f"Task {task_type} requires at least {min_words} words."
        )

    # ---- Hybrid RAG retrieval ----
    # combines essay semantic + question semantic + BM25 keyword search
    print(f"Retrieving similar essays for Task {task_type}...")
    similar_docs = hybrid_retrieve(
        essay=essay,
        question=question,
        task_type=task_type,
        k=3,
    )
    context = build_context(similar_docs, task_type)
    print(f"Found {len(similar_docs)} similar essays")
    
    # ---- Build and run chain ----
    # use JSON parsing for all providers — with_structured_output behaves
    # inconsistently across Ollama, Groq, and OpenRouter
    active_provider = provider or PROVIDER
    model_name      = model or (OPENROUTER_MODEL if active_provider == "openrouter" else OLLAMA_MODEL)
    print(f"Scoring essay with {model_name}...")

    llm   = get_llm(provider_override=provider, model_override=model)
    chain = SCORING_PROMPT | llm | StrOutputParser()
    raw   = chain.invoke({
        "task_type": task_type,
        "question":  question,
        "essay":     essay,
        "context":   context,
        "language":  LANGUAGE_MAP.get(language, "English"),
    })

    # strip markdown code fences if model wraps response in them
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    data   = json.loads(raw)
    result = LLMScoringOutput(**data)

    # ---- Calculate overall band ----
    raw_average  = (
        result.task_achievement.score +
        result.coherence_cohesion.score +
        result.lexical_resource.score +
        result.grammatical_range_accuracy.score
    ) / 4
    overall_band = official_ielts_round(raw_average)
    print(f"Raw average: {raw_average:.3f} → Official band: {overall_band}")

    # ---- Calculate latency ----
    latency_ms = int((time.time() - start_time) * 1000)
    print(f"Total latency: {latency_ms}ms")

    # ---- Build similar essays for response ----
    similar_essays = [
        SimilarEssay(
            overall_band=doc.metadata.get("overall_band", 0.0),
            examiner_comment=doc.metadata.get("examiner_comment", ""),
        )
        for doc in similar_docs
    ]

    return ScoringResponse(
        task_achievement=result.task_achievement,
        coherence_cohesion=result.coherence_cohesion,
        lexical_resource=result.lexical_resource,
        grammatical_range_accuracy=result.grammatical_range_accuracy,
        overall_band=overall_band,
        overall_feedback=result.overall_feedback,
        latency_ms=latency_ms,
        similar_essays=similar_essays if similar_essays else None,
    )


# -------- Chat prompt --------

CHAT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert IELTS examiner helping a student improve their writing.
You have already scored their essay and must answer follow-up questions helpfully and specifically.
Always refer to the actual essay and scores when answering.
Respond in this language: {language}

Essay:
{essay}

Scoring Result:
- Task Achievement: {task_achievement_score} — {task_achievement_feedback}
- Coherence & Cohesion: {coherence_score} — {coherence_feedback}
- Lexical Resource: {lexical_score} — {lexical_feedback}
- Grammatical Range & Accuracy: {grammar_score} — {grammar_feedback}
- Overall Band: {overall_band}
- Overall Feedback: {overall_feedback}
"""),
    ("human", "{message}"),
])


# -------- Follow-up chat --------

def chat_about_essay(
    essay:          str,
    scoring_result: ScoringResponse,
    history:        list[dict],
    message:        str,
    language:       str = "en",
) -> str:

    language_name = LANGUAGE_MAP.get(language, "English")
    llm           = get_llm()

    # ---- Build messages with history ----
    # model has no memory — pass full history every time
    messages = CHAT_PROMPT.format_messages(
        language=language_name,
        essay=essay,
        task_achievement_score=scoring_result.task_achievement.score,
        task_achievement_feedback=scoring_result.task_achievement.feedback,
        coherence_score=scoring_result.coherence_cohesion.score,
        coherence_feedback=scoring_result.coherence_cohesion.feedback,
        lexical_score=scoring_result.lexical_resource.score,
        lexical_feedback=scoring_result.lexical_resource.feedback,
        grammar_score=scoring_result.grammatical_range_accuracy.score,
        grammar_feedback=scoring_result.grammatical_range_accuracy.feedback,
        overall_band=scoring_result.overall_band,
        overall_feedback=scoring_result.overall_feedback,
        message=message,
    )

    # inject history between system and last human message
    final_messages = [messages[0]]  # system
    for msg in history:
        if msg["role"] == "user":
            final_messages.append(HumanMessage(content=msg["content"]))
        else:
            # AIMessage for assistant history
            final_messages.append(AIMessage(content=msg["content"]))
    final_messages.append(messages[-1])  # current human message

    response = llm.invoke(final_messages)
    return response.content.strip()