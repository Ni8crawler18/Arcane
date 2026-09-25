import { NextRequest, NextResponse } from "next/server";
import { authorizeDoctor } from "@/lib/cedar";
import { getStore } from "@/lib/store";
import type { Note } from "@/lib/types";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2, 10)}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const doctorId = req.nextUrl.searchParams.get("doctorId");
  const query = req.nextUrl.searchParams.get("q");
  if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });

  const store = getStore();
  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 404 });

  const action = query ? "search_notes" : "view_notes";
  const decision = authorizeDoctor(doctorId, action, patient.id, patient.doctorId);
  if (!decision.allowed) return NextResponse.json({ error: decision.reason }, { status: 403 });

  let notes = store.notes.filter((n) => n.patientId === patientId);
  if (query) {
    const q = query.toLowerCase();
    notes = notes.filter((n) => n.text.toLowerCase().includes(q));
  }
  notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const body = await req.json();
  const { doctorId, text } = body;
  if (!doctorId || !text) return NextResponse.json({ error: "doctorId and text are required" }, { status: 400 });

  const store = getStore();
  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) return NextResponse.json({ error: "no such patient" }, { status: 404 });

  const decision = authorizeDoctor(doctorId, "add_note", patient.id, patient.doctorId);
  if (!decision.allowed) return NextResponse.json({ error: decision.reason }, { status: 403 });

  const note: Note = { id: id("note"), patientId, doctorId, text, createdAt: new Date().toISOString() };
  store.notes.push(note);
  return NextResponse.json(note, { status: 201 });
}
