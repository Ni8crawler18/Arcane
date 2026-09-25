import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId");
  if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });

  const store = getStore();
  const patientIds = new Set(store.patients.filter((p) => p.doctorId === doctorId).map((p) => p.id));
  const entries = store.agentLog
    .filter((l) => patientIds.has(l.patientId))
    .slice(0, 6)
    .map((l) => ({ ...l, patientName: store.patients.find((p) => p.id === l.patientId)?.name ?? "Unknown" }));

  return NextResponse.json(entries);
}
