"use client";

import { useEffect, useState } from "react";

type Segment = { label: string; value: number; color: string };

export default function DonutChart({
  segments,
  total,
  centerLabel,
}: {
  segments: Segment[];
  total: number;
  centerLabel: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;

  let offsetAcc = 0;
  const arcs = segments.map((seg) => {
    const fraction = seg.value / sum;
    const dash = fraction * circumference;
    const arc = { ...seg, dash, offset: offsetAcc };
    offsetAcc += dash;
    return arc;
  });

  return (
    <div className="flex items-center gap-8">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f4" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${mounted ? a.dash : 0} ${circumference}`}
            strokeDashoffset={-a.offset}
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)", transitionDelay: `${i * 90}ms` }}
          />
        ))}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90"
          style={{ transformOrigin: "center", fontSize: 30, fontWeight: 700, fill: "var(--text)" }}
        >
          {total}
        </text>
      </svg>
      <div className="space-y-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-muted">{s.label}</span>
            <span className="font-semibold text-text">{s.value}</span>
          </div>
        ))}
        <p className="pt-1 text-xs text-muted">{centerLabel}</p>
      </div>
    </div>
  );
}
