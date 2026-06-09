import os
import time
from dotenv import load_dotenv
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

from app.models.schemas import (
    ScoringResponse,
    LLMScoringOutput,
    SimilarEssay,
    CriterionScore,
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


def get_llm(structured: bool = False):
    if PROVIDER == "groq":
        print("Using Groq cloud provider...")
        llm = ChatGroq(
            api_key=GROQ_API_KEY,
            model=GROQ_MODEL,
            temperature=0.2,
        )
    elif PROVIDER == "openrouter":
        print("Using OpenRouter cloud provider...")
        llm = ChatOpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            model=OPENROUTER_MODEL,
            temperature=0.2,
        )
    else:
        print("Using local Ollama provider...")
        llm = ChatOllama(
            model=OLLAMA_MODEL,
            base_url=OLLAMA_BASE_URL,
            temperature=0.2,
        )

    # bind structured output schema for scoring
    if structured:
        return llm.with_structured_output(LLMScoringOutput)
    return llm


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
) -> ScoringResponse:

    # ---- Start timer ----
    start_time = time.time()

    # ---- Validate word count ----
    word_count = len(essay.split())
    min_words  = MIN_WORDS[task_type]
    if word_count < min_words:
        raise ValueError(
            f"Essay is too short ({word_count} words). "
            f"Task {task_type} requires at least {min_words} words."
        )

    # ---- RAG retrieval ----
    print(f"Retrieving similar essays for Task {task_type}...")
    vector_store = get_vector_store()
    retriever    = vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k":       3,
            "fetch_k": 10,
            "filter":  {"task_type": task_type},
        },
    )
    similar_docs = retriever.invoke(essay)
    context      = format_docs(similar_docs)
    print(f"Found {len(similar_docs)} similar essays")

    # ---- Build and run chain ----
    print(f"Scoring essay with {OPENROUTER_MODEL if PROVIDER == 'openrouter' else OLLAMA_MODEL}...")
    llm   = get_llm(structured=True)
    chain = SCORING_PROMPT | llm

    result: LLMScoringOutput = chain.invoke({
        "task_type": task_type,
        "question":  question,
        "essay":     essay,
        "context":   context,
        "language":  LANGUAGE_MAP.get(language, "English"),
    })

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
            similarity=0.0,  # MMR doesn't return scores, set to 0
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


# -------- Follow-up chat --------

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


def chat_about_essay(
    essay:          str,
    scoring_result: ScoringResponse,
    history:        list[dict],
    message:        str,
    language:       str = "en",
) -> str:

    language_name = LANGUAGE_MAP.get(language, "English")
    llm           = get_llm(structured=False)

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
    from langchain.schema import HumanMessage, AIMessage
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