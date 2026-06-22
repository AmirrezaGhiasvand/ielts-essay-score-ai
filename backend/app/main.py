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

    if os.getenv("ENVIRONMENT") != "production":
        print("Checking vector store...")

        from app.services.chain import get_vector_store
        from scripts.populate_db import populate

        vector_store = get_vector_store()
        count = vector_store._collection.count()

        if count == 0:
            print("Vector store is empty — populating now...")
            populate()
            print("Vector store ready.")
        else:
            print(f"Vector store ready — {count} documents loaded.")
    else:
        print("Production environment — vector store will load on first request.")

    yield

    print("Shutting down...")


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
    allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------- Routers --------

app.include_router(router)


# -------- Entry point --------

if __name__ == "__main__":
    import uvicorn
    APP_PORT = int(os.getenv("PORT", 8000))
    APP_ENV  = os.getenv("ENVIRONMENT", "development")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=APP_PORT,
        reload=APP_ENV == "development",
    )