import { NextRequest, NextResponse } from "next/server";
import { authorizeDoctor } from "@/lib/cedar";
import { getStore } from "@/lib/store";

/** The real Cedar-deny demo: any doctor can attempt to look up any patient
 * by ID (a referral, a covering colleague) - Cedar decides whether they
 * actually see them. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { doctorId, patientId } = body;
  if (!doctorId || !patientId) {
    return NextResponse.json({ error: "doctorId and patientId are required" }, { status: 400 });
  }

  const store = getStore();
  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) return NextResponse.json({ error: "no such patient", cedar: null }, { status: 404 });

  const decision = authorizeDoctor(doctorId, "view_patient", patient.id, patient.doctorId);
  if (!decision.allowed) {
    return NextResponse.json({ cedar: "DENIED", reason: decision.reason });
  }
  return NextResponse.json({ cedar: "ALLOWED", patient });
}
