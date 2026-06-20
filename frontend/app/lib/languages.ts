import { LanguageOption } from "@/app/types";

// -------- Supported languages --------

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "fa", label: "فارسی", dir: "rtl" },
];

// -------- UI translations --------
// only English and Persian for now — easy to extend

export const UI_TEXT = {
  en: {
    title: "IELTS Essay Scorer",
    subtitle: "AI-powered band score prediction",
    taskType: "Task Type",
    task1: "Task 1 — Report / Letter",
    task2: "Task 2 — Essay",
    question: "Question / Prompt",
    questionPlaceholder: "Paste the IELTS writing question here...",
    essay: "Your Essay",
    essayPlaceholder: "Paste your essay here...",
    wordCount: "words",
    minWords: "Minimum",
    submit: "Score My Essay",
    trySample: "Try a Sample Essay",
    scoring: "Scoring your essay...",
    overall: "Overall Band",
    taskAchievement: "Task Achievement",
    coherence: "Coherence & Cohesion",
    lexical: "Lexical Resource",
    grammar: "Grammatical Range & Accuracy",
    feedback: "Feedback",
    overallFeedback: "Overall Feedback",
    latency: "Scored in",
    chatPlaceholder: "Ask a question about your score...",
    chatSend: "Send",
    chatTitle: "Ask the Examiner",
    newEssay: "Score Another Essay",
    errorShort: "Essay too short",
    errorGeneral: "Something went wrong. Please try again.",
    language: "Response Language",
    clear: "Clear",
    paste: "Paste",
    examTopic: "Enter Test Exam Mode",
    loading: [
      "Loading Models...",
      "Evaluating Essay...",
      "Finding Errors...",
      "Preparing The Results...",
    ],
    ccard: "Criterion Cards",
    ehe: "Error Highlighted Essay",
    ehedescription: "Your Essay — Errors Highlighted",
    grammer: "Grammar",
    spelling: "Spelling",
    repetition: "Repetition",
  },
  fa: {
    title: "نمره‌دهی مقاله آیلتس",
    subtitle: "پیش‌بینی نمره باند با هوش مصنوعی",
    taskType: "نوع تسک",
    task1: "تسک ۱ — گزارش / نامه",
    task2: "تسک ۲ — مقاله",
    question: "سوال / موضوع",
    questionPlaceholder: "سوال رایتینگ آیلتس را اینجا وارد کنید...",
    essay: "مقاله شما",
    essayPlaceholder: "مقاله خود را اینجا وارد کنید...",
    wordCount: "کلمه",
    minWords: "حداقل",
    submit: "نمره‌دهی مقاله",
    trySample: "یک مقاله نمونه امتحان کنید",
    scoring: "در حال نمره‌دهی...",
    overall: "نمره کلی",
    taskAchievement: "پاسخ به تسک",
    coherence: "انسجام و پیوستگی",
    lexical: "منابع لغوی",
    grammar: "دامنه و دقت گرامری",
    feedback: "بازخورد",
    overallFeedback: "بازخورد کلی",
    latency: "نمره‌دهی در",
    chatPlaceholder: "سوالی درباره نمره خود بپرسید...",
    chatSend: "ارسال",
    chatTitle: "از ممتحن بپرسید",
    newEssay: "نمره‌دهی مقاله جدید",
    errorShort: "مقاله خیلی کوتاه است",
    errorGeneral: "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.",
    language: "زبان پاسخ",
    clear: "پاکسازی",
    paste: "جایگذاری",
    examTopic: "ورود به آزمون تستی",
    loading: [
      "بارگذاری مدل ...",
      "بررسی متن ...",
      "یافتن غلط ها ...",
      "آماده سازی نتایج ...",
    ],
    ccard: "ریز نمرات",
    ehe: "تصحیح مقاله",
    ehedescription: "مقاله شما - تصحیح شده",
    grammer: "گرامر",
    spelling: "غلط املایی",
    repetition: "تکرار",
  },
} as const;

export type UILang = keyof typeof UI_TEXT;

export function getUIText(lang: string) {
  return UI_TEXT[lang as UILang] ?? UI_TEXT.en;
}
export const BAND_LABELS = {
  en: {
    expert: "Expert",
    veryGood: "Very Good",
    competent: "Competent",
    modest: "Modest",
    limited: "Limited",
    veryLimited: "Very Limited",
  },
  fa: {
    expert: "ممتاز",
    veryGood: "خیلی خوب",
    competent: "خوب",
    modest: "متوسط",
    limited: "محدود",
    veryLimited: "بسیار محدود",
  },
} as const;

export function getBandLabels(lang: string) {
  return BAND_LABELS[lang as keyof typeof BAND_LABELS] ?? BAND_LABELS.en;
}
