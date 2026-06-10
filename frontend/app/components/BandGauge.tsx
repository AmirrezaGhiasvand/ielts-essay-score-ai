"use client";

import { useEffect, useState } from "react";

interface BandGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

function getBandColor(score: number): string {
  if (score >= 8)  return "#22C55E";
  if (score >= 7)  return "#3B82F6";
  if (score >= 6)  return "#F59E0B";
  if (score >= 5)  return "#F97316";
  return                  "#C8102E";
}

function getBandLabel(score: number): string {
  if (score >= 8.5) return "Expert";
  if (score >= 7.5) return "Very Good";
  if (score >= 6.5) return "Competent";
  if (score >= 5.5) return "Modest";
  if (score >= 4.5) return "Limited";
  return                   "Very Limited";
}

export default function BandGauge({ score, size = 160, label }: BandGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const steps     = 60;
    const increment = score / steps;
    let current     = 0;
    let step        = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, score);
      setAnimatedScore(parseFloat(current.toFixed(1)));
      if (step >= steps) clearInterval(timer);
    }, 1000 / steps);

    return () => clearInterval(timer);
  }, [score]);

  const radius      = size * 0.38;
  const strokeWidth = size * 0.07;
  const cx          = size / 2;
  const cy          = size / 2;
  const color       = getBandColor(score);
  const startAngle  = -220;
  const endAngle    = 40;
  const totalAngle  = endAngle - startAngle;
  const fillAngle   = (animatedScore / 9) * totalAngle;
  const currentAngle = startAngle + fillAngle;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function describeArc(start: number, end: number) {
    const s     = polarToCartesian(start);
    const e     = polarToCartesian(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* background track */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="#2A2D3A"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* animated fill */}
        {animatedScore > 0 && (
          <path
            d={describeArc(startAngle, currentAngle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ transition: "stroke 0.3s ease" }}
          />
        )}
        {/* score number */}
        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.24}
          fontWeight="700"
          fill={color}
          fontFamily="var(--font-geist-sans), system-ui"
        >
          {animatedScore.toFixed(1)}
        </text>
        {/* band label */}
        <text
          x={cx}
          y={cy + size * 0.18}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.09}
          fill="#64748B"
          fontFamily="var(--font-geist-sans), system-ui"
        >
          {getBandLabel(score)}
        </text>
      </svg>
      {label && (
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}