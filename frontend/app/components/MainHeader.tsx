"use client";
import { FaGithub } from "react-icons/fa";
import ModelSelector from "./ModelSelector";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { LANGUAGES } from "@/app/lib/languages";
import { useLanguageContext } from "../contexts/LangaugeContext";

const MainHeader = () => {
  const { language, setLanguage, setSelectedModel, setSelectedProvider, t } =
    useLanguageContext();

  const [langOpen, setLangOpen] = useState(false);

  // --------- Change --------
  function handleModelChange(provider: string, modelId: string) {
    setSelectedProvider(provider);
    setSelectedModel(modelId);
  }

  return (
    <header className="border-b-2 border-border bg-background px-3 py-2 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <a
          className="w-9 h-9 bg-primary hover:bg-primary/70 rounded flex items-center justify-center shrink-0 transition-colors duration-150 text-text"
          href="https://github.com/AmirrezaGhiasvand/ielts-essay-score-ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaGithub className="w-6 h-6 cursor-pointer" />
        </a>
        <div>
          <h1 className="text-md font-semibold text-slate-100">{t.title}</h1>
          <p className="text-[11px] text-text">{t.subtitle}</p>
        </div>
      </div>

      {/* ---- Controls ---- */}
      <div className="flex items-center gap-4">
        <ModelSelector onModelChange={handleModelChange} />
        <Menu>
          <MenuButton
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-2 text-sm text-text hover:text-white bg-primary/20 border-2 border-border hover:border-primary hover:bg-primary rounded-lg px-4! py-2! transition-colors focus:outline-none duration-250 focus:ring-0 focus-visible:outline-none"
          >
            {LANGUAGES.find((l) => l.code === language)?.label}
            <ChevronDown size={11} />
          </MenuButton>
          <MenuItems
            anchor={{ to: "bottom end", gap: "8px" }}
            transition
            className="p-2 bg-primary/10 border border-border rounded-xl shadow-2xl z-30 w-32 overflow-hidden focus:outline-none focus:ring-0 focus-visible:outline-none origin-top transition duration-200 ease-in-out data-closed:scale-95 data-closed:opacity-0"
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
                      ? "text-text bg-primary/60 font-semibold"
                      : "text-text/80 hover:text-text hover:bg-primary/60"
                  } ${lang.code === "fa" && "font-persian font-semibold"}`}
                >
                  {lang.label}
                </button>
              </MenuItem>
            ))}
          </MenuItems>
        </Menu>
      </div>
    </header>
  );
};

export default MainHeader;
