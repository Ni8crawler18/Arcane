"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [doctorName, setDoctorName] = useState<string | null>(null);

  useEffect(() => {
    setDoctorName(localStorage.getItem("oncofollow_doctor_name"));
  }, []);

  return (
    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-coral" />
          <span className="text-lg font-bold text-navy">OncoFollow</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-muted hover:text-navy">
            Patients
          </Link>
          <Link href="/lookup" className="text-muted hover:text-navy">
            Look up a patient
          </Link>
          {doctorName && (
            <>
              <span className="text-muted">
                Signed in as <span className="font-semibold text-navy">{doctorName}</span>
              </span>
              <Link href="/" className="text-teal hover:underline">
                Switch
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
