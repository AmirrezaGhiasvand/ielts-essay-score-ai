# IELTS Essay Scorer

An AI-powered IELTS Writing Task 2 essay scorer that combines retrieval-augmented generation (RAG) with large language models to provide IELTS band scores, detailed per-criterion feedback, inline error highlighting, and an interactive chat for follow-up questions — all in a clean, multilingual, dark-mode interface.

🔗 **Repo:** [github.com/AmirrezaGhiasvand/ielts-essay-score-ai](https://github.com/AmirrezaGhiasvand/ielts-essay-score-ai)

---

## 🎥 Demo

> _Video walkthrough coming soon — placeholder for a screen recording demoing the full flow: submitting an essay, viewing band scores, exploring error highlights, and chatting with the AI examiner._

[![Demo Video Placeholder](https://via.placeholder.com/800x450.png?text=Demo+Video+Coming+Soon)](#)

---

## The Journey

This project started as a simple idea — _can an LLM score an IELTS essay as reliably as a human examiner?_ — and turned into a multi-week deep dive into prompt engineering, retrieval-augmented generation, and frontend design.

**Where it began:** a FastAPI backend wired to a local Ollama model (Mistral 7b), a barebones scoring prompt with the four official IELTS band descriptors, and a single ChromaDB collection holding ~1,200 essays scraped and cleaned from a public IELTS writing dataset.

**The core challenge:** getting consistent, accurate band scores out of an LLM. Early tests showed a clear pattern — local models like Mistral tended to over-score essays by nearly a full band, while early cloud attempts under-scored. This sent the project down a calibration rabbit hole:

- **Hybrid retrieval.** Plain semantic search wasn't pulling the most relevant reference essays. We built a hybrid retriever combining essay-similarity, question-similarity, and BM25 keyword matching — weighted and re-ranked for band diversity so the model sees a spread of reference scores, not three near-identical essays.
- **Few-shot calibration.** We hand-picked real, human-scored essays spanning Band 6.0 through 8.5 and embedded them directly into the scoring prompt as concrete anchors, alongside explicit calibration notes distinguishing what separates a Band 6 from a Band 7, and a Band 7 from a Band 8.
- **The real breakthrough: provider quality.** After testing prompt tweak after prompt tweak, the data made it clear that no amount of prompt engineering could fully fix a model that simply wasn't strong enough at the task. Switching the default provider to **GPT-4o Mini via OpenRouter** combined with the hybrid RAG pipeline produced by far the most reliable, consistent results — proving that for nuanced evaluation tasks like this, model quality matters more than micro-prompt-tuning.

**Then came the UI.** What started as a functional form-and-results page evolved into a fully custom dark-mode interface with a signature animated band gauge, RTL support for Persian users (with proper font handling), markdown-rendered feedback, and an inline error-highlighting system inspired by professional essay-checking tools — flagging grammar, spelling, and repetition issues directly inside the submitted essay with hover tooltips and exact-match verification to eliminate hallucinated corrections.

**Along the way:** a streaming chat interface so users can ask the AI examiner follow-up questions and watch the response appear token-by-token, a model selector to switch between local (Ollama) and cloud (OpenRouter) providers on the fly, and a "Try a Sample Essay" button pulling real essays from the held-out dataset for instant demos.

---

## Features

- **AI-powered band scoring** across all four official IELTS criteria (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy), with official IELTS-style 0.25/0.75 rounding applied server-side
- **Hybrid RAG retrieval** — semantic essay similarity + semantic question similarity + BM25 keyword matching, re-ranked for band diversity
- **Few-shot calibration** using real, human-scored reference essays spanning Band 6.0–8.5
- **Inline error highlighting** — grammar, spelling, and repetition issues flagged directly in the essay text with color-coded underlines and hover tooltips showing the correction and explanation; all matches verified against the original essay to prevent hallucinated errors
- **Streaming chat** — ask follow-up questions about your score and watch the AI examiner's response stream in token-by-token
- **Model selector** — switch between local Ollama models and cloud providers (OpenRouter) per request, including GPT-4o Mini and Gemma 4
- **Multilingual UI & feedback** — English, Persian (with proper RTL layout and font handling), with feedback text generated in the selected language
- **Sample essay generator** — instantly populate the form with a real essay from the held-out test set for quick demos
- **Dark-mode, fully responsive interface** built with Next.js and Tailwind, featuring an animated SVG band-score gauge as the signature visual element

---

## Tech Stack

**Backend**

- FastAPI
- LangChain
- ChromaDB (vector store)
- Hugging Face sentence-transformers for embeddings
- rank-bm25 for keyword-based hybrid retrieval
- Pydantic

**LLM Providers**

- OpenRouter (GPT-4o Mini, Gemma 4)
- Ollama (local — Mistral, Gemma)

**Frontend**

- Next.js 16 + TypeScript
- Tailwind CSS v4
- React
- react-markdown for rendering formatted feedback
- react-hook-form + zod for form validation

---

## Evaluation Results

Evaluated on a held-out test set of real, human-scored IELTS Task 2 essays.

| Configuration | Model              | MAE (bands) | Within 0.5 Band | Exact Match |
| ------------- | ------------------ | ----------- | --------------- | ----------- |
| Baseline      | Mistral 7b (local) | 0.600       | 60%             | 20%         |
| + Hybrid RAG  | GPT-4o Mini        | **0.400**   | **80%**         | **40%**     |

**Best overall configuration:** GPT-4o Mini + Hybrid RAG, giving the most consistent results across a larger sample.

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env    # fill in your API keys (openrouter)
python -m app.main
```

The backend automatically starts Ollama (if configured) and populates the vector database on first run.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` (or your configured port).

---

## What's New

Recent additions to the project:

- **Exam Topic** — get an exam topic to write essays about. uses our train.csv to retrieve
- **New Interface** — New clean, minimalistic UI.

---

## License

MIT
