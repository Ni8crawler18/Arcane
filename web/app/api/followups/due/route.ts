import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId");
  if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });

  const store = getStore();
  const now = Date.now();
  const due = store.followUps
    .filter((f) => f.doctorId === doctorId && f.status === "pending" && new Date(f.dueAt).getTime() <= now)
    .map((f) => {
      const patient = store.patients.find((p) => p.id === f.patientId);
      return { followUpId: f.id, patientId: f.patientId, patientName: patient?.name ?? "Unknown", dueAt: f.dueAt };
    });

  return NextResponse.json(due);
}
