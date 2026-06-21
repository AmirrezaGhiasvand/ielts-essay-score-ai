"use client";
import { FaGithub } from "react-icons/fa";
import ModelSelector from "./ModelSelector";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { LANGUAGES } from "@/app/lib/languages";
import { useLanguageContext } from "../contexts/LangaugeContext";
import ApiKeyInput from "./ApiKeyInput";
import HeaderApiKeyInput from "./HeaderApiKeyInput";

const MainHeader = ({
  apiKey,
  setApiKey,
}: {
  apiKey: string;
  setApiKey: (value: SetStateAction<string | null>) => void;
}) => {
  const { language, setLanguage, setSelectedModel, setSelectedProvider, t } =
    useLanguageContext();

  const [langOpen, setLangOpen] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);

  // --------- Change --------
  function handleModelChange(provider: string, modelId: string) {
    setSelectedProvider(provider);
    setSelectedModel(modelId);
  }

  return (
    <div className="sticky top-0 z-20">
      <header
        className={`
    fixed md:sticky
    top-0 left-0 right-0
    md:translate-y-0
    z-40

    border-b-2 border-border
    bg-background/95 backdrop-blur-sm

    flex md:flex-row flex-col
    items-center justify-between

    px-3 py-2

    transition-transform duration-300 ease-in-out

    ${isHeaderOpen ? "translate-y-0" : "-translate-y-full"}

    md:relative md:left-auto md:right-auto
  `}
      >
        <div className="flex items-center gap-3 pb-2">
          <a
            className="md:w-9 md:h-9 w-12 h-12 bg-primary hover:bg-primary/70 rounded flex items-center justify-center shrink-0 transition-colors duration-150 text-text"
            href="https://github.com/AmirrezaGhiasvand/ielts-essay-score-ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaGithub className="md:w-6 md:h-6 w-9 h-9 cursor-pointer" />
          </a>
          <div>
            <h1 className="md:text-md text-2xl font-semibold text-slate-100">
              {t.title}
            </h1>
            <p className="md:text-[11px] text-[14px] text-text">{t.subtitle}</p>
          </div>
        </div>

        {/* ---- Controls ---- */}
        <div className="flex items-center md:flex-row flex-col gap-4">
          {/* Api key control */}
          {apiKey ? (
            <Menu>
              <MenuButton
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center justify-center gap-1 text-sm text-text md:w-full w-[75vw] hover:text-white bg-primary/20 border-2 border-border hover:border-primary hover:bg-primary rounded-lg px-4! py-2! transition-colors focus:outline-none duration-250 focus:ring-0 focus-visible:outline-none"
              >
                {t.apiKey}
                <ChevronDown size={11} />
              </MenuButton>
              <MenuItems
                anchor={{ to: "bottom end", gap: "8px" }}
                transition
                className="p-2 bg-muted border border-border rounded-xl shadow-2xl z-30 md:w-60 w-[75vw] overflow-hidden focus:outline-none focus:ring-0 focus-visible:outline-none origin-top transition duration-200 ease-in-out data-closed:scale-95 data-closed:opacity-0 mx-auto"
              >
                <MenuItem>
                  {({ close }) => (
                    <HeaderApiKeyInput
                      onSave={(key: string) => {
                        console.log("API Key:", key);
                        setApiKey(key);
                        close();
                      }}
                    />
                  )}
                </MenuItem>
              </MenuItems>
            </Menu>
          ) : null}
          {/* Model selector */}
          <ModelSelector
            onModelChange={handleModelChange}
            hasApiKey={apiKey?.length > 0}
          />
          {/* Language selector */}
          <Menu>
            <MenuButton
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center justify-center  gap-2 text-sm md:w-full w-[75vw] text-text hover:text-white bg-primary/20 border-2 border-border hover:border-primary hover:bg-primary rounded-lg px-4! py-2! transition-colors focus:outline-none duration-250 focus:ring-0 focus-visible:outline-none"
            >
              {LANGUAGES.find((l) => l.code === language)?.label}
              <ChevronDown size={11} />
            </MenuButton>
            <MenuItems
              anchor={{ to: "bottom end", gap: "8px" }}
              transition
              className="p-2 bg-muted border border-border rounded-xl shadow-2xl z-30 md:w-32 w-[75vw] overflow-hidden focus:outline-none focus:ring-0 focus-visible:outline-none origin-top transition duration-200 ease-in-out data-closed:scale-95 data-closed:opacity-0"
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
      <button
        onClick={() => setIsHeaderOpen((prev) => !prev)}
        className="
    fixed top-0 right-4 z-50

    flex h-8 w-8 items-center justify-center

    rounded-b-lg
    border-x border-b border-border

    bg-primary text-text
    hover:bg-muted

    transition-all duration-300

    md:hidden
  "
      >
        <ChevronDown
          size={18}
          className={`
      transition-transform duration-300
      ${!isHeaderOpen ? "rotate-180" : ""}
    `}
        />
      </button>
    </div>
  );
};

export default MainHeader;
