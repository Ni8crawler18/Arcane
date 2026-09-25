"use client";

import { useEffect, useState } from "react";

type Point = { label: string; notes: number; followUps: number };

export default function BarChart({ data }: { data: Point[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(1, ...data.map((d) => d.notes + d.followUps));

  return (
    <div>
      <div className="flex items-end gap-3" style={{ height: 160 }}>
        {data.map((d, i) => {
          const notesH = (d.notes / max) * 100;
          const fuH = (d.followUps / max) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-[140px] w-full flex-col-reverse items-stretch overflow-hidden rounded-lg bg-black/[0.03]">
                <div
                  className="w-full rounded-t-sm bg-primary/25 transition-[height] duration-700 ease-out"
                  style={{ height: mounted ? `${notesH}%` : 0, transitionDelay: `${i * 40}ms` }}
                />
                <div
                  className="w-full bg-primary transition-[height] duration-700 ease-out"
                  style={{ height: mounted ? `${fuH}%` : 0, transitionDelay: `${i * 40 + 60}ms` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Follow-ups scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary/25" /> Notes logged
        </span>
      </div>
    </div>
  );
}
