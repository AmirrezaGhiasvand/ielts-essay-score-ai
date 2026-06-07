import os
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

load_dotenv()


# -------- Settings --------

CHROMA_DB_PATH    = os.getenv("CHROMA_DB_PATH", "./chroma_db")
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION_NAME", "ielts_essays")
EMBEDDING_MODEL   = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")


# -------- Embedding model --------

def get_embeddings():
    return OllamaEmbeddings(model=EMBEDDING_MODEL)


# -------- Vector store --------

def get_vector_store():
    return Chroma(
        collection_name=CHROMA_COLLECTION,
        embedding_function=get_embeddings(),
        persist_directory=CHROMA_DB_PATH,
    )


# -------- Retrieve similar essays --------

def retrieve_similar_essays(essay: str, task_type: int, n_results: int = 3) -> list[dict]:
    vector_store = get_vector_store()

    # filter by task type so Task 1 only matches Task 1, same for Task 2
    results = vector_store.similarity_search_with_relevance_scores(
        query=essay,
        k=n_results,
        filter={"task_type": task_type},
    )

    if not results:
        return []

    similar = []
    for doc, score in results:
        similar.append({
            "overall_band":     doc.metadata.get("overall_band"),
            "examiner_comment": doc.metadata.get("examiner_comment", ""),
            "similarity":       round(score, 3),
        })

    return similar