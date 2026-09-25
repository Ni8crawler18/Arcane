"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Search, CalendarClock, Users2, BarChart3, LogOut, Activity } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lookup", label: "Find a Patient", icon: Search },
];

const SOON = [
  { label: "Appointments", icon: CalendarClock },
  { label: "Staff", icon: Users2 },
  { label: "Reports", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<string | null>(null);

  useEffect(() => {
    setDoctorName(localStorage.getItem("oncofollow_doctor_name"));
    setSpecialty(localStorage.getItem("oncofollow_doctor_specialty"));
  }, []);

  function switchDoctor() {
    localStorage.removeItem("oncofollow_doctor_id");
    localStorage.removeItem("oncofollow_doctor_name");
    localStorage.removeItem("oncofollow_doctor_specialty");
    router.push("/");
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow-sm">
          <Activity size={18} />
        </div>
        <span className="text-lg font-bold tracking-tight text-text">OncoFollow</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/dashboard" && pathname?.startsWith("/patients"));
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active ? "bg-primary-light text-primary-dark" : "text-muted hover:bg-black/[0.035] hover:text-text"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon size={18} className="transition-transform duration-150 group-hover:scale-110" />
              {label}
            </Link>
          );
        })}

        <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted/60">
          Coming soon
        </div>
        {SOON.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted/40"
          >
            <Icon size={18} />
            {label}
          </div>
        ))}
      </nav>

      {doctorName && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={doctorName} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-text">{doctorName}</div>
              <div className="truncate text-xs text-muted">{specialty}</div>
            </div>
          </div>
          <button
            onClick={switchDoctor}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 hover:bg-black/[0.035] hover:text-text"
          >
            <LogOut size={16} />
            Switch doctor
          </button>
        </div>
      )}
    </aside>
  );
}
