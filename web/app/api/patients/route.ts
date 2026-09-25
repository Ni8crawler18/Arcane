import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import type { FollowUp, Patient } from "@/lib/types";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

export async function GET(req: NextRequest) {
  const doctorId = req.nextUrl.searchParams.get("doctorId");
  if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });

  const store = getStore();
  const patients = store.patients.filter((p) => p.doctorId === doctorId);
  const withStatus = patients.map((p) => {
    const followUp = store.followUps.find((f) => f.patientId === p.id && f.status === "pending");
    const noteCount = store.notes.filter((n) => n.patientId === p.id).length;
    return { ...p, followUp: followUp ?? null, noteCount };
  });
  withStatus.sort((a, b) => {
    const at = a.followUp ? new Date(a.followUp.dueAt).getTime() : Infinity;
    const bt = b.followUp ? new Date(b.followUp.dueAt).getTime() : Infinity;
    return at - bt;
  });
  return NextResponse.json(withStatus);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { doctorId, name, contact, cancerType, stage } = body;
  if (!doctorId || !name || !contact) {
    return NextResponse.json({ error: "doctorId, name, and contact are required" }, { status: 400 });
  }
  const store = getStore();
  const patient: Patient = {
    id: id("pat"),
    doctorId,
    name,
    contact,
    cancerType: cancerType || "Not specified",
    stage: stage || "Not specified",
    createdAt: new Date().toISOString(),
  };
  store.patients.push(patient);
  return NextResponse.json(patient, { status: 201 });
}
