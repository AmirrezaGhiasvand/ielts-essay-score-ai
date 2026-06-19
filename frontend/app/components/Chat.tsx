"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { ChatMessage, ScoringResponse } from "@/app/types";
import { sendChatMessageStream } from "@/app/lib/api";
import Markdown from "react-markdown";

interface ChatProps {
  essay: string;
  scoringResult: ScoringResponse;
  language: string;
  placeholder: string;
  sendLabel: string;
  title: string;
  provider: string;
  model: string;
  setChatActive: (value: boolean) => void;
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
  setChatActive,
}: ChatProps) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const revealQueueRef = useRef("");

  // ---- Gradually reveal queued characters for a smoother streaming feel ----
  useEffect(() => {
    const interval = setInterval(() => {
      if (revealQueueRef.current.length === 0) return;

      // reveal a few characters at a time for a natural typing speed
      const charsToReveal = revealQueueRef.current.slice(0, 3);
      revealQueueRef.current = revealQueueRef.current.slice(3);

      setHistory((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            role: "assistant",
            content: last.content + charsToReveal,
          };
        }
        return updated;
      });
    }, 15); // adjust this number to control speed — higher = slower

    return () => clearInterval(interval);
  }, []);

  async function handleSend() {
    if (!message.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: message.trim() };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setMessage("");
    setLoading(true);

    // add an empty assistant message that we'll fill in as chunks arrive
    setHistory([...newHistory, { role: "assistant", content: "" }]);

    try {
      let accumulated = "";

      await sendChatMessageStream(
        {
          essay,
          scoring_result: scoringResult,
          history: newHistory,
          message: userMessage.content,
          language,
          provider,
          model,
        },
        (chunk: string) => {
          accumulated += chunk;
          revealQueueRef.current += chunk;
        },
      );
    } catch {
      setHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        };
        return updated;
      });
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
    <div className="flex flex-col h-full bg-primary/5 rounded-xl border-2 border-border overflow-hidden">
      {/* ---- Header ---- */}
      <div className="px-4 py-3 border-b-2 bg-background border-border flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <h3 className="text-xs font-semibold text-text uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {/* ---- Messages ---- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {history.length === 0 && (
          <p className="text-md text-text/70 text-center mt-6">
            Ask a question about your score or how to improve.
          </p>
        )}
        {history.map((msg, i) => {
          if (msg.role === "assistant" && msg.content === "" && loading)
            return null;
          return (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-secondary text-text rounded-br-none"
                    : "bg-primary  text-text rounded-bl-none border border-border"
                }`}
              >
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dir="ltr"
                >
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            </div>
          );
        })}
        {loading && history[history.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="bg-background border border-border rounded-xl rounded-bl-none px-3 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-foreground/70 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-foreground/70 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-foreground/70 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* ---- Input ---- */}
      <div className="px-3 py-3 border-t-2 border-border flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none rounded-lg bg-background border-2 border-border px-3 py-2 text-sm text-text placeholder:text-text/50 focus:outline-none focus:ring-1 focus:ring-border focus:border-border transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || loading}
          className="shrink-0 w-9 h-9 rounded-lg bg-primary/70 text-text flex items-center justify-center hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
