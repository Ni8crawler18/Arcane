import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const log = getStore().agentLog.filter((l) => l.patientId === patientId);
  return NextResponse.json(log);
}
