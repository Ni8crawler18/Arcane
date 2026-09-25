import { NextRequest, NextResponse } from "next/server";
import { processFollowUp } from "@/lib/agent";
import { getStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { doctorId } = body;
  if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });

  const store = getStore();
  const now = Date.now();
  const due = store.followUps.filter(
    (f) => f.doctorId === doctorId && f.status === "pending" && new Date(f.dueAt).getTime() <= now
  );

  const results = due.map((f) => processFollowUp(f));
  return NextResponse.json({ processed: results.length, results });
}
