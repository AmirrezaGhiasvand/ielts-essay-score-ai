"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Monitor, Cloud, Loader2 } from "lucide-react";
import { getModels, ModelOption, ModelsResponse } from "@/app/lib/api";

interface ModelSelectorProps {
  onModelChange: (provider: string, modelId: string) => void;
}

export default function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [models,   setModels]   = useState<ModelsResponse | null>(null);
  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState<ModelOption | null>(null);
  const [loading,  setLoading]  = useState(true);

  // ---- Fetch models on mount ----
  useEffect(() => {
    async function fetchModels() {
      try {
        const data = await getModels();
        setModels(data);

        // set current model as selected
        const allModels = [...data.ollama_models, ...data.cloud_models];
        const current   = allModels.find(
          (m) => m.id === data.current_model && m.provider === data.current_provider
        );
        if (current) setSelected(current);
      } catch {
        console.error("Failed to fetch models");
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  function handleSelect(model: ModelOption) {
    setSelected(model);
    setOpen(false);
    onModelChange(model.provider, model.id);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600 border border-[#2A2D3A] rounded-lg px-3 py-2">
        <Loader2 size={11} className="animate-spin" />
        <span>Loading models...</span>
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-[#1A1D27] border border-[#2A2D3A] hover:border-[#C8102E] rounded-lg px-3 py-2 transition-colors"
      >
        {selected?.provider === "ollama" ? (
          <Monitor size={13} className="text-slate-400" />
        ) : (
          <Cloud size={13} className="text-slate-400" />
        )}
        <span className="max-w-[140px] truncate">{selected?.name ?? "Select model"}</span>
        <ChevronDown size={11} />
      </button>

      {open && models && (
        <div className="absolute end-0 top-10 bg-[#1A1D27] border border-[#2A2D3A] rounded-xl shadow-2xl z-30 w-64 overflow-hidden">

          {/* ---- Local models ---- */}
          {models.ollama_models.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-[#2A2D3A] flex items-center gap-2">
                <Monitor size={11} className="text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Local — Ollama
                </span>
              </div>
              {models.ollama_models
                // filter out embedding models
                .filter((m) => !m.id.includes("embed") && !m.id.includes("cloud"))
                .map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model)}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${
                      selected?.id === model.id && selected?.provider === "ollama"
                        ? "text-[#C8102E] bg-[#C8102E]/10 font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-[#0F1117]"
                    }`}
                  >
                    {model.name}
                  </button>
                ))}
            </>
          )}

          {/* ---- Cloud models ---- */}
          {models.cloud_models.length > 0 && (
            <>
              <div className="px-3 py-2 border-t border-b border-[#2A2D3A] flex items-center gap-2">
                <Cloud size={11} className="text-slate-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Cloud
                </span>
              </div>
              {models.cloud_models.map((model) => (
                <button
                  key={`${model.provider}-${model.id}`}
                  onClick={() => handleSelect(model)}
                  className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    selected?.id === model.id && selected?.provider === model.provider
                      ? "text-[#C8102E] bg-[#C8102E]/10 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-[#0F1117]"
                  }`}
                >
                  <span>{model.name}</span>
                  <span className="text-[9px] text-slate-600 uppercase">{model.provider}</span>
                </button>
              ))}
            </>
          )}

        </div>
      )}
    </div>
  );
}