"use client";

import { useState, useEffect } from "react";
import { Key, Check, X, Eye, EyeOff } from "lucide-react";

const STORAGE_KEY = "openrouter_api_key";

interface ApiKeyInputProps {
  onKeyChange: (key: string) => void;
}

export default function ApiKeyInput({ onKeyChange }: ApiKeyInputProps) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);

  // ---- Load saved key from localStorage on mount ----
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setKey(saved);
      onKeyChange(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
      onKeyChange(key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
      onKeyChange("");
    }
    setOpen(false);
  }

  function handleClear() {
    setKey("");
    localStorage.removeItem(STORAGE_KEY);
    onKeyChange("");
    setOpen(false);
  }

  const hasKey = key.trim().length > 0;

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 transition-colors ${
          hasKey
            ? "text-green-400 border-green-400/30 bg-green-400/5 hover:border-green-400/50"
            : "text-slate-300 hover:text-white bg-[#1A1D27] border-[#2A2D3A] hover:border-[#C8102E]"
        }`}
      >
        <Key size={13} />
        <span className="hidden sm:inline">
          {hasKey ? "API Key Set" : "Add API Key"}
        </span>
      </button>

      {open && (
        <div className="absolute end-0 top-10 bg-[#1A1D27] border border-[#2A2D3A] rounded-xl shadow-2xl z-30 w-80 p-4 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-1">
              OpenRouter API Key
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Use your own OpenRouter API key instead of the default. Stored
              only in your browser.
            </p>
          </div>

          <div className="relative">
            <input
              type={visible ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full rounded-lg bg-[#0F1117] border border-[#2A2D3A] px-3 py-2 pr-9 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors"
            />
            <button
              onClick={() => setVisible(!visible)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {visible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#C8102E] text-white rounded-lg py-2 text-xs font-medium hover:bg-[#A50E26] transition-colors"
            >
              <Check size={12} /> Save
            </button>
            {hasKey && (
              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-1.5 border border-[#2A2D3A] text-slate-400 hover:text-slate-200 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-600">
            Get a free key at{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C8102E] hover:underline"
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
