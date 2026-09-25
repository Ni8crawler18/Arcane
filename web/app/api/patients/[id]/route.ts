import { NextRequest, NextResponse } from "next/server";
import { authorizeDoctor } from "@/lib/cedar";
import { getStore } from "@/lib/store";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const doctorId = req.nextUrl.searchParams.get("doctorId");
  if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });

  const store = getStore();
  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 404 });

  const decision = authorizeDoctor(doctorId, "view_patient", patient.id, patient.doctorId);
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason, cedar: "DENIED" }, { status: 403 });
  }

  return NextResponse.json({ ...patient, cedar: "ALLOWED" });
}
