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

    # MMR for diverse results — fetch 20 candidates, return 3 most diverse
    # scores are calculated internally without re-embedding
    docs_and_scores = vector_store.similarity_search_with_relevance_scores(
        query=essay,
        k=20,
        filter={"task_type": task_type},
    )

    if not docs_and_scores:
        return []

    # filter by similarity threshold first
    filtered = [
        (doc, score)
        for doc, score in docs_and_scores
        if score >= 0.4
    ]

    if not filtered:
        return []

    # apply MMR manually on filtered results for diversity
    selected = _mmr_select(filtered, k=n_results)

    similar = []
    for doc, score in selected:
        similar.append({
            "overall_band":     doc.metadata.get("overall_band"),
            "examiner_comment": doc.metadata.get("examiner_comment", ""),
            "has_comment":      doc.metadata.get("has_comment", False),
            "similarity":       round(score, 3),
        })

    return similar


# -------- MMR selection --------

def _mmr_select(docs_and_scores: list[tuple], k: int) -> list[tuple]:
    # selects k diverse results from a ranked list
    # avoids returning near-duplicate essays
    if len(docs_and_scores) <= k:
        return docs_and_scores

    selected   = [docs_and_scores[0]]
    candidates = docs_and_scores[1:]

    while len(selected) < k and candidates:
        # pick candidate with highest score that is not too similar to already selected
        best      = None
        best_score = -1

        for doc, score in candidates:
            # check band diversity — avoid selecting same band twice
            selected_bands = [s[0].metadata.get("overall_band") for s in selected]
            band           = doc.metadata.get("overall_band")

            # penalize if same band already selected
            diversity_bonus = 0.1 if band not in selected_bands else 0.0
            adjusted_score  = score + diversity_bonus

            if adjusted_score > best_score:
                best       = (doc, score)
                best_score = adjusted_score

        if best:
            selected.append(best)
            candidates.remove(best)

    return selected