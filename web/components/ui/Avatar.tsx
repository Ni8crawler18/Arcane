const PALETTE = [
  { bg: "#E6F6F4", fg: "#0B7A70" },
  { bg: "#EAF0FE", fg: "#3B5BDB" },
  { bg: "#FDECEA", fg: "#C0392B" },
  { bg: "#FEF3E2", fg: "#B45309" },
  { bg: "#F3E8FD", fg: "#7C3AED" },
  { bg: "#E9F8EE", fg: "#15803D" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { bg, fg } = PALETTE[hash(name) % PALETTE.length];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, backgroundColor: bg, color: fg, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
