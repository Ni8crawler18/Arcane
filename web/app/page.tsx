"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, ChevronRight, ShieldCheck } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
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
    localStorage.setItem("oncofollow_doctor_specialty", doc.specialty);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary-dark p-12 text-white lg:flex">
        <div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full opacity-[0.15] blur-3xl"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <Activity size={20} />
          </div>
          <span className="text-lg font-bold">OncoFollow</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-md"
        >
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Never let a cancer patient&rsquo;s follow-up fall through the cracks.
          </h1>
          <p className="mt-4 text-white/70">
            Cedar-guarded, agent-assisted follow-up tracking for oncology teams -
            proactive prioritisation, not spreadsheets.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-white/60">
            <ShieldCheck size={16} />
            Every access to a patient record is policy-checked, not assumed.
          </div>
        </motion.div>
        <p className="relative text-xs text-white/40">Healthathon 2026</p>
      </div>

      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Activity size={18} />
              </div>
              <span className="text-lg font-bold text-text">OncoFollow</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-text">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Select your account to continue.</p>

          <div className="mt-6 space-y-2">
            {doctors.map((doc, i) => (
              <motion.button
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => selectDoctor(doc)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left shadow-sm transition-colors hover:border-primary hover:bg-primary-light/40"
              >
                <Avatar name={doc.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-text">{doc.name}</div>
                  <div className="truncate text-sm text-muted">{doc.specialty}</div>
                </div>
                <ChevronRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            ))}
            {doctors.length === 0 && <p className="text-sm text-muted">Loading accounts...</p>}
          </div>

          <p className="mt-8 text-center text-xs text-muted">
            This is a prototype - accounts are for demo purposes, no password required.
          </p>
        </div>
      </div>
    </div>
  );
}
