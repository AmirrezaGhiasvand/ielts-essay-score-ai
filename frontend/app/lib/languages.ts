import { LanguageOption } from "@/app/types";

// -------- Supported languages --------

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English",       dir: "ltr" },
  { code: "fa", label: "فارسی",         dir: "rtl" },
  { code: "ar", label: "العربية",       dir: "rtl" },
  { code: "zh", label: "中文",           dir: "ltr" },
  { code: "fr", label: "Français",      dir: "ltr" },
  { code: "de", label: "Deutsch",       dir: "ltr" },
  { code: "es", label: "Español",       dir: "ltr" },
  { code: "tr", label: "Türkçe",        dir: "ltr" },
];

// -------- UI translations --------
// only English and Persian for now — easy to extend

export const UI_TEXT = {
  en: {
    title:            "IELTS Essay Scorer",
    subtitle:         "AI-powered band score prediction",
    taskType:         "Task Type",
    task1:            "Task 1 — Report / Letter",
    task2:            "Task 2 — Essay",
    question:         "Question / Prompt",
    questionPlaceholder: "Paste the IELTS writing question here...",
    essay:            "Your Essay",
    essayPlaceholder: "Paste your essay here...",
    wordCount:        "words",
    minWords:         "Minimum",
    submit:           "Score My Essay",
    scoring:          "Scoring your essay...",
    overall:          "Overall Band",
    taskAchievement:  "Task Achievement",
    coherence:        "Coherence & Cohesion",
    lexical:          "Lexical Resource",
    grammar:          "Grammatical Range & Accuracy",
    feedback:         "Feedback",
    overallFeedback:  "Overall Feedback",
    latency:          "Scored in",
    chatPlaceholder:  "Ask a question about your score...",
    chatSend:         "Send",
    chatTitle:        "Ask the Examiner",
    newEssay:         "Score Another Essay",
    errorShort:       "Essay too short",
    errorGeneral:     "Something went wrong. Please try again.",
    language:         "Response Language",
  },
  fa: {
    title:            "نمره‌دهی مقاله آیلتس",
    subtitle:         "پیش‌بینی نمره باند با هوش مصنوعی",
    taskType:         "نوع تسک",
    task1:            "تسک ۱ — گزارش / نامه",
    task2:            "تسک ۲ — مقاله",
    question:         "سوال / موضوع",
    questionPlaceholder: "سوال رایتینگ آیلتس را اینجا وارد کنید...",
    essay:            "مقاله شما",
    essayPlaceholder: "مقاله خود را اینجا وارد کنید...",
    wordCount:        "کلمه",
    minWords:         "حداقل",
    submit:           "نمره‌دهی مقاله",
    scoring:          "در حال نمره‌دهی...",
    overall:          "نمره کلی",
    taskAchievement:  "پاسخ به تسک",
    coherence:        "انسجام و پیوستگی",
    lexical:          "منابع لغوی",
    grammar:          "دامنه و دقت گرامری",
    feedback:         "بازخورد",
    overallFeedback:  "بازخورد کلی",
    latency:          "نمره‌دهی در",
    chatPlaceholder:  "سوالی درباره نمره خود بپرسید...",
    chatSend:         "ارسال",
    chatTitle:        "از ممتحن بپرسید",
    newEssay:         "نمره‌دهی مقاله جدید",
    errorShort:       "مقاله خیلی کوتاه است",
    errorGeneral:     "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
    language:         "زبان پاسخ",
  },
} as const;

export type UILang = keyof typeof UI_TEXT;

export function getUIText(lang: string) {
  return UI_TEXT[lang as UILang] ?? UI_TEXT.en;
}