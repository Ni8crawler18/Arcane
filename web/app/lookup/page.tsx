"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/ui/Avatar";

type Result = {
  cedar: "ALLOWED" | "DENIED" | null;
  reason?: string;
  patient?: { name: string; contact: string; cancerType: string };
  error?: string;
};

export default function LookupPage() {
  const [patientId, setPatientId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    const doctorId = localStorage.getItem("oncofollow_doctor_id");
    if (!doctorId || !patientId.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, patientId: patientId.trim() }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <AppShell title="Find a Patient" subtitle="Look up any patient by ID - Cedar decides what you can see">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-border bg-surface shadow-sm p-6">
          <p className="text-sm text-muted">
            A real reason this exists: someone hands you a patient ID - a referral, a covering
            colleague - and you look them up. Cedar decides whether you&rsquo;re actually allowed
            to see them, not the URL.
          </p>

          <div className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookup()}
                placeholder="pat_xxxxxxxx"
                className="w-full rounded-lg border border-border py-2.5 pl-9 pr-3 text-sm font-mono outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={lookup}
              disabled={loading}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark hover:shadow active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Checking..." : "Look up"}
            </button>
          </div>
        </div>

        {result && (
          <div
            className={`mt-5 rounded-2xl border p-5 ${
              result.cedar === "ALLOWED" ? "border-success/30 bg-success-light" : "border-danger/30 bg-danger-light"
            }`}
          >
            {result.cedar === "ALLOWED" && result.patient ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={20} />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-success">Cedar: ALLOWED</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Avatar name={result.patient.name} size={36} />
                    <div>
                      <p className="font-semibold text-text">{result.patient.name}</p>
                      <p className="text-sm text-muted">
                        {result.patient.cancerType} &middot; {result.patient.contact}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : result.cedar === "DENIED" ? (
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 shrink-0 text-danger" size={20} />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-danger">Cedar: DENIED</p>
                  <p className="mt-1 text-text">{result.reason}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">{result.error}</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
