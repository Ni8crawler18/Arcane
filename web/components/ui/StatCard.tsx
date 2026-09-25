import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "neutral" | "danger" | "warning" | "success";
}) {
  const iconTone = {
    neutral: "text-muted",
    danger: "text-danger",
    warning: "text-warning",
    success: "text-success",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full border border-border ${iconTone}`}>
          <Icon size={15} />
        </div>
        <span className="text-sm font-medium text-muted">{label}</span>
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight text-text">{value}</div>
    </div>
  );
}
