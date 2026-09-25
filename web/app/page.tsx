"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Doctor } from "@/lib/types";

export default function LoginPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then(setDoctors);
  }, []);

  function selectDoctor(doc: Doctor) {
    localStorage.setItem("oncofollow_doctor_id", doc.id);
    localStorage.setItem("oncofollow_doctor_name", doc.name);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
          <h1 className="text-4xl font-bold text-white">OncoFollow</h1>
          <p className="mt-2 text-sm text-teal-light/80">
            Proactive follow-up for cancer patients
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal">
            Who&rsquo;s using this?
          </p>
          <div className="space-y-3">
            {doctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => selectDoctor(doc)}
                className="w-full rounded-lg border border-black/10 px-4 py-3 text-left transition hover:border-teal hover:bg-teal-light"
              >
                <div className="font-semibold text-navy">{doc.name}</div>
                <div className="text-sm text-muted">{doc.specialty}</div>
              </button>
            ))}
            {doctors.length === 0 && <p className="text-sm text-muted">Loading...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
