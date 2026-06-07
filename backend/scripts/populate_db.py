import os
import sys
import pandas as pd
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain.schema import Document

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))


# -------- Settings --------

CHROMA_DB_PATH       = os.getenv("CHROMA_DB_PATH", "./chroma_db")
CHROMA_COLLECTION    = os.getenv("CHROMA_COLLECTION_NAME", "ielts_essays")
EMBEDDING_MODEL      = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
CLEANED_DATASET_PATH = os.path.join(os.path.dirname(__file__), "../data/cleaned_dataset.csv")
TEST_SET_PATH        = os.path.join(os.path.dirname(__file__), "../data/test.csv")
TRAIN_SET_PATH       = os.path.join(os.path.dirname(__file__), "../data/train.csv")

# fixed seed for reproducibility — same split every time
RANDOM_SEED = 42
TEST_SIZE   = 50


# -------- Split dataset --------

def split_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    # stratify by task_type to keep Task 1/2 balanced in both sets
    test_frames  = []
    train_frames = []

    for task_type, group in df.groupby("task_type"):
        # number of test samples proportional to task type size
        n_test = round(TEST_SIZE * len(group) / len(df))
        test_sample = group.sample(n=n_test, random_state=RANDOM_SEED)
        train_sample = group.drop(test_sample.index)

        test_frames.append(test_sample)
        train_frames.append(train_sample)

        print(f"  Task {task_type}: {len(train_sample)} train, {len(test_sample)} test")

    test_df  = pd.concat(test_frames).reset_index(drop=True)
    train_df = pd.concat(train_frames).reset_index(drop=True)

    return train_df, test_df


# -------- Build documents --------

def build_documents(df: pd.DataFrame) -> list[Document]:
    documents = []

    for _, row in df.iterrows():
        has_comment = (
            isinstance(row["Examiner_Comment"], str)
            and len(row["Examiner_Comment"].strip()) > 0
        )

        doc = Document(
            page_content=row["essay"],
            metadata={
                "task_type":        int(row["task_type"]),
                "overall_band":     float(row["overall_band"]),
                "question":         row["question"],
                "examiner_comment": row["Examiner_Comment"].strip() if has_comment else "",
                # flag so retrieval can distinguish quality tiers
                "has_comment":      has_comment,
            }
        )
        documents.append(doc)

    return documents


# -------- Populate --------

def populate():
    print("Loading cleaned dataset...")
    df = pd.read_csv(CLEANED_DATASET_PATH)
    print(f"Loaded {len(df)} essays")

    # ---- Split ----
    print(f"\nSplitting dataset (test size: {TEST_SIZE}, seed: {RANDOM_SEED})...")
    train_df, test_df = split_dataset(df)
    print(f"Train: {len(train_df)} essays")
    print(f"Test:  {len(test_df)} essays")

    # save splits to disk for evaluate.py to use later
    train_df.to_csv(TRAIN_SET_PATH, index=False)
    test_df.to_csv(TEST_SET_PATH, index=False)
    print(f"\n✅ Saved train.csv ({len(train_df)} rows)")
    print(f"✅ Saved test.csv  ({len(test_df)} rows)")

    # ---- Build documents from train only ----
    print("\nBuilding documents...")
    documents = build_documents(train_df)

    with_comments    = sum(1 for d in documents if d.metadata["has_comment"])
    without_comments = len(documents) - with_comments
    print(f"  {with_comments} essays with examiner comments (high quality)")
    print(f"  {without_comments} essays with band score only")
    print(f"  {len(documents)} total documents")

    # ---- Connect to ChromaDB ----
    print(f"\nConnecting to ChromaDB at {CHROMA_DB_PATH}...")
    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_PATH,
    )

    # clear existing collection to avoid duplicates on re-run
    print("Clearing existing collection...")
    vector_store.delete_collection()
    vector_store = Chroma(
        collection_name=CHROMA_COLLECTION,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_PATH,
    )

    # ---- Index in batches ----
    print(f"Indexing {len(documents)} documents...")
    batch_size = 100
    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]
        vector_store.add_documents(batch)
        print(f"  Indexed {min(i + batch_size, len(documents))}/{len(documents)}")

    print(f"\n✅ Vector store populated with {len(documents)} documents")
    print(f"   {with_comments} high quality (with examiner comments)")
    print(f"   {without_comments} band score references")
    print(f"\n⚠️  test.csv is held out — do not index these essays")


# -------- Entry point --------

if __name__ == "__main__":
    populate()