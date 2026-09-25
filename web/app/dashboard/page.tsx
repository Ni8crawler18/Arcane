"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, ChevronRight, Search, Sparkles, UserPlus, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import AddPatientModal from "@/components/AddPatientModal";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import BarChart from "@/components/ui/BarChart";
import QuickAction from "@/components/ui/QuickAction";
import Skeleton from "@/components/ui/Skeleton";
import StatCard from "@/components/ui/StatCard";
import type { FollowUp, Patient } from "@/lib/types";

type PatientRow = Patient & { followUp: FollowUp | null; noteCount: number };
type WeekPoint = { label: string; notes: number; followUps: number };

function dueBadge(followUp: FollowUp | null) {
  if (!followUp) return <Badge variant="neutral">No follow-up</Badge>;
  const days = Math.round((new Date(followUp.dueAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge variant="danger">Overdue {Math.abs(days)}d</Badge>;
  if (days === 0) return <Badge variant="danger">Due today</Badge>;
  if (days <= 7) return <Badge variant="warning">Due in {days}d</Badge>;
  return <Badge variant="success">Due in {days}d</Badge>;
}

function firstName(full: string | null) {
  return full ? full.replace(/^Dr\.\s*/, "").split(" ")[0] : "";
}

function DashboardContent() {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientRow[] | null>(null);
  const [weekly, setWeekly] = useState<WeekPoint[]>([]);
  const [processing, setProcessing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").toLowerCase();
  const filter = searchParams.get("filter");

  const load = useCallback((docId: string) => {
    fetch(`/api/patients?doctorId=${docId}`).then((r) => r.json()).then(setPatients);
    fetch(`/api/activity/weekly?doctorId=${docId}`).then((r) => r.json()).then(setWeekly);
  }, []);

  useEffect(() => {
    const docId = localStorage.getItem("oncofollow_doctor_id");
    if (!docId) return;
    setDoctorId(docId);
    setDoctorName(localStorage.getItem("oncofollow_doctor_name"));
    load(docId);
  }, [load]);

  async function processDueFollowUps() {
    if (!doctorId) return;
    setProcessing(true);
    setBanner(null);
    const res = await fetch("/api/followups/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId }),
    });
    const data = await res.json();
    setProcessing(false);
    setBanner(
      data.processed === 0
        ? "No follow-ups due right now."
        : `Sent ${data.processed} reminder(s) - see each patient's activity log.`
    );
    load(doctorId);
  }

  const stats = useMemo(() => {
    const list = patients ?? [];
    const overdue = list.filter((p) => p.followUp && new Date(p.followUp.dueAt).getTime() < Date.now()).length;
    const dueSoon = list.filter((p) => {
      if (!p.followUp) return false;
      const days = (new Date(p.followUp.dueAt).getTime() - Date.now()) / 86400000;
      return days >= 0 && days <= 7;
    }).length;
    const onTrack = list.length - overdue - dueSoon;
    return { total: list.length, overdue, dueSoon, onTrack };
  }, [patients]);

  const filtered = useMemo(() => {
    if (!patients) return [];
    let list = patients;
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.cancerType.toLowerCase().includes(q));
    if (filter === "overdue") {
      list = list.filter((p) => p.followUp && new Date(p.followUp.dueAt).getTime() < Date.now());
    }
    return list;
  }, [patients, q, filter]);

  return (
    <AppShell>
      <AddPatientModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => doctorId && load(doctorId)} />

      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Hello, {firstName(doctorName)}</h1>
          <p className="mt-1 text-muted">Here&rsquo;s who needs your attention today.</p>
        </div>
        <button
          onClick={processDueFollowUps}
          disabled={processing}
          className="flex items-center gap-2 rounded-full bg-text px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black active:scale-[0.98] disabled:opacity-50"
        >
          <Sparkles size={15} className={processing ? "animate-spin" : ""} />
          {processing ? "Running agent..." : "Check due follow-ups"}
        </button>
      </div>
      {banner && <p className="-mt-6 mb-6 text-sm text-muted">{banner}</p>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {patients === null ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Total patients" value={stats.total} icon={Users} />
            <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="danger" />
            <StatCard label="Due within 7 days" value={stats.dueSoon} icon={CalendarClock} tone="warning" />
            <StatCard label="On track" value={stats.onTrack} icon={Sparkles} tone="success" />
          </>
        )}
      </div>

      <div className="mb-8 grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-semibold text-text">Follow-up activity</h2>
            <span className="text-xs text-muted">Last 8 weeks</span>
          </div>
          <p className="mb-4 text-xs text-muted">Notes logged and follow-ups scheduled, across your patients.</p>
          <BarChart data={weekly} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <QuickAction label="Check due follow-ups" icon={Sparkles} onClick={processDueFollowUps} />
          <QuickAction label="Add a patient" icon={UserPlus} onClick={() => setAddOpen(true)} />
          <QuickAction label="Find a patient" icon={Search} onClick={() => router.push("/lookup")} />
          <QuickAction
            label="View overdue"
            icon={AlertTriangle}
            onClick={() => router.push("/dashboard?filter=overdue")}
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {filter === "overdue" ? "Overdue patients" : q ? `Results for "${q}"` : "All patients"}
        </h2>
        {(q || filter) && (
          <Link href="/dashboard" className="text-xs font-medium text-primary hover:underline">
            Clear filter
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-black/[0.015] text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Patient</th>
              <th className="px-5 py-3">Diagnosis</th>
              <th className="px-5 py-3">Notes</th>
              <th className="px-5 py-3">Next follow-up</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {patients === null &&
              [0, 1, 2].map((i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 w-28" /></div></td>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-5 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                  <td className="px-5 py-4" />
                </tr>
              ))}
            {filtered.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="border-b border-border last:border-0 transition-colors hover:bg-primary-light/30"
              >
                <td className="px-5 py-3">
                  <Link href={`/patients/${p.id}`} className="flex items-center gap-3">
                    <Avatar name={p.name} size={36} />
                    <span className="font-medium text-text">{p.name}</span>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <div className="text-text">{p.cancerType}</div>
                  <div className="text-xs text-muted">{p.stage}</div>
                </td>
                <td className="px-5 py-3 text-muted">{p.noteCount} note(s)</td>
                <td className="px-5 py-3">{dueBadge(p.followUp)}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/patients/${p.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:gap-1.5 hover:text-primary-dark"
                  >
                    View <ChevronRight size={15} />
                  </Link>
                </td>
              </motion.tr>
            ))}
            {patients !== null && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                  No patients match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
