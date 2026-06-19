import { FaGithub } from "react-icons/fa";
import ModelSelector from "./components/ModelSelector";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { Language, LanguageOption } from "./types";

type MainHeaderType = {
  title: string;
  subtitle: string;
  langOpen: boolean;
  language: Language;
  LANGUAGES: LanguageOption[];
  setLangOpen: Dispatch<SetStateAction<boolean>>;
  setLanguage: Dispatch<SetStateAction<Language>>;
  handleModelChange: (provider: string, modelId: string) => void;
};

const MainHeader = ({
  title,
  subtitle,
  language,
  langOpen,
  handleModelChange,
  setLangOpen,
  setLanguage,
  LANGUAGES,
}: MainHeaderType) => {
  return (
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
          <h1 className="text-md font-semibold text-slate-100">{title}</h1>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* ---- Controls ---- */}
      <div className="flex items-center gap-4">
        <ModelSelector onModelChange={handleModelChange} />
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
  );
};

export default MainHeader;
