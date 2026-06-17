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
    import asyncio

    # ---- Always ensure Ollama is running (needed for embeddings even with cloud LLMs) ----
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    async def check_ollama() -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{ollama_url}/api/tags", timeout=2.0)
                if response.status_code == 200:
                    data = response.json()
                    return "models" in data
        except Exception:
            pass
        return False

    ollama_running = await check_ollama()

    if not ollama_running:
        print("Ollama not running — starting it...")
        env = os.environ.copy()
        ollama_models_path = os.getenv("OLLAMA_MODELS_PATH", "")
        if ollama_models_path:
            env["OLLAMA_MODELS"] = ollama_models_path
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=env,
        )

        # ---- Retry until Ollama is confirmed running (max 15s) ----
        for attempt in range(5):
            await asyncio.sleep(3)
            if await check_ollama():
                print(f"Ollama started successfully (attempt {attempt + 1}).")
                ollama_running = True
                break
        else:
            print("WARNING: Ollama did not start after 15s — embeddings may fail.")
    else:
        print("Ollama is already running.")

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