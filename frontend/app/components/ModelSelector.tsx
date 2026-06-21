"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Monitor, Cloud, Loader2 } from "lucide-react";
import { getModels, ModelOption, ModelsResponse } from "@/app/lib/api";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

interface ModelSelectorProps {
  onModelChange: (provider: string, modelId: string) => void;
  hasApiKey?: boolean;
}

export default function ModelSelector({
  onModelChange,
  hasApiKey = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ModelOption | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- Fetch models on mount ----
  useEffect(() => {
    if (hasApiKey) {
      async function fetchModels() {
        try {
          const data = await getModels();
          setModels(data);

          // set current model as selected
          const allModels = [...data.ollama_models, ...data.cloud_models];
          const current = allModels.find(
            (m) =>
              m.id === data.current_model &&
              m.provider === data.current_provider,
          );
          if (current) setSelected(current);
        } catch {
          console.error("Failed to fetch models");
        } finally {
          setLoading(false);
        }
      }
      fetchModels();
    }
  }, [hasApiKey]);

  function handleSelect(model: ModelOption) {
    setSelected(model);
    setOpen(false);
    onModelChange(model.provider, model.id);
  }

  if (loading) {
    return (
      <div className="flex px-4! py-2! items-center gap-2 text-sm text-text/60 border border-border rounded-lg">
        <Loader2 size={11} className="animate-spin" />
        <span>Loading models...</span>
      </div>
    );
  }

  return (
    <Menu>
      <MenuButton
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-text hover:text-white bg-primary/20 border-2 border-border hover:border-primary hover:bg-primary rounded-lg px-4! py-2! transition-colors focus:outline-none duration-250 focus:ring-0 focus-visible:outline-none"
      >
        {selected?.provider === "ollama" ? (
          <Monitor size={13} className="text-text" />
        ) : (
          <Cloud size={13} className="text-text" />
        )}
        <span className="max-w-35 truncate">
          {selected?.name ?? "Select model"}
        </span>
        <ChevronDown size={11} />
      </MenuButton>
      {models && (
        <MenuItems
          anchor={{ to: "bottom end", gap: "8px" }}
          transition
          className="p-2 bg-primary/10 border border-border rounded-xl shadow-2xl z-30 w-52 overflow-hidden focus:outline-none focus:ring-0 focus-visible:outline-none origin-top transition duration-200 ease-in-out data-closed:scale-95 data-closed:opacity-0"
        >
          {models && (
            <>
              {/* ---- Local models ---- */}
              {models.ollama_models.length > 0 && (
                <>
                  <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                    <Monitor size={11} className="text-text" />
                    <span className="text-[10px] font-semibold text-text uppercase tracking-wider">
                      Local — Ollama
                    </span>
                  </div>
                  {models.ollama_models
                    // filter out embedding models
                    .filter(
                      (m) => !m.id.includes("embed") && !m.id.includes("cloud"),
                    )
                    .map((model) => (
                      <MenuItem key={model.id}>
                        <button
                          key={model.id}
                          onClick={() => handleSelect(model)}
                          className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${
                            selected?.id === model.id &&
                            selected?.provider === "ollama"
                              ? "text-text bg-primary/60 font-semibold"
                              : "text-text/80 hover:text-text hover:bg-primary/60"
                          }`}
                        >
                          {model.name}
                        </button>
                      </MenuItem>
                    ))}
                </>
              )}

              {/* ---- Cloud models ---- */}
              {models.cloud_models.length > 0 && (
                <>
                  <div className="px-3 py-2 border-t border-b border-border flex items-center gap-2">
                    <Cloud size={11} className="text-text" />
                    <span className="text-[10px] font-semibold text-text uppercase tracking-wider">
                      Cloud
                    </span>
                  </div>
                  {models.cloud_models.map((model) => (
                    <MenuItem>
                      <button
                        key={`${model.provider}-${model.id}`}
                        onClick={() => handleSelect(model)}
                        className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between ${
                          selected?.id === model.id &&
                          selected?.provider === model.provider
                            ? "text-text bg-primary/60 font-semibold"
                            : "text-text/80 hover:text-text hover:bg-primary/60"
                        }`}
                      >
                        <span>{model.name}</span>
                        <span className="text-[9px] text-text/60 uppercase">
                          {model.provider}
                        </span>
                      </button>
                    </MenuItem>
                  ))}
                </>
              )}
            </>
          )}
        </MenuItems>
      )}
    </Menu>
  );
}
