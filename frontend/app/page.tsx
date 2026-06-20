"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  RotateCcw,
  Clock,
  ChevronDownIcon,
  ClipboardPasteIcon,
} from "lucide-react";
import { ScoringResponse, Language, CriterionScore } from "@/app/types";
import { scoreEssay } from "@/app/lib/api";
import { LANGUAGES, getUIText } from "@/app/lib/languages";
import BandGauge from "@/app/components/BandGauge";
import CriterionCard from "@/app/components/CriterionCard";
import Chat from "@/app/components/Chat";
import ReactMarkdown from "react-markdown";
import ErrorHighlightedEssay from "@/app/components/ErrorHighlightedEssay";
import { getSampleEssay } from "@/app/lib/api";
import { getExamTopic } from "@/app/lib/api";
import { Shuffle } from "lucide-react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import TextType from "./components/TextType";
import MainHeader from "./MainHeader";

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
    setValue,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { task_type: "2", essay: "", question: "" },
  });

  const essayValue = watch("essay") || "";
  const taskType = watch("task_type") || "2";
  const wordCount = essayValue.trim().split(/\s+/).filter(Boolean).length;
  const minWords = MIN_WORDS[taskType as "1" | "2"];
  const wordCountOk = wordCount >= minWords;
  const [selectedProvider, setSelectedProvider] =
    useState<string>("openrouter");
  const [selectedModel, setSelectedModel] =
    useState<string>("openai/gpt-4o-mini");
  const [loadingSample, setLoadingSample] = useState(false);

  // // test result
  /* const mockResult: ScoringResponse = {
    task_achievement: {
      score: 7.0,
      feedback:
        "The response addresses all parts of the task and maintains a clear position throughout. Ideas are relevant, though some supporting examples could be developed further.",
    },
    coherence_cohesion: {
      score: 6.5,
      feedback:
        "Information is logically organized with clear paragraphing. Cohesive devices are generally used appropriately, although some linking phrases are repetitive.",
    },
    lexical_resource: {
      score: 7.5,
      feedback:
        "A good range of vocabulary is used with flexibility and precision. Occasional word-choice errors are present but do not affect overall clarity.",
    },
    grammatical_range_accuracy: {
      score: 6.5,
      feedback:
        "The essay demonstrates a variety of sentence structures. Some grammatical and punctuation errors occur, particularly in complex sentences.",
    },
    overall_band: 7.0,
    overall_feedback:
      "This is a strong IELTS Task 2 response with a clear argument, relevant examples, and a good range of vocabulary. To achieve a higher band score, focus on improving grammatical accuracy and developing supporting points in greater depth.",
    latency_ms: 1847,
    similar_essays: [
      {
        overall_band: 7.0,
        examiner_comment:
          "Well-organized response with relevant ideas and generally effective language use. Minor grammatical inaccuracies limit the score.",
      },
      {
        overall_band: 7.5,
        examiner_comment:
          "Strong vocabulary and task response. Greater sophistication in argument development would strengthen the essay further.",
      },
    ],
    text_errors: [
      {
        error_type: "grammar",
        original: "people is becoming",
        correction: "people are becoming",
        explanation:
          "The noun 'people' is plural and requires the plural verb 'are'.",
      },
      {
        error_type: "spelling",
        original: "enviroment",
        correction: "environment",
        explanation: "The correct spelling is 'environment'.",
      },
      {
        error_type: "repetition",
        original: "very important, very important",
        correction: "extremely important",
        explanation:
          "Repeating the same phrase reduces lexical variety. Consider using a synonym instead.",
      },
    ],
  }; */

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

  async function handleGenerateSample() {
    setLoadingSample(true);
    try {
      const sample = await getSampleEssay();
      setValue("question", sample.question, {
        shouldDirty: true,
      });
      setValue("essay", sample.essay, {
        shouldDirty: true,
      });
      setValue("task_type", "2");
    } catch {
      setError("Failed to load sample essay");
    } finally {
      setLoadingSample(false);
    }
  }

  async function handleExamTopic() {
    try {
      const sample = await getExamTopic();
      setValue("question", sample.question, {
        shouldDirty: true,
      });
      setValue("task_type", "2");
    } catch {
      setError("Failed to load exam topic");
    }
  }

  // --------- Change --------
  function handleModelChange(provider: string, modelId: string) {
    setSelectedProvider(provider);
    setSelectedModel(modelId);
  }

  return (
    <div className="min-h-screen bg-background" dir={langInfo!.dir}>
      {/* ---- Header ---- */}
      <MainHeader
        title={t.title}
        subtitle={t.subtitle}
        handleModelChange={handleModelChange}
        langOpen={langOpen}
        setLangOpen={setLangOpen}
        setLanguage={setLanguage}
        language={language}
        LANGUAGES={LANGUAGES}
      />

      {/* ---- Main ---- */}
      <main className="w-full px-3 py-2">
        {/* Loading */}
        {loading ? (
          <div className="min-h-[calc(100vh-75px)] flex justify-center items-center text-text">
            <TextType
              className="text-3xl"
              text={[...t.loading]}
              typingSpeed={75}
              pauseDuration={1500}
              showCursor
              cursorCharacter="|"
              deletingSpeed={100}
              cursorBlinkDuration={0.5}
              loop={false}
            />
          </div>
        ) : (
          <div className="flex justify-center items-stretch min-h-[calc(100vh-75px)]">
            <div className="flex justify-center items-stretch gap-3 w-full lg:flex-row flex-col">
              {result ? (
                <>
                  {/* ---- Results panel ---- */}
                  <div className="bg-background rounded-xl border-2 border-border p-5 space-y-5">
                    {/* Overall band */}
                    <div className="flex items-start gap-6 flex-wrap">
                      <BandGauge
                        score={result.overall_band}
                        size={130}
                        label={t.overall}
                        language={language}
                      />
                      <div className="flex-1 min-w-50 space-y-3 pt-2">
                        <div className="text-sm text-text leading-relaxed prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>
                            {result.overall_feedback}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-text/60">
                            <Clock size={11} />
                            <span>
                              {t.latency}{" "}
                              {(result.latency_ms / 1000).toFixed(1)}s
                            </span>
                          </div>
                          <button
                            onClick={handleReset}
                            className="flex items-center bg-primary/30 gap-1.5 text-xs text-text/90 hover:text-text border-2 border-border hover:border-border hover:bg-primary rounded-lg px-3 py-1.5 transition-colors"
                          >
                            <RotateCcw size={11} />
                            {t.newEssay}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-foreground" />

                    <div className="mx-auto w-full min-h-0 overflow-visible divide-y divide-foreground rounded-xl bg-primary/5">
                      <Disclosure as="div" className="p-6" defaultOpen>
                        <DisclosureButton className="group flex w-full items-center justify-between">
                          <span className="text-md font-medium text-text group-data-hover:text-text/80">
                            {t.ccard}
                          </span>
                          <ChevronDownIcon className="size-5 fill-text group-data-hover:fill-text group-data-open:rotate-180" />
                        </DisclosureButton>
                        <DisclosurePanel
                          transition
                          className="mt-2 text-sm/5 text-text origin-top transition duration-200 ease-out data-closed:-translate-y-6 data-closed:opacity-0 "
                        >
                          {/* Criterion cards */}
                          <div
                            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden transition-[max-height,opacity] duration-350 ease-in-out max-h-150 opacity-100
                          `}
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
                        </DisclosurePanel>
                      </Disclosure>
                      {/* Error-highlighted essay */}
                      {result.text_errors.length > 0 && (
                        <Disclosure as="div" className="p-6" defaultOpen>
                          <DisclosureButton className="group flex w-full items-center justify-between">
                            <span className="text-md font-medium text-text group-data-hover:text-text">
                              {t.ehe}
                            </span>
                            <ChevronDownIcon className="size-5 fill-text group-data-hover:fill-text group-data-open:rotate-180" />
                          </DisclosureButton>
                          <DisclosurePanel
                            transition
                            className="mt-2 text-sm/5 text-text origin-top transition duration-200 ease-out data-closed:-translate-y-6 data-closed:opacity-0 "
                          >
                            <>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-text/70 uppercase tracking-widest">
                                    {t.ehedescription}
                                  </span>
                                  <div className="flex items-center gap-3 text-[10px] text-text/70">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-orange-400" />{" "}
                                      {t.grammer}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-red-400" />{" "}
                                      {t.spelling}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-stone-400" />{" "}
                                      {t.repetition}
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-background border border-foreground rounded-lg p-4 text-sm text-text/90">
                                  <ErrorHighlightedEssay
                                    essay={submittedEssay}
                                    errors={result.text_errors}
                                  />
                                </div>
                              </div>
                              <div className="border-t border-foreground" />
                            </>
                          </DisclosurePanel>
                        </Disclosure>
                      )}
                    </div>
                  </div>

                  {/* ---- Chat panel ---- */}
                  <div
                    className={`transition-all duration-300 min-w-1/2 lg:sticky lg:top-16 lg:self-stretch lg:max-h-[calc(100vh-75px)] h-full`}
                  >
                    <Chat
                      essay={submittedEssay}
                      scoringResult={result}
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
                <>
                  {/* ---- Essay Form  ---- */}
                  <div className="w-full lg:w-[40%] md:w-[60%] mx-auto">
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="bg-primary/5 rounded-xl border-2 border-primary p-3 space-y-5 h-[calc(100vh-75px)] flex flex-col"
                    >
                      {/* Sample essay button */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateSample}
                          disabled={loadingSample}
                          className="w-full flex items-center bg-primary/20 justify-center gap-2 text-xs font-medium text-text/90  border-2 border-dashed border-border hover:border-foreground hover:bg-primary/70 hover:text-white duration-350 rounded-lg py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {loadingSample ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Shuffle size={13} />
                          )}
                          {t.trySample}
                        </button>

                        <button
                          type="button"
                          onClick={handleExamTopic}
                          disabled={loadingSample}
                          className="w-full flex items-center bg-primary/20 justify-center gap-2 text-xs font-medium text-text/90  border-2 border-dashed border-border hover:border-foreground hover:bg-primary/70 hover:text-white duration-350 rounded-lg py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {t.examTopic}
                        </button>
                      </div>
                      {/* Task type */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-text/80 uppercase tracking-widest">
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
                                    ? "border-border border-2 text-text cursor-not-allowed opacity-50"
                                    : taskType === type
                                      ? "border-secondary/30 border-2 bg-primary/60 text-text"
                                      : "border-secondary/30 border-2 text-text hover:border-border hover:text-text"
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
                                  <span className="text-[9px] text-text mt-0.5 font-normal">
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
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-semibold text-text/70 uppercase tracking-widest">
                            {t.question}
                          </label>
                          <div className="relative group inline-flex">
                            <ClipboardPasteIcon
                              className="text-text/70  w-5 h-5 cursor-pointer hover:text-slate-100 transition-all duration-200 ease-in-out"
                              onClick={async () => {
                                // Get the value from clipboard (Mojtaba)
                                const text =
                                  await navigator.clipboard.readText();
                                setValue("question", text, {
                                  shouldDirty: true,
                                });
                              }}
                            />

                            <div className="absolute -top-11 left-1/2 -translate-x-1/2 rounded-lg bg-primary px-2 py-2 text-sm text-text opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                              {t.paste}
                              <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-primary" />
                            </div>
                          </div>
                        </div>
                        <textarea
                          {...register("question")}
                          spellCheck={false}
                          placeholder={t.questionPlaceholder}
                          rows={3}
                          dir={dirtyFields.question ? "ltr" : langInfo!.dir}
                          className="w-full resize-none rounded-lg bg-background border-2 border-border p-2 text-base text-text placeholder:text-text/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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
                          <label className="text-sm font-semibold text-text/70 uppercase tracking-widest">
                            {t.essay}
                          </label>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-medium tabular-nums ${
                                wordCountOk
                                  ? "text-green-400"
                                  : "text-text/80"
                              }`}
                            >
                              {wordCount}
                              {!wordCountOk && (
                                <span className="text-text/80 font-normal">
                                  /{minWords}
                                </span>
                              )}{" "}
                              {t.wordCount}
                            </span>
                            <div className="relative group inline-flex">
                              <ClipboardPasteIcon
                                className="text-text/70  w-5 h-5 cursor-pointer hover:text-slate-100 transition-all duration-200 ease-in-out"
                                onClick={async () => {
                                  // Get the value from clipboard (Mojtaba)
                                  const text =
                                    await navigator.clipboard.readText();
                                  setValue("essay", text, {
                                    shouldDirty: true,
                                  });
                                }}
                              />
                              <div className="absolute -top-11 left-1/2 -translate-x-1/2 rounded-lg bg-primary px-2 py-2 text-sm text-text opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                              {t.paste}
                              <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-primary" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <textarea
                          {...register("essay")}
                          spellCheck={false}
                          placeholder={t.essayPlaceholder}
                          rows={10}
                          dir={dirtyFields.essay ? "ltr" : langInfo!.dir}
                          className="w-full flex-1 resize-none rounded-lg bg-background border-2 border-border p-2 text-base text-text placeholder:text-text/50 focus:outline-none focus:ring-2 focus:ring-border focus:border-border transition-colors font-(--font-geist-mono)"
                        />
                        {errors.essay && (
                          <p className="text-xs text-red-400">
                            {errors.essay.message}
                          </p>
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
                          className="w-3/4 mx-auto bg-primary/50 border-2 border-border hover:border-primary hover:bg-primary rounded-lg py-1 text-base text-text font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
                          className="w-1/4 mx-auto bg-primary/20 border-2 border-border hover:border-primary hover:bg-primary rounded-lg py-1 text-base text-text font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                          onClick={() => reset()}
                        >
                          {t.clear}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
