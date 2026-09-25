import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS = 8;

export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId");
  if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });

  const store = getStore();
  const patientIds = new Set(store.patients.filter((p) => p.doctorId === doctorId).map((p) => p.id));

  const now = Date.now();

  const buckets = Array.from({ length: WEEKS }, (_, i) => {
    const start = now - (WEEKS - i) * WEEK_MS;
    const end = start + WEEK_MS;
    return { start, end, notes: 0, followUps: 0 };
  });

  for (const n of store.notes) {
    if (!patientIds.has(n.patientId)) continue;
    const t = new Date(n.createdAt).getTime();
    const b = buckets.find((b) => t >= b.start && t < b.end);
    if (b) b.notes += 1;
  }
  for (const f of store.followUps) {
    if (!patientIds.has(f.patientId)) continue;
    const t = new Date(f.createdAt).getTime();
    const b = buckets.find((b) => t >= b.start && t < b.end);
    if (b) b.followUps += 1;
  }

  return NextResponse.json(
    buckets.map((b) => ({
      label: new Date(b.start).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      notes: b.notes,
      followUps: b.followUps,
    }))
  );
}
