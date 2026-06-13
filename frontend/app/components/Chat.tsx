"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { ChatMessage, ScoringResponse } from "@/app/types";
import { sendChatMessage } from "@/app/lib/api";

interface ChatProps {
  essay:         string;
  scoringResult: ScoringResponse;
  language:      string;
  placeholder:   string;
  sendLabel:     string;
  title:         string;
  provider:      string;
  model:         string;
}
export default function Chat({
  essay,
  scoringResult,
  language,
  placeholder,
  sendLabel,
  title,
  provider,
  model,
}: ChatProps) {
  const [history,  setHistory]  = useState<ChatMessage[]>([]);
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function handleSend() {
    if (!message.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: message.trim() };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setMessage("");
    setLoading(true);

    try {
      const response = await sendChatMessage({
        essay,
        scoring_result: scoringResult,
        history:        newHistory,
        message:        userMessage.content,
        language,
        provider,
        model,
      });
      setHistory([...newHistory, { role: "assistant", content: response.reply }]);
    } catch {
      setHistory([
        ...newHistory,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1A1D27] rounded-xl border border-[#2A2D3A] overflow-hidden">

      {/* ---- Header ---- */}
      <div className="px-4 py-3 border-b border-[#2A2D3A] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#C8102E]" />
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {title}
        </h3>
      </div>

      {/* ---- Messages ---- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {history.length === 0 && (
          <p className="text-xs text-slate-600 text-center mt-6">
            Ask a question about your score or how to improve.
          </p>
        )}
        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#C8102E] text-white rounded-br-none"
                  : "bg-[#0F1117] text-slate-300 rounded-bl-none border border-[#2A2D3A]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#0F1117] border border-[#2A2D3A] rounded-xl rounded-bl-none px-3 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ---- Input ---- */}
      <div className="px-3 py-3 border-t border-[#2A2D3A] flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none rounded-lg bg-[#0F1117] border border-[#2A2D3A] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || loading}
          className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#C8102E] text-white flex items-center justify-center hover:bg-[#A50E26] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} />
        </button>
      </div>

    </div>
  );
}