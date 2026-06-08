import os
import json
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain.schema import HumanMessage, SystemMessage, AIMessage

from app.models.schemas import ScoringResponse, CriterionScore, SimilarEssay
from app.services.rag import retrieve_similar_essays

load_dotenv()


# -------- Settings --------

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "gemma3:4b")

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


# -------- LLM --------

def get_llm():
    return ChatOllama(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=0.2,
        # low temperature for consistent, reliable scoring
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


# -------- Prompts --------

SCORING_SYSTEM_PROMPT = """You are an expert IELTS examiner with years of experience scoring Task {task_type} essays.
You must score the essay strictly based on the four official IELTS criteria below.

IELTS BAND DESCRIPTORS:

1. Task Achievement/Response (Task 1) or Task Response (Task 2):
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

{similar_essays_context}

IMPORTANT RULES:
- Scores must be 0.0 to 9.0 in 0.5 increments only (e.g. 5.0, 5.5, 6.0)
- DO NOT calculate overall band — it will be calculated separately
- Respond ONLY in valid JSON format, nothing else
- Respond in this language: {language}
"""

SCORING_HUMAN_PROMPT = """Task Type: Task {task_type}

Question:
{question}

Essay:
{essay}

Return your response in this exact JSON format:
{{
    "task_achievement": {{"score": 0.0, "feedback": "..."}},
    "coherence_cohesion": {{"score": 0.0, "feedback": "..."}},
    "lexical_resource": {{"score": 0.0, "feedback": "..."}},
    "grammatical_range_accuracy": {{"score": 0.0, "feedback": "..."}},
    "overall_feedback": "..."
}}"""


# -------- Build similar essays context --------

def build_similar_essays_context(similar_essays: list[dict]) -> str:
    if not similar_essays:
        return ""

    context = "\nREFERENCE ESSAYS FROM EXAMINER DATABASE:\n"
    for i, essay in enumerate(similar_essays, 1):
        context += f"\nReference {i} (Band {essay['overall_band']}):\n"
        if essay["examiner_comment"]:
            context += f"Examiner Comment: {essay['examiner_comment']}\n"
        else:
            context += "No examiner comment available.\n"
    return context


# -------- Parse LLM response --------

def parse_llm_response(raw: str) -> dict:
    # strip markdown code fences if model wraps response in them
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# -------- Score essay --------

def score_essay(
    task_type: int,
    question: str,
    essay: str,
    language: str = "en",
) -> ScoringResponse:

    # ---- Validate word count before calling LLM ----
    word_count = len(essay.split())
    min_words  = MIN_WORDS[task_type]
    if word_count < min_words:
        raise ValueError(
            f"Essay is too short ({word_count} words). "
            f"Task {task_type} requires at least {min_words} words."
        )

    # ---- RAG retrieval ----
    print(f"Retrieving similar essays for Task {task_type}...")
    similar_essays  = retrieve_similar_essays(essay, task_type)
    similar_context = build_similar_essays_context(similar_essays)
    print(f"Found {len(similar_essays)} similar essays")

    # ---- Build prompts ----
    language_name = LANGUAGE_MAP.get(language, "English")
    system_prompt = SCORING_SYSTEM_PROMPT.format(
        task_type=task_type,
        similar_essays_context=similar_context,
        language=language_name,
    )
    human_prompt = SCORING_HUMAN_PROMPT.format(
        task_type=task_type,
        question=question,
        essay=essay,
    )

    # ---- Call LLM with retry ----
    print(f"Scoring essay with {OLLAMA_MODEL}...")
    llm      = get_llm()
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt),
    ]

    data = None
    for attempt in range(2):
        response = llm.invoke(messages)
        try:
            data = parse_llm_response(response.content)
            break
        except json.JSONDecodeError:
            print(f"Attempt {attempt + 1}: malformed JSON, retrying...")
            if attempt == 1:
                raise ValueError("Model returned malformed JSON after 2 attempts.")

    # ---- Calculate overall band ourselves using official IELTS rounding ----
    raw_average  = (
        data["task_achievement"]["score"] +
        data["coherence_cohesion"]["score"] +
        data["lexical_resource"]["score"] +
        data["grammatical_range_accuracy"]["score"]
    ) / 4
    overall_band = official_ielts_round(raw_average)
    print(f"Raw average: {raw_average:.3f} → Official band: {overall_band}")

    # ---- Build ScoringResponse ----
    similar_essay_models = [
        SimilarEssay(
            overall_band=e["overall_band"],
            examiner_comment=e["examiner_comment"],
            similarity=e["similarity"],
        )
        for e in similar_essays
    ]

    return ScoringResponse(
        task_achievement=CriterionScore(**data["task_achievement"]),
        coherence_cohesion=CriterionScore(**data["coherence_cohesion"]),
        lexical_resource=CriterionScore(**data["lexical_resource"]),
        grammatical_range_accuracy=CriterionScore(**data["grammatical_range_accuracy"]),
        overall_band=overall_band,
        overall_feedback=data["overall_feedback"],
        similar_essays=similar_essay_models if similar_essay_models else None,
    )


# -------- Follow-up chat --------

def chat_about_essay(
    essay: str,
    scoring_result: ScoringResponse,
    history: list[dict],
    message: str,
    language: str = "en",
) -> str:

    language_name = LANGUAGE_MAP.get(language, "English")

    # ---- Build context from scoring result ----
    scoring_context = f"""
- Task Achievement: {scoring_result.task_achievement.score} — {scoring_result.task_achievement.feedback}
- Coherence & Cohesion: {scoring_result.coherence_cohesion.score} — {scoring_result.coherence_cohesion.feedback}
- Lexical Resource: {scoring_result.lexical_resource.score} — {scoring_result.lexical_resource.feedback}
- Grammatical Range & Accuracy: {scoring_result.grammatical_range_accuracy.score} — {scoring_result.grammatical_range_accuracy.feedback}
- Overall Band: {scoring_result.overall_band}
- Overall Feedback: {scoring_result.overall_feedback}
"""

    system_prompt = f"""You are an expert IELTS examiner helping a student improve their writing.
You have already scored their essay and must answer their follow-up questions helpfully and specifically.
Always refer to the actual essay and scores when answering.
Respond in this language: {language_name}

Essay:
{essay}

Scoring Result:
{scoring_context}
"""

    # ---- Build message history ----
    # Gemma has no memory — we pass full history every time
    messages = [SystemMessage(content=system_prompt)]
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            # AIMessage for assistant history, not SystemMessage
            messages.append(AIMessage(content=msg["content"]))
    messages.append(HumanMessage(content=message))

    # ---- Call LLM ----
    llm      = get_llm()
    response = llm.invoke(messages)
    return response.content.strip()