"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
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

  const loadNotes = useCallback(
    (docId: string, q?: string) => {
      const url = q ? `/api/patients/${patientId}/notes?doctorId=${docId}&q=${encodeURIComponent(q)}` : `/api/patients/${patientId}/notes?doctorId=${docId}`;
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
    fetch(`/api/patients/${patientId}?doctorId=${docId}`)
      .then(async (r) => {
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
    await fetch(`/api/patients/${patientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, text: newNote }),
    });
    setNewNote("");
    loadNotes(doctorId);
  }

  async function scheduleFollowUp() {
    if (!doctorId) return;
    await fetch(`/api/patients/${patientId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, dueInDays, urgency: dueInDays <= 0 ? "urgent" : "routine" }),
    });
    alert(dueInDays <= 0 ? "Scheduled - it's due now. Run it from the dashboard." : `Scheduled - due in ${dueInDays} day(s).`);
  }

  if (denied) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <div className="rounded-xl border border-coral/30 bg-coral/5 p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-coral">Cedar: DENIED</p>
            <p className="mt-2 text-navy">{denied}</p>
            <p className="mt-4 text-sm text-muted">
              This patient belongs to a different doctor - access is enforced by policy, not by what the URL happens to be.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">{patient.name}</h1>
          <p className="text-sm text-muted">{patient.cancerType} - {patient.stage}</p>
          <p className="text-xs text-muted">{patient.contact}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-black/10 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-navy">Note history</h2>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="rounded-md border border-black/10 px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => doctorId && loadNotes(doctorId, query)}
                    className="rounded-md bg-teal-light px-3 py-1.5 text-sm font-medium text-teal"
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
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-teal-light pl-3 text-sm">
                    <div className="text-xs text-muted">{new Date(n.createdAt).toLocaleDateString()}</div>
                    <div className="text-navy">{n.text}</div>
                  </li>
                ))}
                {notes.length === 0 && <p className="text-sm text-muted">No matching notes.</p>}
              </ul>
              <div className="mt-4 flex gap-2">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note after this consultation..."
                  className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm"
                />
                <button onClick={addNote} className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-black/10 bg-white p-5">
              <h2 className="mb-3 font-semibold text-navy">Schedule a follow-up</h2>
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted">Check back in</label>
                <input
                  type="number"
                  value={dueInDays}
                  onChange={(e) => setDueInDays(Number(e.target.value))}
                  className="w-20 rounded-md border border-black/10 px-3 py-1.5 text-sm"
                />
                <span className="text-sm text-muted">day(s) (0 = today)</span>
                <button onClick={scheduleFollowUp} className="ml-auto rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white">
                  Schedule
                </button>
              </div>
            </section>
          </div>

          <aside className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="mb-1 font-semibold text-navy">Agent activity</h2>
            <p className="mb-3 text-xs text-muted">
              Every action the follow-up agent takes on this patient, Cedar-checked.
            </p>
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        a.decision === "ALLOWED" ? "bg-teal-light text-teal" : "bg-coral/10 text-coral"
                      }`}
                    >
                      {a.decision}
                    </span>
                    <span className="text-xs font-mono text-muted">{a.action}</span>
                  </div>
                  <p className="mt-1 text-xs text-navy">{a.detail}</p>
                </li>
              ))}
              {activity.length === 0 && (
                <p className="text-xs text-muted">No agent activity yet - run &ldquo;Check for due follow-ups&rdquo; from the dashboard.</p>
              )}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
