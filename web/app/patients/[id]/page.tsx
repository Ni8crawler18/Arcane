"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, FileText, Search, ShieldAlert, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import type { AgentLogEntry, Note, Patient } from "@/lib/types";

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const router = useRouter();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activity, setActivity] = useState<AgentLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [newNote, setNewNote] = useState("");
  const [dueInDays, setDueInDays] = useState(7);
  const [savingNote, setSavingNote] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  const loadNotes = useCallback(
    (docId: string, q?: string) => {
      const url = q
        ? `/api/patients/${patientId}/notes?doctorId=${docId}&q=${encodeURIComponent(q)}`
        : `/api/patients/${patientId}/notes?doctorId=${docId}`;
      fetch(url).then((r) => r.json()).then(setNotes);
    },
    [patientId]
  );

  const loadActivity = useCallback(() => {
    fetch(`/api/patients/${patientId}/activity`).then((r) => r.json()).then(setActivity);
  }, [patientId]);

  useEffect(() => {
    const docId = localStorage.getItem("oncofollow_doctor_id");
    if (!docId) {
      router.push("/");
      return;
    }
    setDoctorId(docId);
    fetch(`/api/patients/${patientId}?doctorId=${docId}`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) {
        setDenied(data.error);
        return;
      }
      setPatient(data);
      loadNotes(docId);
      loadActivity();
    });
  }, [patientId, loadNotes, loadActivity, router]);

  async function addNote() {
    if (!doctorId || !newNote.trim()) return;
    setSavingNote(true);
    await fetch(`/api/patients/${patientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, text: newNote }),
    });
    setNewNote("");
    setSavingNote(false);
    loadNotes(doctorId);
  }

  async function scheduleFollowUp() {
    if (!doctorId) return;
    setScheduling(true);
    await fetch(`/api/patients/${patientId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, dueInDays, urgency: dueInDays <= 0 ? "urgent" : "routine" }),
    });
    setScheduling(false);
    setScheduleMsg(
      dueInDays <= 0
        ? "Scheduled - due now. Run it from the dashboard's \"Check due follow-ups\"."
        : `Scheduled - due in ${dueInDays} day(s).`
    );
  }

  if (denied) {
    return (
      <AppShell title="Access denied">
        <div className="mx-auto max-w-lg rounded-2xl border border-danger/30 bg-danger-light p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 text-danger" size={32} />
          <p className="text-sm font-semibold uppercase tracking-wide text-danger">Cedar: DENIED</p>
          <p className="mt-2 text-text">{denied}</p>
          <p className="mt-4 text-sm text-muted">
            This patient belongs to a different doctor - access is enforced by policy, not by what the URL happens to be.
          </p>
        </div>
      </AppShell>
    );
  }

  if (!patient) return <AppShell title="Loading...">{null}</AppShell>;

  return (
    <AppShell title={patient.name} subtitle={`${patient.cancerType} · ${patient.stage}`}>
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface shadow-sm p-5">
        <Avatar name={patient.name} size={56} />
        <div>
          <div className="text-lg font-bold text-text">{patient.name}</div>
          <div className="text-sm text-muted">{patient.contact}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-surface shadow-sm p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-text">
                <FileText size={17} className="text-primary" /> Note history
              </h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="rounded-md border border-border py-1.5 pl-7 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={() => doctorId && loadNotes(doctorId, query)}
                  className="rounded-md bg-primary-light px-3 py-1.5 text-sm font-medium text-primary-dark"
                >
                  Search
                </button>
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      doctorId && loadNotes(doctorId);
                    }}
                    className="text-sm text-muted hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <ul className="space-y-4">
              {notes.map((n) => (
                <li key={n.id} className="border-l-2 border-primary-light pl-3 text-sm">
                  <div className="text-xs font-medium text-muted">{new Date(n.createdAt).toLocaleDateString()}</div>
                  <div className="text-text">{n.text}</div>
                </li>
              ))}
              {notes.length === 0 && <p className="text-sm text-muted">No matching notes.</p>}
            </ul>
            <div className="mt-4 flex gap-2 border-t border-border pt-4">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note after this consultation..."
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={addNote}
                disabled={savingNote}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark hover:shadow active:scale-[0.98] disabled:opacity-50"
              >
                {savingNote ? "Saving..." : "Save"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface shadow-sm p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-text">
              <CalendarPlus size={17} className="text-primary" /> Schedule a follow-up
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-muted">Check back in</label>
              <input
                type="number"
                value={dueInDays}
                onChange={(e) => setDueInDays(Number(e.target.value))}
                className="w-20 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
              />
              <span className="text-sm text-muted">day(s) &middot; 0 = today</span>
              <button
                onClick={scheduleFollowUp}
                disabled={scheduling}
                className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark hover:shadow active:scale-[0.98] disabled:opacity-50"
              >
                {scheduling ? "Scheduling..." : "Schedule"}
              </button>
            </div>
            {scheduleMsg && <p className="mt-3 text-xs text-muted">{scheduleMsg}</p>}
          </section>
        </div>

        <aside className="rounded-2xl border border-border bg-surface shadow-sm p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-text">
            <Sparkles size={16} className="text-primary" /> Agent activity
          </h2>
          <p className="mb-4 text-xs text-muted">Every action the follow-up agent takes here, Cedar-checked.</p>
          <ul className="space-y-4">
            {activity.map((a) => (
              <li key={a.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={a.decision === "ALLOWED" ? "success" : "danger"}>{a.decision}</Badge>
                  <span className="font-mono text-xs text-muted">{a.action}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-text">{a.detail}</p>
              </li>
            ))}
            {activity.length === 0 && (
              <p className="text-xs text-muted">No agent activity yet - run &ldquo;Check due follow-ups&rdquo; from the dashboard.</p>
            )}
          </ul>
        </aside>
      </div>
    </AppShell>
  );
}
