"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import type { FollowUp, Patient } from "@/lib/types";

type PatientRow = Patient & { followUp: FollowUp | null; noteCount: number };

function dueLabel(followUp: FollowUp | null): { text: string; className: string } {
  if (!followUp) return { text: "No follow-up scheduled", className: "bg-black/5 text-muted" };
  const days = Math.round((new Date(followUp.dueAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Overdue by ${Math.abs(days)}d`, className: "bg-coral/10 text-coral" };
  if (days === 0) return { text: "Due today", className: "bg-coral/10 text-coral" };
  return { text: `Due in ${days}d`, className: "bg-teal-light text-teal" };
}

export default function DashboardPage() {
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback((docId: string) => {
    fetch(`/api/patients?doctorId=${docId}`)
      .then((r) => r.json())
      .then(setPatients);
  }, []);

  useEffect(() => {
    const docId = localStorage.getItem("oncofollow_doctor_id");
    if (!docId) {
      router.push("/");
      return;
    }
    setDoctorId(docId);
    load(docId);
  }, [load, router]);

  async function processDueFollowUps() {
    if (!doctorId) return;
    setProcessing(true);
    setLastRun(null);
    const res = await fetch("/api/followups/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId }),
    });
    const data = await res.json();
    setProcessing(false);
    setLastRun(
      data.processed === 0
        ? "No follow-ups due right now."
        : `Processed ${data.processed} follow-up(s) - see each patient's activity log.`
    );
    load(doctorId);
  }

  if (!doctorId) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">Your patients</h1>
            <p className="text-sm text-muted">Sorted by follow-up urgency - most overdue first.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={processDueFollowUps}
              disabled={processing}
              className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90 disabled:opacity-50"
            >
              {processing ? "Running guarded agent..." : "Check for due follow-ups (Cedar-guarded agent)"}
            </button>
            {lastRun && <p className="text-xs text-muted">{lastRun}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {patients.map((p) => {
            const due = dueLabel(p.followUp);
            return (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="block rounded-xl border border-black/10 bg-white p-5 transition hover:border-teal hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-navy">{p.name}</div>
                    <div className="text-sm text-muted">{p.cancerType}</div>
                    <div className="text-xs text-muted">{p.stage}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${due.className}`}>
                    {due.text}
                  </span>
                </div>
                <div className="mt-3 text-xs text-muted">{p.noteCount} note(s) on file</div>
              </Link>
            );
          })}
          {patients.length === 0 && <p className="text-sm text-muted">No patients yet.</p>}
        </div>
      </main>
    </div>
  );
}
