"use client";

import { useState } from "react";
import { TextError } from "@/app/types";

interface ErrorHighlightedEssayProps {
  essay: string;
  errors: TextError[];
}

interface Span {
  start: number;
  end: number;
  errors: TextError[];
}

// -------- Color per error type --------

const ERROR_BG: Record<string, string> = {
  grammar: "bg-orange-400/10",
  spelling: "bg-red-400/10",
  repetition: "bg-stone-400/10",
};

const UNDERLINE_COLORS: Record<string, string> = {
  grammar: "#FB923C",
  spelling: "#F87171",
  repetition: "#A8A29E",
};

// -------- Find all match spans for each error, then merge overlaps --------

function buildSpans(essay: string, errors: TextError[]): Span[] {
  const rawSpans: Span[] = [];

  for (const error of errors) {
    if (!error.original) continue;
    let searchFrom = 0;
    while (true) {
      const idx = essay.indexOf(error.original, searchFrom);
      if (idx === -1) break;
      rawSpans.push({
        start: idx,
        end: idx + error.original.length,
        errors: [error],
      });
      searchFrom = idx + error.original.length;
    }
  }

  if (rawSpans.length === 0) return [];

  rawSpans.sort((a, b) => a.start - b.start);

  const merged: Span[] = [rawSpans[0]];
  for (let i = 1; i < rawSpans.length; i++) {
    const current = rawSpans[i];
    const last = merged[merged.length - 1];

    if (current.start < last.end) {
      last.end = Math.max(last.end, current.end);
      last.errors = [...last.errors, ...current.errors];
    } else {
      merged.push(current);
    }
  }

  return merged;
}

export default function ErrorHighlightedEssay({
  essay,
  errors,
}: ErrorHighlightedEssayProps) {
  const [activeSpan, setActiveSpan] = useState<number | null>(null);
  const spans = buildSpans(essay, errors);

  if (spans.length === 0) {
    return <p className="whitespace-pre-wrap leading-relaxed">{essay}</p>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  spans.forEach((span, i) => {
    if (span.start > cursor) {
      parts.push(essay.slice(cursor, span.start));
    }

    const uniqueTypes = Array.from(
      new Set(span.errors.map((e) => e.error_type)),
    );
    const isActive = activeSpan === i;
    const bgColor = ERROR_BG[uniqueTypes[0]] ?? "bg-slate-400/10";

    parts.push(
      <span
        key={i}
        className={`relative inline-block cursor-pointer rounded-sm transition-colors duration-150 ${isActive ? bgColor : ""}`}
        onMouseEnter={() => setActiveSpan(i)}
        onMouseLeave={() => setActiveSpan(null)}
      >
        <span className="relative">
          {essay.slice(span.start, span.end)}
          {uniqueTypes.map((type, idx) => (
            <span
              key={type}
              className="absolute left-0 right-0 h-[2px] rounded-full"
              style={{
                backgroundColor: UNDERLINE_COLORS[type] ?? "#94A3B8",
                bottom: `${-4 - idx * 4}px`,
              }}
            />
          ))}
        </span>

        {activeSpan === i && (
          <span className="absolute bottom-full left-0 mb-3 w-72 bg-[#1A1D27] border border-[#2A2D3A] rounded-lg p-3 shadow-2xl z-50 text-xs normal-case">
            {span.errors.map((err, ei) => (
              <div
                key={ei}
                className={ei > 0 ? "mt-2 pt-2 border-t border-[#2A2D3A]" : ""}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      err.error_type === "grammar"
                        ? "bg-orange-400"
                        : err.error_type === "spelling"
                          ? "bg-red-400"
                          : "bg-stone-400"
                    }`}
                  />
                  <span className="font-semibold text-slate-300 uppercase tracking-wide text-[10px]">
                    {err.error_type}
                  </span>
                </div>
                <p className="text-slate-400">
                  <span className="text-red-400 line-through">
                    {err.original}
                  </span>
                  {" → "}
                  <span className="text-green-400">{err.correction}</span>
                </p>
                <p className="text-slate-500 mt-1">{err.explanation}</p>
              </div>
            ))}
          </span>
        )}
      </span>,
    );

    cursor = span.end;
  });

  if (cursor < essay.length) {
    parts.push(essay.slice(cursor));
  }

  return (
    <p className="whitespace-pre-wrap leading-[2.4]" dir="ltr">
      {parts}
    </p>
  );
}
