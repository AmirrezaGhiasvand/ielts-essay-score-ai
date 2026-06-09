# IELTS Essay Scorer — AI-Powered Writing Evaluator

An AI-powered IELTS writing scorer that evaluates essays across all four official criteria using a local or cloud LLM and RAG-based examiner feedback. Supports English and Persian responses.

---

## Motivation

Existing IELTS scoring tools are either expensive, inaccurate, or provide no meaningful feedback. This project builds a fully local, explainable scorer grounded in real examiner comments — no mandatory API costs, no data privacy concerns, and feedback that references actual IELTS band descriptors.

---

## Approach

| Component | Choice | Reason |
| --- | --- | --- |
| LLM (Local) | Mistral 7b / Gemma 4 (Ollama) | Free, local, no API costs |
| LLM (Cloud) | GPT-4o-mini / Llama 3.3 70b (OpenRouter) | Fast inference, free tier available |
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
│   │   ├── main.py               # FastAPI app entry point + auto DB setup
│   │   ├── routers/
│   │   │   └── scoring.py        # API endpoints
│   │   ├── services/
│   │   │   └── chain.py          # Unified LangChain chain (RAG + LLM + scoring)
│   │   └── models/
│   │       └── schemas.py        # Pydantic request/response models
│   ├── data/
│   │   ├── cleaned_dataset.csv   # 1,274 cleaned essays
│   │   ├── train.csv             # 1,224 essays indexed in ChromaDB
│   │   ├── test.csv              # 50 held-out essays for evaluation
│   │   ├── eval_results.json     # Latest evaluation results
│   │   └── clean_dataset.py      # Data cleaning script
│   ├── scripts/
│   │   ├── populate_db.py        # One-time ChromaDB setup (auto-runs on startup)
│   │   └── evaluate.py           # RAG evaluation script
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

### 6. Start the backend

```bash
python -m app.main
```

> The vector database is populated automatically on first startup — no manual setup needed.

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

### Provider options

Set `PROVIDER` in `.env` to switch between local and cloud:

| Provider | Model | Speed | Cost |
| --- | --- | --- | --- |
| `ollama` | mistral:7b | ~90s | Free |
| `openrouter` | gpt-4o-mini | ~6s | Free tier |
| `openrouter` | llama-3.3-70b | ~5s | Free tier |
| `groq` | llama-3.3-70b | ~3s | Free tier |

---

## How It Works

```
User submits essay + question
        ↓
Word count validation (Task 1: 150w, Task 2: 250w)
        ↓
RAG retrieves 3 similar essays from ChromaDB using MMR
(1,224 essays indexed, filtered by task type)
        ↓
LLM scores all 4 IELTS criteria using
official band descriptors + RAG context
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

### Official IELTS Rounding Rules

| Raw Average | Band |
| --- | --- |
| x.00 | x.0 |
| x.01 – x.24 | x.0 (round down) |
| x.25 – x.74 | x.5 |
| x.75 – x.99 | (x+1).0 (round up) |

---

## Evaluation Results

Evaluated on 5 held-out essays from `test.csv` with known human band scores.

### Mistral 7b (Local — Ollama)

| Metric | Score |
| --- | --- |
| MAE | 0.600 bands |
| Exact match rate | 20.0% |
| Within 0.5 band rate | 60.0% |
| Average latency | 107.1s |

| Essay | Task | Human | Predicted | Diff |
| --- | --- | --- | --- | --- |
| 1 | T1 | 7.0 | 7.5 | +0.5 ✅ |
| 2 | T2 | 7.0 | 7.0 | 0.0 ✅ |
| 3 | T2 | 6.5 | 7.5 | +1.0 ❌ |
| 4 | T2 | 6.0 | 7.0 | +1.0 ❌ |
| 5 | T1 | 6.5 | 7.0 | +0.5 ✅ |

**Observation:** Mistral tends to over-score essays in the Band 6–6.5 range, inflating by 0.5–1.0 bands. Higher band essays (7.0+) are scored more accurately.

---

### GPT-4o-mini (Cloud — OpenRouter)

| Metric | Score |
| --- | --- |
| MAE | 0.500 bands |
| Exact match rate | 20.0% |
| Within 0.5 band rate | 80.0% |
| Average latency | 6.2s |

| Essay | Task | Human | Predicted | Diff |
| --- | --- | --- | --- | --- |
| 1 | T1 | 7.0 | 6.5 | -0.5 ✅ |
| 2 | T2 | 7.0 | 6.0 | -1.0 ❌ |
| 3 | T2 | 6.5 | 6.0 | -0.5 ✅ |
| 4 | T2 | 6.0 | 6.0 | 0.0 ✅ |
| 5 | T1 | 6.5 | 6.0 | -0.5 ✅ |

**Observation:** GPT-4o-mini slightly under-scores essays, opposite bias to Mistral. Better within-0.5-band rate (80% vs 60%) and 17x faster inference. Lower band essays are more accurately scored.

---

### Model Comparison

| Metric | Mistral 7b | GPT-4o-mini |
| --- | --- | --- |
| MAE | 0.600 | **0.500** |
| Within 0.5 band | 60.0% | **80.0%** |
| Exact match | 20.0% | 20.0% |
| Avg latency | 107.1s | **6.2s** |
| Cost | Free (local) | Free tier |
| Bias | Over-scores | Under-scores |

> GPT-4o-mini outperforms Mistral 7b on all accuracy metrics and is 17x faster. Both models show systematic bias — Mistral inflates scores, GPT-4o-mini deflates them slightly. A larger evaluation set (50 essays) is needed for statistically significant conclusions.

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
| Multi-provider support (Ollama/Groq/OpenRouter) | ✅ Done |
| Auto vector store population on startup | ✅ Done |
| Evaluation script (5 essays) | ✅ Done |
| Full evaluation (50 essays) | 🔄 In Progress |
| Score inflation fix (prompt calibration) | 🔄 In Progress |
| Latency timer in response | ✅ Done |
| Groq API integration | ✅ Done |
| OpenRouter API integration | ✅ Done |
| API key rotation for rate limiting | ⬜ Planned |
| Model selector UI (Ollama models) | ⬜ Planned |
| Next.js frontend | ⬜ Planned |
| Score history | ⬜ Planned |
| Streaming chat responses | ⬜ Planned |

---

## Dependencies

| Package | Purpose |
| --- | --- |
| fastapi | API framework |
| langchain | RAG orchestration |
| langchain-ollama | Ollama LLM + embeddings |
| langchain-openai | OpenRouter integration |
| langchain-groq | Groq integration |
| langchain-chroma | ChromaDB vector store |
| chromadb | Local vector database |
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