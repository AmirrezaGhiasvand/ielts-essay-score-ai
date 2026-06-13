import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers.scoring import router

load_dotenv()


# -------- Settings --------

APP_ENV  = os.getenv("APP_ENV", "development")
APP_PORT = int(os.getenv("APP_PORT", 8000))


# -------- Startup --------

@asynccontextmanager
async def lifespan(app: FastAPI):
    import subprocess
    import httpx

    provider = os.getenv("PROVIDER", "ollama")

    # ---- Start Ollama if provider is local ----
    if provider == "ollama":
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        try:
            async with httpx.AsyncClient() as client:
                await client.get(f"{ollama_url}/api/tags", timeout=2.0)
            print("Ollama is already running.")
        except Exception:
            print("Ollama not running — starting it...")
            env = os.environ.copy()
            # set custom model path if configured
            ollama_models_path = os.getenv("OLLAMA_MODELS_PATH", "")
            if ollama_models_path:
                env["OLLAMA_MODELS"] = ollama_models_path
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=env,
            )
            # wait for it to start
            import asyncio
            await asyncio.sleep(3)
            print("Ollama started.")

    # ---- Check vector store ----
    from app.services.chain import get_vector_store
    from scripts.populate_db import populate

    print("Checking vector store...")
    vector_store = get_vector_store()
    count        = vector_store._collection.count()

    if count == 0:
        print("Vector store is empty — populating now...")
        populate()
        print("Vector store ready.")
    else:
        print(f"Vector store ready — {count} documents loaded.")

    yield


# -------- App --------

app = FastAPI(
    title="IELTS Essay Scorer",
    description="AI-powered IELTS writing scorer using LangChain and RAG",
    version="0.2.0",
    lifespan=lifespan,
)


# -------- CORS --------

# allow Next.js frontend to talk to the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------- Routers --------

app.include_router(router)


# -------- Entry point --------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=APP_PORT,
        reload=APP_ENV == "development",
        # reload=True only in development — watches for file changes
    )