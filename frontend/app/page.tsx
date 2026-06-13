"use client";

import ModelSelector from "@/app/components/ModelSelector";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, RotateCcw, Clock, ChevronDown } from "lucide-react";
import { ScoringResponse, Language } from "@/app/types";
import { scoreEssay } from "@/app/lib/api";
import { LANGUAGES, getUIText } from "@/app/lib/languages";
import BandGauge from "@/app/components/BandGauge";
import CriterionCard from "@/app/components/CriterionCard";
import Chat from "@/app/components/Chat";


// -------- Form schema --------

const formSchema = z.object({
  task_type: z.enum(["1", "2"]),
  question:  z.string().min(10, "Question is too short"),
  essay:     z.string().min(50, "Essay is too short"),
});

type FormData = z.infer<typeof formSchema>;

const MIN_WORDS = { "1": 150, "2": 250 };


// -------- Page --------

export default function Home() {
  const [language,       setLanguage]       = useState<Language>("en");
  const [result,         setResult]         = useState<ScoringResponse | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [submittedEssay, setSubmittedEssay] = useState("");
  const [langOpen,       setLangOpen]       = useState(false);

  const t        = getUIText(language);
  const langInfo = LANGUAGES.find((l) => l.code === language)!;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { task_type: "2" },
  });

  const essayValue  = watch("essay") || "";
  const taskType    = watch("task_type") || "2";
  const wordCount   = essayValue.trim().split(/\s+/).filter(Boolean).length;
  const minWords    = MIN_WORDS[taskType as "1" | "2"];
  const wordCountOk = wordCount >= minWords;
  const [selectedProvider, setSelectedProvider] = useState<string>("ollama");
  const [selectedModel,    setSelectedModel]    = useState<string>("mistral:7b");

  // -------- Submit --------

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    setResult(null);
    setSubmittedEssay(data.essay);

    try {
      const response = await scoreEssay({
        task_type: parseInt(data.task_type) as 1 | 2,
        question:  data.question,
        essay:     data.essay,
        language,
        provider:  selectedProvider,
        model:     selectedModel,
      });
      setResult(response);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? t.errorGeneral;
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
    <div className="min-h-screen bg-[#0F1117]" dir={langInfo.dir}>

      {/* ---- Header ---- */}
      <header className="border-b border-[#2A2D3A] bg-[#0F1117] px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#C8102E] rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[10px] tracking-wider">IE</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">{t.title}</h1>
            <p className="text-[10px] text-slate-500">{t.subtitle}</p>
          </div>
        </div>

        {/* ---- Controls ---- */}
        <div className="flex items-center gap-2">
          <ModelSelector onModelChange={handleModelChange} />
          <div className="relative flex-shrink-0">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-[#1A1D27] border border-[#2A2D3A] hover:border-[#C8102E] rounded-lg px-4 py-2 transition-colors font-medium"
          >
            {LANGUAGES.find((l) => l.code === language)?.label}
            <ChevronDown size={11} />
          </button>
          {langOpen && (
            <div className="absolute end-0 top-9 bg-[#1A1D27] border border-[#2A2D3A] rounded-xl shadow-2xl z-30 min-w-[150px] overflow-hidden">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
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
         </div>
        </div>
      </header>


      {/* ---- Main ---- */}
      <main className="w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-64px)]">


          {/* ---- Left: Form ---- */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-[#1A1D27] rounded-xl border border-[#2A2D3A] p-6 space-y-5 h-full flex flex-col"
            >

              {/* Task type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {t.taskType}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["1", "2"] as const).map((type) => {
                  const isTask1 = type === "1";
                  return (
                    <label
                      key={type}
                      title={isTask1 ? "Task 1 requires a chart image — multimodal support coming soon" : ""}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
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
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {t.question}
                </label>
                <textarea
                  {...register("question")}
                  placeholder={t.questionPlaceholder}
                  rows={3}
                  className="w-full resize-none rounded-lg bg-[#0F1117] border border-[#2A2D3A] px-4 py-3 text-base text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors"
                />
                {errors.question && (
                  <p className="text-xs text-red-400">{errors.question.message}</p>
                )}
              </div>

              {/* Essay */}
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    {t.essay}
                  </label>
                  <span className={`text-xs font-medium tabular-nums ${
                    wordCountOk ? "text-green-400" : "text-slate-600"
                  }`}>
                    {wordCount}
                    {!wordCountOk && (
                      <span className="text-slate-600 font-normal">
                        /{minWords}
                      </span>
                    )}
                    {" "}{t.wordCount}
                  </span>
                </div>
                <textarea
                  {...register("essay")}
                  placeholder={t.essayPlaceholder}
                  rows={10}
                  className="w-full flex-1 resize-none rounded-lg bg-[#0F1117] border border-[#2A2D3A] px-4 py-3 text-base text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors font-[var(--font-geist-mono)]"
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
              <button
                type="submit"
                disabled={loading || !wordCountOk}
                className="w-full bg-[#C8102E] text-white rounded-lg py-3 text-base font-semibold hover:bg-[#A50E26] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

            </form>
          </div>


          {/* ---- Right: Results + Chat ---- */}
          <div className="lg:col-span-3 space-y-4">
            {result ? (
              <>
                {/* ---- Results panel ---- */}
                <div className="bg-[#1A1D27] rounded-xl border border-[#2A2D3A] p-5 space-y-5">

                  {/* Overall band */}
                  <div className="flex items-start gap-5">
                    <BandGauge score={result.overall_band} size={130} label={t.overall} />
                    <div className="flex-1 space-y-3 pt-2">
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {result.overall_feedback}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Clock size={11} />
                          <span>{t.latency} {(result.latency_ms / 1000).toFixed(1)}s</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="h-80">
                  <Chat
                    essay={submittedEssay}
                    scoringResult={result}
                    language={language}
                    placeholder={t.chatPlaceholder}
                    sendLabel={t.chatSend}
                    title={t.chatTitle}
                    provider={selectedProvider}
                    model={selectedModel}
                  />
                </div>
              </>
            ) : (
              /* ---- Empty state ---- */
              <div className="bg-[#1A1D27] rounded-xl border border-[#2A2D3A] h-full flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#2A2D3A] flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-[#3A3D4A]" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-slate-400">
                    Your results will appear here
                  </p>
                  <p className="text-xs text-slate-600">
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