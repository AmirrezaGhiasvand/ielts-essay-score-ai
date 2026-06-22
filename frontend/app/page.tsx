"use client";

import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HistoryItem, Language, ScoringResponse } from "@/app/types";
import { scoreEssay } from "@/app/lib/api";
import Chat from "@/app/components/Chat";
import TextType from "./components/TextType";
import MainHeader from "./components/MainHeader";
import ResultsPanel from "./components/ResultsPanel";
import { useLanguageContext } from "./contexts/LangaugeContext";
import MainForm from "./components/MainForm";
import { EssayFormData, formSchema } from "./lib/form";
import ApiKeyInput from "./components/ApiKeyInput";
import DraggableTimer from "./components/DraggableTimer";

// -------- Page --------
export default function Home() {
  const {
    language,
    setLanguage,
    selectedModel,
    selectedProvider,
    langInfo,
    t,
  } = useLanguageContext();
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
    setLanguage((localStorage.getItem("lang") as Language) || "en");
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

      // Save full History item (Mojtaba)
      const existing = localStorage.getItem("results");

      const parsed: HistoryItem[] = existing ? JSON.parse(existing) : [];

      // skip saving if this exact essay is already in history
      const alreadyExists = parsed.some((item) => item.essay === data.essay);

      if (!alreadyExists) {
        const newItem: HistoryItem = {
          question: data.question,
          essay: data.essay,
          result: response,
        };

        parsed.push(newItem);

        localStorage.setItem("results", JSON.stringify(parsed));
      }
    } catch (err: unknown) {
      let message = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;

      if (message?.startsWith("Error code: 401")) {
        message = t.errorWrongKey;
      } else if (message?.startsWith("Connection error")) {
        message = t.errorConnection;
      } else {
        message = t.errorGeneral;
      }

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
      {loading ? null : (
        <MainHeader
          apiKey={apiKey as string}
          setApiKey={setApiKey}
          result={result}
          setResult={setResult}
          setSubmittedEssay={setSubmittedEssay}
          submittedEssay={submittedEssay}
        />
      )}
      {/* ---- Main ---- */}
      <main className="w-full px-3 md:py-2 pt-10">
        {apiKey ? (
          loading ? (
            <div className="flex justify-center min-h-[calc(100vh-91px)] items-center text-text">
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
            <div className="flex justify-center items-stretch md:min-h-[calc(100vh-91px)]">
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
                    <div className="transition-all duration-300 w-full min-w-1/2 lg:sticky lg:top-20 lg:self-stretch lg:h-[calc(100vh-91px)] h-[calc(100vh-10px)] md:h-[calc(100vh-90px)] md:pb-0 pb-5">
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
                        api_key={apiKey}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* ---- Essay Form ---- */}
                    <div className="w-full xl:w-[45%] lg:w-[60%] md:w-full mx-auto ">
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
          <div className="h-[calc(100vh-91px)] flex justify-center items-center">
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
