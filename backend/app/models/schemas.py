from pydantic import BaseModel, Field
from typing import Optional


# -------- Shared --------

class CriterionScore(BaseModel):
    score: float = Field(..., ge=0, le=9)
    feedback: str


class SimilarEssay(BaseModel):
    overall_band:     float
    examiner_comment: str
    


# -------- LLM output — what the model returns --------
# separate from ScoringResponse so with_structured_output
# only asks the model for what it can actually generate

class LLMScoringOutput(BaseModel):
    task_achievement:           CriterionScore
    coherence_cohesion:         CriterionScore
    lexical_resource:           CriterionScore
    grammatical_range_accuracy: CriterionScore
    overall_feedback:           str


# -------- Request --------

class ScoringRequest(BaseModel):
    task_type: int  = Field(..., ge=1, le=2, description="1 for Task 1, 2 for Task 2")
    question:  str  = Field(..., min_length=10, description="The IELTS writing prompt")
    essay:     str  = Field(..., min_length=50, description="The candidate's essay")
    language:  str  = Field(default="en")
    # optional model override from frontend
    provider:  str  = Field(default="")
    model:     str  = Field(default="")


# -------- Response --------

class ScoringResponse(BaseModel):
    task_achievement:           CriterionScore
    coherence_cohesion:         CriterionScore
    lexical_resource:           CriterionScore
    grammatical_range_accuracy: CriterionScore
    overall_band:               float
    overall_feedback:           str
    latency_ms:                 int
    # None if RAG finds no similar essays
    similar_essays: Optional[list[SimilarEssay]] = None


# -------- Follow-up chat --------

class ChatMessage(BaseModel):
    # must be either "user" or "assistant"
    role:    str = Field(..., pattern="^(user|assistant)$")
    content: str

class ChatRequest(BaseModel):
    essay:          str
    scoring_result: ScoringResponse
    # full conversation history — passed every time since model has no memory
    history:        list[ChatMessage] = []
    message:        str
    language:       str = Field(default="en")

class ChatResponse(BaseModel):
    reply: str