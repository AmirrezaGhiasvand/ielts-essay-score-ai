import json
import httpx
import os
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ScoringRequest,
    ScoringResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.chain import score_essay, chat_about_essay


# -------- Settings --------

router = APIRouter(prefix="/api", tags=["scoring"])


# -------- Routes --------

@router.post("/score", response_model=ScoringResponse)
async def score(request: ScoringRequest):
    try:
        result = score_essay(
            task_type=request.task_type,
            question=request.question,
            essay=request.essay,
            language=request.language,
        )
        return result

    except ValueError as e:
        # word count too low or structured output failed
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        reply = chat_about_essay(
            essay=request.essay,
            scoring_result=request.scoring_result,
            history=[m.dict() for m in request.history],
            message=request.message,
            language=request.language,
        )
        return ChatResponse(reply=reply)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    return {"status": "ok"}

@router.get("/models")
async def get_models():
    # ---- Fetch available Ollama models ----
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_models   = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ollama_base_url}/api/tags", timeout=3.0)
            if response.status_code == 200:
                data          = response.json()
                ollama_models = [m["name"] for m in data.get("models", [])]
    except Exception:
        # Ollama not running — return empty list
        pass

    # ---- Cloud providers always available if API key set ----
    cloud_models = []
    if os.getenv("OPENROUTER_API_KEY"):
        cloud_models += [
            {"id": "openai/gpt-4o-mini",                    "name": "GPT-4o Mini",       "provider": "openrouter"},
            {"id": "meta-llama/llama-3.3-70b-instruct:free","name": "Llama 3.3 70b",     "provider": "openrouter"},
            {"id": "google/gemini-2.0-flash-001",           "name": "Gemini 2.0 Flash",  "provider": "openrouter"},
        ]
    if os.getenv("GROQ_API_KEY"):
        cloud_models += [
            {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70b", "provider": "groq"},
        ]

    return {
        "current_provider": os.getenv("PROVIDER", "ollama"),
        "current_model":    os.getenv("OLLAMA_MODEL", "mistral:7b") if os.getenv("PROVIDER", "ollama") == "ollama" else os.getenv("OPENROUTER_MODEL", ""),
        "ollama_models":    [{"id": m, "name": m, "provider": "ollama"} for m in ollama_models],
        "cloud_models":     cloud_models,
    }