type Variant = "primary" | "success" | "warning" | "danger" | "neutral";

const STYLES: Record<Variant, string> = {
  primary: "bg-primary-light text-primary-dark",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
  neutral: "bg-black/5 text-muted",
};

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[variant]} ${className}`}>
      {children}
    </span>
  );
}
