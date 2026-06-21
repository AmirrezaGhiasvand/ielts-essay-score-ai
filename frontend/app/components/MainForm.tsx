"use client";
import { ClipboardPasteIcon, Loader2, Shuffle } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useLanguageContext } from "../contexts/LangaugeContext";
import { getExamTopic, getSampleEssay } from "../lib/api";
import { Dispatch, SetStateAction, useState } from "react";
import { EssayFormData } from "../lib/form";

const MIN_WORDS = { "1": 150, "2": 250 };

const MainForm = ({
  onSubmit,
  setError,
  error,
}: {
  onSubmit: any;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
}) => {
  const [loadingSample, setLoadingSample] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, dirtyFields, isDirty },
  } = useFormContext<EssayFormData>();

  const essayValue = watch("essay") || "";
  const taskType = watch("task_type") || "2";
  const wordCount = essayValue.trim().split(/\s+/).filter(Boolean).length;
  const minWords = MIN_WORDS[taskType as "1" | "2"];
  const wordCountOk = wordCount >= minWords;

  const { t, langInfo } = useLanguageContext();

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

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-primary/5 rounded-xl border-2 border-primary p-3 space-y-5 min-h-[calc(100vh-91px)] flex flex-col"
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
                const text = await navigator.clipboard.readText();
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
          <p className="text-xs text-red-400">{errors.question.message}</p>
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
                wordCountOk ? "text-green-400" : "text-text/80"
              }`}
            >
              {wordCount}
              {!wordCountOk && (
                <span className="text-text/80 font-normal">/{minWords}</span>
              )}{" "}
              {t.wordCount}
            </span>
            <div className="relative group inline-flex">
              <ClipboardPasteIcon
                className="text-text/70  w-5 h-5 cursor-pointer hover:text-slate-100 transition-all duration-200 ease-in-out"
                onClick={async () => {
                  // Get the value from clipboard (Mojtaba)
                  const text = await navigator.clipboard.readText();
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
          disabled={!wordCountOk}
          className="w-3/4 mx-auto bg-primary/60 border-2 border-border hover:border-primary hover:bg-primary rounded-lg py-1 text-base text-text font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {t.submit}
        </button>
        <button
          type="button"
          disabled={!isDirty}
          className="w-1/4 mx-auto bg-primary/10 border-2 border-border hover:border-primary hover:bg-primary rounded-lg py-1 text-base text-text font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          onClick={() => reset()}
        >
          {t.clear}
        </button>
      </div>
    </form>
  );
};

export default MainForm;
