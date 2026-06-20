"use client";

import { useEffect, useState } from "react";

export default function ApiKeyInput({
  onSave,
}: {
  onSave?: (key: string) => void;
}) {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("openrouter_key");
    if (saved) setApiKey(saved);
  }, []);

  function handleSave() {
    const key = apiKey.trim();
    if (!key) return;

    localStorage.setItem("openrouter_key", key);
    onSave?.(key);
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-3 p-4 rounded-xl border-2 border-border bg-primary/5">
      <label className="text-sm font-semibold text-text/70 uppercase tracking-widest">
        OpenRouter API Key
      </label>

      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-or-..."
        className="w-full rounded-lg border-2 border-border bg-background p-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
      />

      <button
        onClick={handleSave}
        disabled={!apiKey.trim()}
        className="w-full bg-primary/60 border-2 border-border hover:border-primary hover:bg-primary rounded-lg py-2 text-text font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Save API Key
      </button>
    </div>
  );
}
