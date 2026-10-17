// GET /api/profile?student=<id> — overall performance across all of the student's units.
import type { NextRequest } from "next/server";
import { listAttempts, listHome } from "@/lib/supabase";
import { isUuid } from "@/lib/student";

export interface ProfileUnit {
  id: string;
  name: string;
  course: string;
  topics: number;
  tested: number; // topics with a first test
  learned: number; // topics with a lesson check done
  finished: number; // topics with a final test
  before: number | null; // average first-test score of finished topics
  after: number | null; // average best of final / retake for finished topics
}

export async function GET(req: NextRequest) {
  const student = req.nextUrl.searchParams.get("student");
  if (!isUuid(student)) return Response.json({ error: "Missing student ID." }, { status: 400 });
  try {
    const courses = await listHome(student);
    const units = courses.flatMap((c) => c.units.map((u) => ({ ...u, course: c.name, level: c.level })));
    const attempts = await listAttempts(units.map((u) => u.id));

    // Latest score per unit, topic and kind (attempts come oldest first).
    const latest = new Map<string, number>();
    for (const a of attempts) latest.set(`${a.unit_id}:${a.topic_index}:${a.kind}`, Number(a.score));
    const get = (u: string, t: number, k: string) => latest.get(`${u}:${t}:${k}`);

    const out: ProfileUnit[] = units.map((u) => {
      const idx = Array.from({ length: u.topics }, (_, i) => i);
      const finished = idx.filter((i) => get(u.id, i, "final") !== undefined && get(u.id, i, "baseline") !== undefined);
      const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
      return {
        id: u.id,
        name: u.name,
        course: u.course,
        topics: u.topics,
        tested: idx.filter((i) => get(u.id, i, "baseline") !== undefined).length,
        learned: idx.filter((i) => get(u.id, i, "check") !== undefined).length,
        finished: finished.length,
        before: avg(finished.map((i) => get(u.id, i, "baseline")!)),
        after: avg(finished.map((i) => Math.max(get(u.id, i, "final")!, get(u.id, i, "retake") ?? 0))),
      };
    });

    const done = out.filter((u) => u.finished > 0);
    const weighted = (k: "before" | "after") =>
      done.length ? done.reduce((s, u) => s + (u[k] ?? 0) * u.finished, 0) / done.reduce((s, u) => s + u.finished, 0) : null;

    return Response.json({
      courses: courses.length,
      units: out,
      totals: {
        topics: out.reduce((s, u) => s + u.topics, 0),
        learned: out.reduce((s, u) => s + u.learned, 0),
        finished: out.reduce((s, u) => s + u.finished, 0),
        before: weighted("before"),
        after: weighted("after"),
      },
    });
  } catch (e) {
    console.error("profile failed", e);
    return Response.json({ error: "Couldn't load your profile." }, { status: 500 });
  }
}
