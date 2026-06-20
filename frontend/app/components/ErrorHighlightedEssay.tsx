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

// -------- Build precise non-overlapping segments --------
// Each segment gets the exact set of error types active in that character range

interface RawMatch {
  start: number;
  end: number;
  error: TextError;
}

// -------- Check if a match is a whole word/phrase boundary --------
// prevents "news" from matching inside "newspaper"

function isWordBoundary(essay: string, start: number, end: number): boolean {
  const before = start > 0 ? essay[start - 1] : " ";
  const after = end < essay.length ? essay[end] : " ";
  const wordCharRegex = /[a-zA-Z0-9'-]/;

  const beforeOk = !wordCharRegex.test(before);
  const afterOk = !wordCharRegex.test(after);

  return beforeOk && afterOk;
}

function buildSpans(essay: string, errors: TextError[]): Span[] {
  const matches: RawMatch[] = [];

  for (const error of errors) {
    if (!error.original) continue;
    let searchFrom = 0;
    while (true) {
      const idx = essay.indexOf(error.original, searchFrom);
      if (idx === -1) break;

      const end = idx + error.original.length;
      // only accept matches that are at actual word boundaries
      if (isWordBoundary(essay, idx, end)) {
        matches.push({ start: idx, end, error });
      }
      searchFrom = idx + error.original.length;
    }
  }

  if (matches.length === 0) return [];

  // collect all unique boundary points (starts and ends)
  const boundaries = new Set<number>();
  matches.forEach((m) => {
    boundaries.add(m.start);
    boundaries.add(m.end);
  });
  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  // build a segment between each pair of consecutive boundaries
  const segments: Span[] = [];
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const segStart = sortedBoundaries[i];
    const segEnd = sortedBoundaries[i + 1];

    // find which errors are active during this segment
    const activeErrors = matches
      .filter((m) => m.start <= segStart && m.end >= segEnd)
      .map((m) => m.error);

    if (activeErrors.length > 0) {
      segments.push({ start: segStart, end: segEnd, errors: activeErrors });
    }
  }

  // merge adjacent segments that have the exact same set of error types
  // (avoids splitting "technology" into letter-by-letter spans unnecessarily)
  const merged: Span[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    const sameTypes =
      last &&
      last.end === seg.start &&
      last.errors.length === seg.errors.length &&
      last.errors.every((e, idx) => e === seg.errors[idx]);

    if (sameTypes) {
      last.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

export default function ErrorHighlightedEssay({
  essay,
  errors,
}: ErrorHighlightedEssayProps) {
  const [hoveredSpanIndex, setHoveredSpanIndex] = useState<number | null>(null);
  const spans = buildSpans(essay, errors);
  console.log(
    "DEBUG spans:",
    spans.map((s) => ({
      text: essay.slice(s.start, s.end),
      types: s.errors.map((e) => e.error_type),
    })),
  );

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
    // determine if this segment shares any error with the currently hovered segment
    const hoveredSpan =
      hoveredSpanIndex !== null ? spans[hoveredSpanIndex] : null;
    const isActive =
      hoveredSpan !== null &&
      span.errors.some((e) => hoveredSpan.errors.includes(e));
    const bgColor = ERROR_BG[uniqueTypes[0]] ?? "bg-slate-400/10";

    parts.push(
      <span
        key={i}
        className={`relative inline-block cursor-pointer rounded-sm transition-colors duration-150 ${isActive ? bgColor : ""}`}
        onMouseEnter={() => setHoveredSpanIndex(i)}
        onMouseLeave={() => setHoveredSpanIndex(null)}
      >
        <span className="relative">
          {essay.slice(span.start, span.end)}
          {uniqueTypes.map((type, idx) => (
            <span
              key={type}
              className="absolute left-0 right-0 h-[2px] rounded-full pointer-events-none"
              style={{
                backgroundColor: UNDERLINE_COLORS[type] ?? "#94A3B8",
                bottom: `${-4 - idx * 4}px`,
              }}
            />
          ))}
        </span>

        {hoveredSpanIndex === i && (
          <span className="absolute bottom-full mb-3 w-72 max-w-[90vw] bg-foreground border border-border rounded-lg p-3 shadow-2xl z-50 text-xs normal-case left-1/2 -translate-x-1/2">
            {span.errors.map((err, ei) => (
              <div
                key={ei}
                className={ei > 0 ? "mt-2 pt-2 border-t border-border" : ""}
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
                  <span className="font-semibold text-text uppercase tracking-wide text-[10px]">
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
                <p className="text-text/60 mt-1">{err.explanation}</p>
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
