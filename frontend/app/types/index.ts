// -------- Request types --------

export interface ScoringRequest {
  task_type: 1 | 2;
  question:  string;
  essay:     string;
  language:  string;
  provider:  string;
  model:     string;
}

export interface ChatRequest {
  essay:          string;
  scoring_result: ScoringResponse;
  history:        ChatMessage[];
  message:        string;
  language:       string;
  provider:       string;
  model:          string;
}

// -------- Response types --------

export interface CriterionScore {
  score: number;
  feedback: string;
}

export interface SimilarEssay {
  overall_band: number;
  examiner_comment: string;
}

export interface ScoringResponse {
  task_achievement: CriterionScore;
  coherence_cohesion: CriterionScore;
  lexical_resource: CriterionScore;
  grammatical_range_accuracy: CriterionScore;
  overall_band: number;
  overall_feedback: string;
  latency_ms: number;
  similar_essays: SimilarEssay[] | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
}

// -------- UI types --------

export type Language = "en" | "fa" | "ar" | "zh" | "fr" | "de" | "es" | "tr";

export interface LanguageOption {
  code: Language;
  label: string;
  dir: "ltr" | "rtl";
}