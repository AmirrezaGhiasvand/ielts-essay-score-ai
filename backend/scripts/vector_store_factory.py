"""
vector_store_factory.py
-----------------------
Central factory for creating the correct vector store backend.

Usage:
    from vector_store_factory import get_vector_store, get_embeddings

    embeddings    = get_embeddings()
    vector_store  = get_vector_store(embeddings)

The backend is chosen by VECTOR_STORE_PROVIDER in your .env:
    VECTOR_STORE_PROVIDER=chroma    → ChromaDB  (default / local)
    VECTOR_STORE_PROVIDER=pinecone  → Pinecone  (deployed)
"""

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ------------------------------------------------------------------ #
#  Shared settings (read once at import time)                         #
# ------------------------------------------------------------------ #

VECTOR_STORE_PROVIDER = os.getenv("VECTOR_STORE_PROVIDER", "chroma").lower()

# Embedding settings (shared by both backends)
EMBEDDING_PROVIDER        = os.getenv("EMBEDDING_PROVIDER", "huggingface")
EMBEDDING_MODEL           = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
OLLAMA_EMBEDDING_MODEL    = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
OLLAMA_BASE_URL           = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# ChromaDB settings
CHROMA_DB_PATH         = os.getenv("CHROMA_DB_PATH", "./chroma_db")
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "ielts_essays")

# Pinecone settings
PINECONE_API_KEY        = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX_NAME     = os.getenv("PINECONE_INDEX_NAME", "ielts-essays")
PINECONE_NAMESPACE      = os.getenv("PINECONE_NAMESPACE", "")
PINECONE_CLOUD          = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_REGION         = os.getenv("PINECONE_REGION", "us-east-1")
# Embedding dimension must match your model:
#   all-MiniLM-L6-v2  → 384
#   nomic-embed-text   → 768
PINECONE_EMBEDDING_DIM  = int(os.getenv("PINECONE_EMBEDDING_DIM", "384"))


# ------------------------------------------------------------------ #
#  Embeddings                                                         #
# ------------------------------------------------------------------ #

def get_embeddings():
    if EMBEDDING_PROVIDER == "ollama":
        from langchain_ollama import OllamaEmbeddings
        return OllamaEmbeddings(
            model=OLLAMA_EMBEDDING_MODEL,
            base_url=OLLAMA_BASE_URL,
        )

    # Default: FastEmbed — lightweight, no PyTorch, ~50MB vs ~500MB
    from langchain_community.embeddings import FastEmbedEmbeddings
    return FastEmbedEmbeddings(model_name=EMBEDDING_MODEL)


# ------------------------------------------------------------------ #
#  ChromaDB backend                                                   #
# ------------------------------------------------------------------ #

def _get_chroma(embeddings):
    from langchain_chroma import Chroma
    return Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_PATH,
    )


def _clear_chroma(embeddings):
    """Delete and recreate the ChromaDB collection (used during populate)."""
    from langchain_chroma import Chroma
    store = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_PATH,
    )
    store.delete_collection()
    return _get_chroma(embeddings)


# ------------------------------------------------------------------ #
#  Pinecone backend                                                   #
# ------------------------------------------------------------------ #

def _ensure_pinecone_index():
    """Create the Pinecone index if it doesn't exist yet."""
    from pinecone import Pinecone, ServerlessSpec

    if not PINECONE_API_KEY:
        raise ValueError(
            "PINECONE_API_KEY is not set. "
            "Add it to your .env file or set VECTOR_STORE_PROVIDER=chroma for local use."
        )

    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing = [idx.name for idx in pc.list_indexes()]

    if PINECONE_INDEX_NAME not in existing:
        print(f"  Creating Pinecone index '{PINECONE_INDEX_NAME}' "
              f"(dim={PINECONE_EMBEDDING_DIM}, metric=cosine)...")
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=PINECONE_EMBEDDING_DIM,
            metric="cosine",
            spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION),
        )
        # Wait until ready
        import time
        while not pc.describe_index(PINECONE_INDEX_NAME).status["ready"]:
            print("  Waiting for index to be ready...")
            time.sleep(2)
        print("  Pinecone index is ready.")
    else:
        print(f"  Pinecone index '{PINECONE_INDEX_NAME}' already exists.")

    return pc


def _get_pinecone(embeddings):
    from langchain_pinecone import PineconeVectorStore

    _ensure_pinecone_index()
    kwargs = dict(
        index_name=PINECONE_INDEX_NAME,
        embedding=embeddings,
    )
    if PINECONE_NAMESPACE:
        kwargs["namespace"] = PINECONE_NAMESPACE

    return PineconeVectorStore(**kwargs)


def _clear_pinecone(embeddings):
    """Delete all vectors in the Pinecone namespace (used during populate)."""
    from pinecone import Pinecone

    pc = _ensure_pinecone_index()
    index = pc.Index(PINECONE_INDEX_NAME)

    namespace = PINECONE_NAMESPACE or ""

    # Check if namespace has any vectors before deleting
    # (delete_all on an empty/non-existent namespace throws 404)
    try:
        stats = index.describe_index_stats()
        namespaces = stats.get("namespaces", {})

        if namespace in namespaces and namespaces[namespace].get("vector_count", 0) > 0:
            print(f"  Deleting {namespaces[namespace]['vector_count']} existing vectors...")
            index.delete(delete_all=True, namespace=namespace) if namespace else index.delete(delete_all=True)
        else:
            print("  Index is empty — skipping delete step.")
    except Exception as e:
        print(f"  Could not check index stats ({e}) — skipping delete step.")

    return _get_pinecone(embeddings)

# ------------------------------------------------------------------ #
#  Public API                                                         #
# ------------------------------------------------------------------ #

def get_vector_store(embeddings=None):
    """
    Return a LangChain-compatible vector store for the configured backend.

    Args:
        embeddings: Optional pre-built embedding object.
                    If None, get_embeddings() is called automatically.

    Returns:
        A vector store instance (Chroma or PineconeVectorStore).
    """
    if embeddings is None:
        embeddings = get_embeddings()

    if VECTOR_STORE_PROVIDER == "pinecone":
        print(f"[VectorStore] Using Pinecone (index: {PINECONE_INDEX_NAME})")
        return _get_pinecone(embeddings)

    # Default → ChromaDB
    print(f"[VectorStore] Using ChromaDB (path: {CHROMA_DB_PATH})")
    return _get_chroma(embeddings)


def get_fresh_vector_store(embeddings=None):
    """
    Same as get_vector_store(), but clears all existing data first.
    Use this in populate.py to avoid duplicates on re-runs.

    Args:
        embeddings: Optional pre-built embedding object.

    Returns:
        A freshly cleared vector store instance.
    """
    if embeddings is None:
        embeddings = get_embeddings()

    if VECTOR_STORE_PROVIDER == "pinecone":
        print(f"[VectorStore] Clearing Pinecone index '{PINECONE_INDEX_NAME}'...")
        return _clear_pinecone(embeddings)

    print(f"[VectorStore] Clearing ChromaDB collection '{CHROMA_COLLECTION_NAME}'...")
    return _clear_chroma(embeddings)