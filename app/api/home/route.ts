// GET /api/home?student=<id> — the student's courses and units for the home screen.
import type { NextRequest } from "next/server";
import { ensureStudent, listHome } from "@/lib/supabase";
import { isUuid } from "@/lib/student";

export async function GET(req: NextRequest) {
  const student = req.nextUrl.searchParams.get("student");
  if (!isUuid(student)) return Response.json({ error: "Missing student ID." }, { status: 400 });
  try {
    await ensureStudent(student);
    const courses = await listHome(student);
    return Response.json({ courses });
  } catch (e) {
    console.error("home failed", e);
    return Response.json({ error: "Couldn't load your units. Try again in a moment." }, { status: 500 });
  }
}
