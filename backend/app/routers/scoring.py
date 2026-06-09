import json
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