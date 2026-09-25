import { NextRequest, NextResponse } from "next/server";
import { authorizeDoctor } from "@/lib/cedar";
import { getStore } from "@/lib/store";
import type { FollowUp } from "@/lib/types";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const body = await req.json();
  const { doctorId, dueInDays, urgency } = body;
  if (!doctorId || dueInDays === undefined) {
    return NextResponse.json({ error: "doctorId and dueInDays are required" }, { status: 400 });
  }

  const store = getStore();
  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 404 });

  const decision = authorizeDoctor(doctorId, "schedule_followup", patient.id, patient.doctorId);
  if (!decision.allowed) return NextResponse.json({ error: decision.reason }, { status: 403 });

  const due = new Date();
  due.setDate(due.getDate() + Number(dueInDays));

  const followUp: FollowUp = {
    id: id("fu"),
    patientId,
    doctorId,
    dueAt: due.toISOString(),
    urgency: urgency || "routine",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.followUps.push(followUp);
  return NextResponse.json(followUp, { status: 201 });
}
