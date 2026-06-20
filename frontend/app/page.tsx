"use client";

import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScoringResponse } from "@/app/types";
import { scoreEssay } from "@/app/lib/api";
import Chat from "@/app/components/Chat";
import TextType from "./components/TextType";
import MainHeader from "./components/MainHeader";
import ResultsPanel from "./components/ResultsPanel";
import { useLanguageContext } from "./contexts/LangaugeContext";
import MainForm from "./components/MainForm";
import { EssayFormData, formSchema } from "./lib/form";
import ApiKeyInput from "./components/ApiKeyInput";

// -------- Page --------
export default function Home() {
  const { language, selectedModel, selectedProvider, langInfo, t } =
    useLanguageContext();
  const [result, setResult] = useState<ScoringResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEssay, setSubmittedEssay] = useState("");
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const methods = useForm<EssayFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      task_type: "2",
      essay: "",
      question: "",
    },
  });

  useEffect(() => {
    setMounted(true);
    setApiKey(localStorage.getItem("openrouter_key"));
  }, []);

  if (!mounted) {
    return null; // or a loader skeleton
  }

  // -------- Submit --------
  async function onSubmit(data: EssayFormData) {
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
        api_key: apiKey as string,
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

  // Reset
  function handleReset() {
    methods.reset();
    setResult(null);
    setError(null);
    setSubmittedEssay("");
  }

  return (
    <div className="min-h-screen bg-background" dir={langInfo!.dir}>
      {/* ---- Header ---- */}
      <MainHeader apiKey={apiKey as string} />
      {/* ---- Main ---- */}
      <main className="w-full px-3 py-2">
        {apiKey ? (
          loading ? (
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
                    <ResultsPanel
                      result={result}
                      submittedEssay={submittedEssay}
                      handleReset={handleReset}
                    />

                    {/* ---- Chat panel ---- */}
                    <div className="transition-all duration-300 min-w-1/2 lg:sticky lg:top-16 lg:self-stretch lg:max-h-[calc(100vh-75px)] h-full">
                      <Chat
                        essay={submittedEssay}
                        scoringResult={result}
                        language={language}
                        langInfo={langInfo}
                        placeholder={t.chatPlaceholder}
                        sendLabel={t.chatSend}
                        title={t.chatTitle}
                        provider={selectedProvider}
                        model={selectedModel}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* ---- Essay Form ---- */}
                    <div className="w-full lg:w-[40%] md:w-[60%] mx-auto">
                      <FormProvider {...methods}>
                        <MainForm
                          onSubmit={onSubmit}
                          error={error}
                          setError={setError}
                        />
                      </FormProvider>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="h-screen flex justify-center items-center">
            <ApiKeyInput
              onSave={(key: string) => {
                console.log("API Key:", key);
                setApiKey(key);
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
