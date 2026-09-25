"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

type Result = { cedar: "ALLOWED" | "DENIED" | null; reason?: string; patient?: { name: string; contact: string; cancerType: string }; error?: string };

export default function LookupPage() {
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const docId = localStorage.getItem("oncofollow_doctor_id");
    if (!docId) {
      router.push("/");
      return;
    }
    setDoctorId(docId);
  }, [router]);

  async function lookup() {
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

  if (!doctorId) return null;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold text-navy">Look up a patient by ID</h1>
        <p className="mt-2 text-sm text-muted">
          A real reason this exists: someone hands you a patient ID - a referral, a covering
          colleague - and you look them up. Cedar decides whether you&rsquo;re actually allowed
          to see them, not the URL. Paste in one of your own patients&rsquo; IDs, or a different
          doctor&rsquo;s, from the dashboard.
        </p>

        <div className="mt-6 flex gap-2">
          <input
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="pat_xxxxxxxx"
            className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={lookup}
            disabled={loading}
            className="rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Checking..." : "Look up"}
          </button>
        </div>

        {result && (
          <div
            className={`mt-6 rounded-xl border p-5 ${
              result.cedar === "ALLOWED" ? "border-teal/30 bg-teal-light" : "border-coral/30 bg-coral/5"
            }`}
          >
            {result.cedar === "ALLOWED" && result.patient ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-wide text-teal">Cedar: ALLOWED</p>
                <p className="mt-2 font-semibold text-navy">{result.patient.name}</p>
                <p className="text-sm text-muted">{result.patient.cancerType} - {result.patient.contact}</p>
              </>
            ) : result.cedar === "DENIED" ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-wide text-coral">Cedar: DENIED</p>
                <p className="mt-2 text-navy">{result.reason}</p>
              </>
            ) : (
              <p className="text-sm text-muted">{result.error}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
