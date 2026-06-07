import pandas as pd
import re

# ── 1. Load ────────────────────────────────────────────────────────────────
df = pd.read_csv("raw/ielts_writing_dataset.csv")
print(f"Raw dataset: {df.shape[0]} rows, {df.shape[1]} columns")
print(f"Columns: {df.columns.tolist()}")

# ── 2. Inspect ─────────────────────────────────────────────────────────────
print("\nMissing values:")
print(df.isnull().sum())

print("\nTask type distribution:")
print(df["Task_Type"].value_counts())

print("\nOverall band distribution:")
print(df["Overall"].value_counts().sort_index())

# ── 3. Drop duplicates ─────────────────────────────────────────────────────
before = len(df)
df = df.drop_duplicates(subset=["Essay"])
print(f"\nDropped {before - len(df)} duplicate essays")

# ── 4. Drop rows with missing essential fields ─────────────────────────────
df = df.dropna(subset=["Essay", "Question", "Overall", "Task_Type"])
print(f"After dropping missing essentials: {len(df)} rows")

# ── 5. Clean text fields ───────────────────────────────────────────────────
def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.strip()
    # normalize whitespace
    text = re.sub(r"\s+", " ", text)
    # remove non-printable characters
    text = re.sub(r"[^\x20-\x7E\n]", "", text)
    return text

df["Essay"]    = df["Essay"].apply(clean_text)
df["Question"] = df["Question"].apply(clean_text)

# ── 6. Normalize band scores to .5 increments ─────────────────────────────
# Real IELTS scores are always x.0 or x.5
def normalize_band(score):
    return round(score * 2) / 2

df["Overall"] = df["Overall"].apply(normalize_band)

# ── 7. Clean examiner comments ─────────────────────────────────────────────
if "Examiner_Commen" in df.columns:
    df["Examiner_Comment"] = df["Examiner_Commen"].apply(
        lambda x: clean_text(x) if pd.notnull(x) else ""
    )
    df = df.drop(columns=["Examiner_Commen"])

# ── 8. Drop essays that are too short to be valid ─────────────────────────
df["essay_word_count"] = df["Essay"].apply(lambda x: len(x.split()))
before = len(df)
df = df[df["essay_word_count"] >= 50]
print(f"Dropped {before - len(df)} essays under 50 words")

# ── 9. Rename columns to snake_case ───────────────────────────────────────
df = df.rename(columns={
    "Task_Type": "task_type",
    "Question":  "question",
    "Essay":     "essay",
    "Overall":   "overall_band",
})

# ── 10. Select and reorder final columns ──────────────────────────────────
cols = ["task_type", "question", "essay", "overall_band",
        "essay_word_count", "Examiner_Comment"]
cols = [c for c in cols if c in df.columns]
df = df[cols]

# ── 11. Reset index ────────────────────────────────────────────────────────
df = df.reset_index(drop=True)
df.index.name = "id"

# ── 12. Save ───────────────────────────────────────────────────────────────
output_path = "cleaned_dataset.csv"
df.to_csv(output_path)
print(f"\n✅ Cleaned dataset saved to {output_path}")
print(f"Final shape: {df.shape}")
print(f"\nFinal column overview:")
print(df.dtypes)
print(f"\nSample row:")
print(df.iloc[0])