"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Search } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

type DueItem = { followUpId: string; patientId: string; patientName: string; dueAt: string };

export default function TopBar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [due, setDue] = useState<DueItem[]>([]);
  const [open, setOpen] = useState(false);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const docId = localStorage.getItem("oncofollow_doctor_id");
    setDoctorName(localStorage.getItem("oncofollow_doctor_name"));
    if (!docId) return;
    fetch(`/api/followups/due?doctorId=${docId}`)
      .then((r) => r.json())
      .then(setDue);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/dashboard?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-4">
      <div>
        {title && <h1 className="text-xl font-bold text-text">{title}</h1>}
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <form onSubmit={submitSearch} className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients..."
            className="w-64 rounded-lg border border-border bg-bg py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
          />
        </form>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary/40 hover:text-text"
          >
            <Bell size={17} />
            {due.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white ring-2 ring-surface">
                {due.length}
              </span>
            )}
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-xl border border-border bg-surface shadow-lg"
              >
                <div className="border-b border-border px-4 py-3 text-sm font-semibold text-text">
                  {due.length === 0 ? "No follow-ups due" : `${due.length} follow-up(s) due`}
                </div>
                <ul className="max-h-72 overflow-y-auto">
                  {due.map((d) => (
                    <li key={d.followUpId}>
                      <button
                        onClick={() => {
                          setOpen(false);
                          router.push(`/patients/${d.patientId}`);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-primary-light/40"
                      >
                        <div className="font-medium text-text">{d.patientName}</div>
                        <div className="text-xs text-muted">Due {new Date(d.dueAt).toLocaleDateString()}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {doctorName && <Avatar name={doctorName} size={36} />}
      </div>
    </header>
  );
}
