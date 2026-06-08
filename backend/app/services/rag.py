import os
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

load_dotenv()


# -------- Settings --------

CHROMA_DB_PATH    = os.getenv("CHROMA_DB_PATH", "./chroma_db")
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION_NAME", "ielts_essays")
EMBEDDING_MODEL   = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")


# -------- Singletons — initialized once, reused on every request --------

_embeddings   = None
_vector_store = None


def get_embeddings() -> OllamaEmbeddings:
    global _embeddings
    if _embeddings is None:
        print("Initializing embedding model...")
        _embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    return _embeddings


def get_vector_store() -> Chroma:
    global _vector_store
    if _vector_store is None:
        print("Connecting to ChromaDB...")
        _vector_store = Chroma(
            collection_name=CHROMA_COLLECTION,
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_DB_PATH,
        )
    return _vector_store


# -------- Retrieve similar essays --------

def retrieve_similar_essays(essay: str, task_type: int, n_results: int = 3) -> list[dict]:
    vector_store = get_vector_store()

    # use direct similarity search — avoids broken relevance score conversion
    # fetch n_results + 2 for MMR diversity selection
    docs = vector_store.similarity_search(
        query=essay,
        k=n_results + 2,
        filter={"task_type": task_type},
    )

    if not docs:
        return []

    # apply band diversity selection
    selected = _mmr_select_by_band(docs, k=n_results)

    # calculate similarity scores using embeddings once
    embeddings   = get_embeddings()
    query_vector = embeddings.embed_query(essay)
    doc_vectors  = embeddings.embed_documents([d.page_content for d in selected])

    similar = []
    for doc, doc_vec in zip(selected, doc_vectors):
        score = _cosine_similarity(query_vector, doc_vec)
        similar.append({
            "overall_band":     doc.metadata.get("overall_band"),
            "examiner_comment": doc.metadata.get("examiner_comment", ""),
            "has_comment":      doc.metadata.get("has_comment", False),
            "similarity":       round(score, 3),
        })

    return similar


# -------- Cosine similarity --------

def _cosine_similarity(a: list, b: list) -> float:
    dot    = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x ** 2 for x in a) ** 0.5
    norm_b = sum(x ** 2 for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# -------- Band diversity selection --------

def _mmr_select_by_band(docs: list, k: int) -> list:
    if len(docs) <= k:
        return docs

    selected      = [docs[0]]
    remaining     = docs[1:]
    selected_bands = {docs[0].metadata.get("overall_band")}

    while len(selected) < k and remaining:
        # prefer docs with bands not already selected
        diverse = [d for d in remaining if d.metadata.get("overall_band") not in selected_bands]
        pick    = diverse[0] if diverse else remaining[0]
        selected.append(pick)
        selected_bands.add(pick.metadata.get("overall_band"))
        remaining.remove(pick)

    return selected
