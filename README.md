# IELTS Essay Scorer — AI-Powered Writing Evaluator

An AI-powered IELTS writing scorer that evaluates essays across all four official criteria using a local LLM and RAG-based examiner feedback. Supports English and Persian responses.

---

## Motivation

Existing IELTS scoring tools are either expensive, inaccurate, or provide no meaningful feedback. This project builds a fully local, explainable scorer grounded in real examiner comments — no API costs, no data privacy concerns, and feedback that references actual IELTS band descriptors.

---

## Approach

| Component | Choice | Reason |
| --- | --- | --- |
| LLM | Mistral 7b / Gemma 4 (Ollama) | Free, local, no API costs |
| Embeddings | nomic-embed-text (Ollama) | Long-text aware, runs locally |
| Vector DB | ChromaDB | Lightweight, no server needed |
| RAG Framework | LangChain | Industry standard, modular |
| Backend | FastAPI | Fast, automatic docs, Pydantic validation |
| Frontend | Next.js + Tailwind | Portfolio-grade UI, easy deployment |
| Dataset | IELTS Writing Dataset (HuggingFace) | 1,274 human-scored essays |

---

## Project Structure

```
ielts-essay-score-ai/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── routers/
│   │   │   └── scoring.py        # API endpoints
│   │   ├── services/
│   │   │   ├── scorer.py         # LLM scoring logic
│   │   │   └── rag.py            # ChromaDB retrieval
│   │   └── models/
│   │       └── schemas.py        # Pydantic request/response models
│   ├── data/
│   │   ├── cleaned_dataset.csv   # 1,274 cleaned essays
│   │   ├── train.csv             # 1,224 essays indexed in ChromaDB
│   │   ├── test.csv              # 50 held-out essays for evaluation
│   │   └── clean_dataset.py      # Data cleaning script
│   ├── scripts/
│   │   ├── populate_db.py        # One-time ChromaDB setup
│   │   └── evaluate.py           # RAG vs No-RAG evaluation (coming soon)
│   ├── requirements.txt
│   └── .env.example
└── frontend/                     # Next.js app (coming soon)
```

---

## Hardware Requirements

| Component | Minimum | Recommended |
| --- | --- | --- |
| RAM | 8GB | 16GB |
| Storage | 10GB free | 15GB free |
| Python | 3.11 | 3.11 |
| Ollama | Latest | Latest |

> GPU is not required — Ollama runs on CPU. GPU significantly speeds up inference.

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/AmirrezaGhiasvand/ielts-essay-score-ai.git
cd ielts-essay-score-ai
```

### 2. Install Ollama and pull models

```bash
# Install Ollama from https://ollama.com
ollama pull mistral:7b
ollama pull nomic-embed-text
```

### 3. Create virtual environment with Python 3.11

```bash
py -3.11 -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate # Mac/Linux
```

### 4. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 5. Configure environment

```bash
copy .env.example .env   # Windows
cp .env.example .env     # Mac/Linux
# Edit .env and set your model preferences
```

### 6. Populate the vector database

```bash
python scripts/populate_db.py
```

### 7. Start the backend

```bash
python -m app.main
```

API runs at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

---

## Usage

### Score an essay

```bash
curl -X POST http://localhost:8000/api/score \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": 2,
    "question": "Your IELTS question here",
    "essay": "Your essay here",
    "language": "en"
  }'
```

### Supported languages

| Code | Language |
| --- | --- |
| `en` | English |
| `fa` | Persian / Farsi |
| `ar` | Arabic |
| `zh` | Chinese |
| `fr` | French |
| `de` | German |
| `es` | Spanish |
| `tr` | Turkish |

---

## How It Works

```
User submits essay + question
        ↓
Word count validation (Task 1: 150w, Task 2: 250w)
        ↓
RAG retrieves 3 similar essays from ChromaDB
(1,224 essays indexed with MMR search)
        ↓
Gemma / Mistral scores all 4 IELTS criteria
using official band descriptors + RAG context
        ↓
Official IELTS rounding applied to overall band
        ↓
Scores + feedback returned to user
```

### IELTS Criteria Scored

| Criterion | Weight |
| --- | --- |
| Task Achievement / Response | 25% |
| Coherence & Cohesion | 25% |
| Lexical Resource | 25% |
| Grammatical Range & Accuracy | 25% |

---

## Dataset

| Property | Value |
| --- | --- |
| Source | HuggingFace — IELTS Writing Dataset |
| Raw essays | 1,435 |
| After cleaning | 1,274 |
| Train split | 1,224 (indexed in ChromaDB) |
| Test split | 50 (held out for evaluation) |
| With examiner comments | 59 |
| Task 1 essays | ~45% |
| Task 2 essays | ~55% |

---

## Roadmap

| Feature | Status |
| --- | --- |
| Backend API (scoring + chat) | ✅ Done |
| RAG pipeline with ChromaDB | ✅ Done |
| Official IELTS band rounding | ✅ Done |
| Multilingual feedback (8 languages) | ✅ Done |
| Evaluation script (RAG vs No-RAG) | 🔄 In Progress |
| Latency timer in response | ⬜ Planned |
| Groq API integration (cloud option) | ⬜ Planned |
| Model selector UI (Ollama models) | ⬜ Planned |
| Next.js frontend | ⬜ Planned |
| Score history | ⬜ Planned |

---

## Dependencies

| Package | Purpose |
| --- | --- |
| fastapi | API framework |
| langchain | RAG orchestration |
| langchain-ollama | Ollama LLM + embeddings integration |
| langchain-chroma | ChromaDB vector store integration |
| chromadb | Local vector database |
| sentence-transformers | Embedding utilities |
| ollama | Local LLM runner |
| pandas | Dataset processing |
| pydantic | Request/response validation |
| uvicorn | ASGI server |

---

## References

- [IELTS Official Band Descriptors](https://www.ielts.org/about-ielts/ielts-scoring-in-detail)
- [LangChain Documentation](https://python.langchain.com)
- [ChromaDB Documentation](https://docs.trychroma.com)
- [Ollama](https://ollama.com)
- [IELTS Writing Dataset — HuggingFace](https://huggingface.co)