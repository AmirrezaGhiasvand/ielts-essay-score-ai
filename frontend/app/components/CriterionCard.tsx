"use client";

import { CriterionScore } from "@/app/types";

interface CriterionCardProps {
  title:         string;
  data:          CriterionScore;
  feedbackLabel: string;
}

function getScoreColor(score: number): string {
  if (score >= 8)  return "text-green-400 bg-green-400/10 border-green-400/20";
  if (score >= 7)  return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  if (score >= 6)  return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  if (score >= 5)  return "text-orange-400 bg-orange-400/10 border-orange-400/20";
  return                  "text-red-400 bg-red-400/10 border-red-400/20";
}

function getBarColor(score: number): string {
  if (score >= 8)  return "bg-green-400";
  if (score >= 7)  return "bg-blue-400";
  if (score >= 6)  return "bg-amber-400";
  if (score >= 5)  return "bg-orange-400";
  return                  "bg-red-400";
}

export default function CriterionCard({ title, data, feedbackLabel }: CriterionCardProps) {
  const scoreColorClass = getScoreColor(data.score);
  const barColorClass   = getBarColor(data.score);
  const barWidth        = `${(data.score / 9) * 100}%`;

  return (
    <div className="bg-[#1A1D27] rounded-xl border border-[#2A2D3A] p-4 space-y-3 hover:border-[#3A3D4A] transition-colors">

      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
          {title}
        </span>
        <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${scoreColorClass}`}>
          {data.score.toFixed(1)}
        </span>
      </div>

      {/* ---- Progress bar ---- */}
      <div className="h-1 bg-[#2A2D3A] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${barColorClass}`}
          style={{ width: barWidth }}
        />
      </div>

      {/* ---- Feedback ---- */}
      <p className="text-xs text-slate-400 leading-relaxed">{data.feedback}</p>

    </div>
  );
}