"use client";

import ModelSelector from "@/app/components/ModelSelector";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, RotateCcw, Clock, ChevronDown } from "lucide-react";
import { ScoringResponse, Language, CriterionScore } from "@/app/types";
import { scoreEssay } from "@/app/lib/api";
import { LANGUAGES, getUIText } from "@/app/lib/languages";
import BandGauge from "@/app/components/BandGauge";
import CriterionCard from "@/app/components/CriterionCard";
import Chat from "@/app/components/Chat";
import ReactMarkdown from "react-markdown";
import { FaGithub } from "react-icons/fa";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

// -------- Form schema --------

const formSchema = z.object({
  task_type: z.enum(["1", "2"]),
  question: z.string().min(10, "Question is too short"),
  essay: z.string().min(50, "Essay is too short"),
});

type FormData = z.infer<typeof formSchema>;

const MIN_WORDS = { "1": 150, "2": 250 };

// -------- Page --------

export default function Home() {
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem("lang")! as Language) || "en",
  );
  const [result, setResult] = useState<ScoringResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEssay, setSubmittedEssay] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);

  const t = getUIText(language);
  const langInfo = LANGUAGES.find((l) => l.code === language);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { task_type: "2", essay: "", question: "" },
  });

  const essayValue = watch("essay") || "";
  const taskType = watch("task_type") || "2";
  const wordCount = essayValue.trim().split(/\s+/).filter(Boolean).length;
  const minWords = MIN_WORDS[taskType as "1" | "2"];
  const wordCountOk = wordCount >= minWords;
  const [selectedProvider, setSelectedProvider] = useState<string>("ollama");
  const [selectedModel, setSelectedModel] = useState<string>("mistral:7b");

  // test result
  const mockScoringResult: ScoringResponse = {
    task_achievement: {
      score: 7.0,
      feedback:
        "The essay addresses all parts of the task, though some ideas could be more fully developed. The position is clear throughout.",
    },
    coherence_cohesion: {
      score: 7.5,
      feedback:
        "Information is logically organized with clear progression. Cohesive devices are used appropriately, though occasionally repetitive.",
    },
    lexical_resource: {
      score: 6.5,
      feedback:
        "A sufficient range of vocabulary is used, but some repetition and occasional inaccuracy reduce precision.",
    },
    grammatical_range_accuracy: {
      score: 6.0,
      feedback:
        "There is a mix of simple and complex sentences, but grammatical errors are noticeable and sometimes affect clarity.",
    },
    overall_band: 6.5,
    overall_feedback:
      "The essay demonstrates a generally effective command of the language with some weaknesses in grammar and lexical precision. Ideas are relevant and mostly well organized.",
    latency_ms: 1240,
    similar_essays: [
      {
        overall_band: 7.5,
        examiner_comment:
          "A well-structured essay with strong arguments and effective use of examples. Minor language issues present but do not hinder understanding.",
      },
      {
        overall_band: 6.0,
        examiner_comment:
          "Addresses the task adequately but lacks depth in analysis and contains several grammatical inconsistencies.",
      },
      {
        overall_band: 8.0,
        examiner_comment:
          "Excellent response with clear argumentation, varied vocabulary, and strong cohesion throughout.",
      },
    ],
  };

  // -------- Submit --------

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    setResult(null);
    setSubmittedEssay(data.essay);

    try {
      const response = await scoreEssay({
        task_type: parseInt(data.task_type) as 1 | 2,
        question: data.question,
        essay: data.essay,
        language,
        provider: selectedProvider,
        model: selectedModel,
      });
      setResult(response);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t.errorGeneral;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // -------- Reset --------

  function handleReset() {
    reset();
    setResult(null);
    setError(null);
    setSubmittedEssay("");
  }
  // --------- Change --------
  function handleModelChange(provider: string, modelId: string) {
    setSelectedProvider(provider);
    setSelectedModel(modelId);
  }

  return (
    <div className="min-h-screen bg-[#0F1117]" dir={langInfo!.dir}>
      {/* ---- Header ---- */}
      <header className="border-b border-[#2A2D3A] bg-[#0F1117] px-3 py-2 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <a
            className="w-9 h-9 bg-[#C8102E] hover:bg-[#C8102E]/70 rounded flex items-center justify-center shrink-0 transition-colors duration-150"
            href="https://github.com/AmirrezaGhiasvand/ielts-essay-score-ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub className="w-6 h-6 cursor-pointer" />
          </a>
          <div>
            <h1 className="text-md font-semibold text-slate-100">{t.title}</h1>
            <p className="text-[11px] text-slate-500">{t.subtitle}</p>
          </div>
        </div>

        {/* ---- Controls ---- */}
        <div className="flex items-center gap-4">
          <ModelSelector onModelChange={handleModelChange} />
          {/* <div className="relative shrink-0">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-[#1A1D27] border border-[#2A2D3A] hover:border-[#C8102E] rounded-lg px-4 py-2 transition-colors font-medium"
            >
              {LANGUAGES.find((l) => l.code === language)?.label}
              <ChevronDown size={11} />
            </button>
            {langOpen && (
              <div className="absolute inset-e-0 top-11 p-2 bg-[#1A1D27] border border-[#2A2D3A] rounded-xl shadow-2xl z-30 min-w-40 overflow-hidden">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      localStorage.setItem("lang", lang.code);
                      setLanguage(lang.code);
                      setLangOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-2xl ${
                      language === lang.code
                        ? "text-[#C8102E] bg-[#C8102E]/10 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#0F1117]"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div> */}
          <Menu>
            <MenuButton
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-[#1A1D27] border border-[#2A2D3A] hover:border-[#C8102E] rounded-lg px-4 py-2 transition-colors font-medium focus:outline-none focus:ring-0 focus-visible:outline-none"
            >
              {LANGUAGES.find((l) => l.code === language)?.label}
              <ChevronDown size={11} />
            </MenuButton>
            <MenuItems
              anchor={{ to: "bottom end", gap: "8px" }}
              transition
              className="p-2 bg-[#1A1D27] border border-[#2A2D3A] rounded-xl shadow-2xl z-30 w-42 overflow-hidden focus:outline-none focus:ring-0 focus-visible:outline-none origin-top transition duration-200 ease-in-out data-closed:scale-95 data-closed:opacity-0"
            >
              {LANGUAGES.map((lang) => (
                <MenuItem key={lang.code}>
                  <button
                    onClick={() => {
                      localStorage.setItem("lang", lang.code);
                      setLanguage(lang.code);
                      setLangOpen(false);
                    }}
                    className={`w-full text-center px-3 py-2 my-0.5 text-xs transition-colors rounded-2xl ${
                      language === lang.code
                        ? "text-[#C8102E] bg-[#C8102E]/10 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#0F1117]"
                    }`}
                  >
                    {lang.label}
                  </button>
                </MenuItem>
              ))}
            </MenuItems>
          </Menu>
        </div>
      </header>

      {/* ---- Main ---- */}
      <main className="w-full px-3 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[calc(100vh-75px)]">
          {/* ---- Left: Form ---- */}
          <div className="lg:col-span-2 lg:sticky lg:top-16 lg:self-start">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-[#1A1D27] rounded-xl border border-[#2A2D3A] p-3 space-y-5 h-[calc(100vh-75px)] flex flex-col"
            >
              {/* Task type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                  {t.taskType}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["1", "2"] as const).map((type) => {
                    const isTask1 = type === "1";
                    return (
                      <label
                        key={type}
                        title={
                          isTask1
                            ? "Task 1 requires a chart image — multimodal support coming soon"
                            : ""
                        }
                        className={`flex flex-col items-center justify-center p-1 rounded-lg border text-md font-medium transition-all ${
                          isTask1
                            ? "border-[#2A2D3A] text-slate-600 cursor-not-allowed opacity-50"
                            : taskType === type
                              ? "border-[#C8102E] bg-[#C8102E]/10 text-[#C8102E] cursor-pointer"
                              : "border-[#2A2D3A] text-slate-500 hover:border-[#3A3D4A] hover:text-slate-300 cursor-pointer"
                        }`}
                      >
                        <input
                          type="radio"
                          value={type}
                          disabled={isTask1}
                          {...register("task_type")}
                          className="sr-only"
                        />
                        {type === "1" ? t.task1 : t.task2}
                        {isTask1 && (
                          <span className="text-[9px] text-slate-600 mt-0.5 font-normal">
                            coming soon
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Question */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                  {t.question}
                </label>
                <textarea
                  {...register("question")}
                  placeholder={t.questionPlaceholder}
                  rows={3}
                  dir={langInfo!.dir}
                  className="w-full resize-none rounded-lg bg-[#0F1117] border border-[#2A2D3A] p-2 text-base text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors"
                />
                {errors.question && (
                  <p className="text-xs text-red-400">
                    {errors.question.message}
                  </p>
                )}
              </div>

              {/* Essay */}
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                    {t.essay}
                  </label>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      wordCountOk ? "text-green-400" : "text-slate-600"
                    }`}
                  >
                    {wordCount}
                    {!wordCountOk && (
                      <span className="text-slate-600 font-normal">
                        /{minWords}
                      </span>
                    )}{" "}
                    {t.wordCount}
                  </span>
                </div>
                <textarea
                  {...register("essay")}
                  placeholder={t.essayPlaceholder}
                  rows={10}
                  dir={langInfo!.dir}
                  className="w-full flex-1 resize-none rounded-lg bg-[#0F1117] border border-[#2A2D3A] p-2 text-base text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors font-(--font-geist-mono)"
                />
                {errors.essay && (
                  <p className="text-xs text-red-400">{errors.essay.message}</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-center items-center gap-2">
                <button
                  type="submit"
                  disabled={loading || !wordCountOk}
                  className="w-1/2 mx-auto bg-[#C8102E] text-white rounded-lg py-1 text-base font-semibold hover:bg-[#A50E26] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t.scoring}
                    </>
                  ) : (
                    t.submit
                  )}
                </button>
                <button
                  type="button"
                  disabled={!isDirty}
                  className="w-1/2 mx-auto bg-[#C8102E] text-white rounded-lg py-1 text-base font-semibold hover:bg-[#A50E26] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  onClick={() => reset()}
                >
                  {t.clear}
                </button>
              </div>
            </form>
          </div>

          {/* ---- Right: Results + Chat ---- */}
          <div className="lg:col-span-3 space-y-4 h-full flex flex-col overflow-hidden">
            {result ? (
              <>
                {/* ---- Results panel ---- */}
                <div className="bg-[#1A1D27] rounded-xl border border-[#2A2D3A] p-5 space-y-5">
                  {/* Overall band */}
                  <div className="flex items-start gap-6 flex-wrap">
                    <BandGauge
                      score={result.overall_band}
                      size={130}
                      label={t.overall}
                    />
                    <div className="flex-1 min-w-50 space-y-3 pt-2">
                      <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{result.overall_feedback}</ReactMarkdown>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Clock size={11} />
                          <span>
                            {t.latency} {(result.latency_ms / 1000).toFixed(1)}s
                          </span>
                        </div>
                        <button
                          onClick={handleReset}
                          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 border border-[#2A2D3A] hover:border-[#3A3D4A] rounded-lg px-3 py-1.5 transition-colors"
                        >
                          <RotateCcw size={11} />
                          {t.newEssay}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#2A2D3A]" />

                  {/* Criterion cards */}
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden transition-[max-height,opacity] duration-350 ease-in-out ${
                      isChatActive
                        ? "max-h-0 opacity-0"
                        : "max-h-150 opacity-100"
                    }`}
                  >
                    <CriterionCard
                      title={t.taskAchievement}
                      data={result.task_achievement}
                      feedbackLabel={t.feedback}
                    />
                    <CriterionCard
                      title={t.coherence}
                      data={result.coherence_cohesion}
                      feedbackLabel={t.feedback}
                    />
                    <CriterionCard
                      title={t.lexical}
                      data={result.lexical_resource}
                      feedbackLabel={t.feedback}
                    />
                    <CriterionCard
                      title={t.grammar}
                      data={result.grammatical_range_accuracy}
                      feedbackLabel={t.feedback}
                    />
                  </div>
                </div>

                {/* ---- Chat panel ---- */}
                <div className={`transition-all duration-300 h-full`}>
                  <Chat
                    essay={submittedEssay}
                    scoringResult={mockScoringResult}
                    language={language}
                    placeholder={t.chatPlaceholder}
                    sendLabel={t.chatSend}
                    title={t.chatTitle}
                    provider={selectedProvider}
                    model={selectedModel}
                    setChatActive={setIsChatActive}
                  />
                </div>
              </>
            ) : (
              /* ---- Empty state ---- */
              <div className="bg-[#1A1D27] rounded-xl border border-[#2A2D3A] h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-18 h-18 rounded-full border-2 border-dashed border-[#2A2D3A] flex items-center justify-center duration-75">
                  <div className="w-8 h-8 rounded-full border-2 border-[#3A3D4A]" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-md font-medium text-slate-400">
                    Your results will appear here
                  </p>
                  <p className="text-sm text-slate-600">
                    Submit your essay to see band scores and feedback
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
