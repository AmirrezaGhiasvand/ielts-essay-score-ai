// contexts/LanguageContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Language, LanguageOption } from "@/app/types";
import { getUIText, LANGUAGES } from "@/app/lib/languages";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;

  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;

  selectedModel: string;
  setSelectedModel: (model: string) => void;

  langInfo: LanguageOption | undefined;

  t: ReturnType<typeof getUIText>;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const [selectedProvider, setSelectedProvider] = useState("openrouter");

  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");

  const value = {
    language,
    setLanguage,

    selectedProvider,
    setSelectedProvider,

    selectedModel,
    setSelectedModel,

    langInfo: LANGUAGES.find((l) => l.code === language),

    t: getUIText(language),
  };

  useEffect(() => {
    localStorage.setItem("lang", language);
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguageContext must be used inside LanguageProvider");
  }

  return context;
}
