import os
import sys
import pandas as pd
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain.schema import Document

# allow imports from backend/
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))


# -------- Settings --------

CHROMA_DB_PATH       = os.getenv("CHROMA_DB_PATH", "./chroma_db")
CHROMA_COLLECTION    = os.getenv("CHROMA_COLLECTION_NAME", "ielts_essays")
EMBEDDING_MODEL      = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
CLEANED_DATASET_PATH = os.path.join(os.path.dirname(__file__), "../data/cleaned_dataset.csv")


# -------- Build documents --------

def build_documents(df: pd.DataFrame) -> list[Document]:
    documents = []

    for _, row in df.iterrows():
        # only index essays that have examiner comments — highest quality signal for RAG
        has_comment = isinstance(row["Examiner_Comment"], str) and len(row["Examiner_Comment"].strip()) > 0
        if not has_comment:
            continue

        doc = Document(
            page_content=row["essay"],
            metadata={
                "task_type":        int(row["task_type"]),
                "overall_band":     float(row["overall_band"]),
                "question":         row["question"],
                "examiner_comment": row["Examiner_Comment"],
            }
        )
        documents.append(doc)

    return documents


# -------- Populate --------

def populate():
    print("Loading cleaned dataset...")
    df = pd.read_csv(CLEANED_DATASET_PATH)
    print(f"Loaded {len(df)} essays")

    print("Building documents...")
    documents = build_documents(df)
    print(f"Found {len(documents)} essays with examiner comments")

    print(f"Connecting to ChromaDB at {CHROMA_DB_PATH}...")
    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_PATH,
    )

    # clear existing collection before repopulating
    # avoids duplicates if script is run more than once
    print("Clearing existing collection...")
    vector_store.delete_collection()
    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_PATH,
    )

    print(f"Indexing {len(documents)} documents...")
    vector_store.add_documents(documents)
    print(f"✅ Vector store populated with {len(documents)} documents")


# -------- Entry point --------

if __name__ == "__main__":
    populate()