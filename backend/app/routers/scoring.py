import json
import httpx
import os
import pandas as pd
import random
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ScoringRequest,
    ScoringResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.chain import score_essay, chat_about_essay
from fastapi.responses import StreamingResponse

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
            provider=request.provider or None,
            model=request.model or None,
            api_key=request.api_key or None,
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
            provider=request.provider or None,
            model=request.model or None,
            api_key=request.api_key or None,
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
    # ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    # ollama_models   = []
    # try:
    #     async with httpx.AsyncClient() as client:
    #         response = await client.get(f"{ollama_base_url}/api/tags", timeout=3.0)
    #         print(f"Ollama response status: {response.status_code}")
    #         print(f"Ollama response body: {response.text[:500]}")
    #         if response.status_code == 200:
    #             data          = response.json()
    #             ollama_models = [m["name"] for m in data.get("models", [])]
    # except Exception as e:
    #     print(f"Ollama connection error: {e}")

    cloud_models = [
        {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openrouter"},
    ]
   

    return {
        # "current_provider": os.getenv("PROVIDER", "ollama"),
        # "current_model":    os.getenv("OLLAMA_MODEL", "mistral:7b") if os.getenv("PROVIDER", "ollama") == "ollama" else os.getenv("OPENROUTER_MODEL", ""),
        # "ollama_models":    [{"id": m, "name": m, "provider": "ollama"} for m in ollama_models],
        "cloud_models":     cloud_models,
    }


# ------- Streaming ---------
@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    from app.services.chain import chat_about_essay_stream

    async def event_generator():
        try:
            for chunk in chat_about_essay_stream(
                essay=request.essay,
                scoring_result=request.scoring_result,
                history=[m.dict() for m in request.history],
                message=request.message,
                language=request.language,
                provider=request.provider or None,
                model=request.model or None,
                api_key=request.api_key or None,
            ):
                yield chunk
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"\n\n[ERROR: {str(e)}]"

    return StreamingResponse(event_generator(), media_type="text/plain")

# -------Test-Essay--------
@router.get("/sample-essay")
async def get_sample_essay():
    try:
        df = pd.read_csv("data/test.csv")
        task2_essays = df[df["task_type"] == 2]

        if len(task2_essays) == 0:
            raise HTTPException(status_code=404, detail="No sample essays available")

        sample = task2_essays.sample(n=1).iloc[0]

        return {
            "question": sample["question"],
            "essay":    sample["essay"],
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Test dataset not found")
    

# -------Exam-Topic--------
@router.get("/exam-topic")
async def get_exam_topic():
    try:
        df = pd.read_csv("data/train.csv")
        task2_essays = df[df["task_type"] == 2]

        if len(task2_essays) == 0:
            raise HTTPException(status_code=404, detail="No sample essays available")

        sample = task2_essays.sample(n=1).iloc[0]

        return {
            "question": sample["question"],
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Test dataset not found")