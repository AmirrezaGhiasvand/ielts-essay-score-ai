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

    # use MMR for diverse results
    # fetch_k=20 means fetch 20 candidates then pick 3 most diverse
    docs = vector_store.max_marginal_relevance_search(
        query=essay,
        k=n_results,
        fetch_k=20,
        filter={"task_type": task_type},
    )

    if not docs:
        return []

    # calculate cosine similarity manually using embeddings
    embeddings    = get_embeddings()
    query_vector  = embeddings.embed_query(essay)
    doc_vectors   = embeddings.embed_documents([doc.page_content for doc in docs])

    def cosine_similarity(a, b):
        dot     = sum(x * y for x, y in zip(a, b))
        norm_a  = sum(x ** 2 for x in a) ** 0.5
        norm_b  = sum(x ** 2 for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    similar = []
    for doc, doc_vec in zip(docs, doc_vectors):
        score = cosine_similarity(query_vector, doc_vec)
        # only return essays that are actually similar
        if score >= 0.4:
            similar.append({
                "overall_band":     doc.metadata.get("overall_band"),
                "examiner_comment": doc.metadata.get("examiner_comment", ""),
                "similarity":       round(score, 3),
            })

    return similar