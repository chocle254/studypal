// POST /api/units — add a course (if new) and a unit. The AI reads the first part of the material
// (about 15 pages) and finds its topics: that's round 1. Later parts are read as the student progresses
// (POST /api/units/<id>/read-next). Questions are written per topic (POST /api/units/<id>/questions).
import { ensureStudent, findOrCreateCourse, createUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError } from "@/lib/nvidia";
import { readParts } from "@/lib/reading";

export const maxDuration = 300;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "That request didn't make sense." }, { status: 400 });
  }

  const student = body.student;
  const course = clip(body.course, 80);
  const level = clip(body.level, 60);
  const unit = clip(body.unit, 100);
  const currentTopic = clip(body.currentTopic, 120);
  const text = clip(body.text, 400_000);

  if (!isUuid(student)) return Response.json({ error: "Missing student ID." }, { status: 400 });
  if (!course || !unit) return Response.json({ error: "Please give the course and the unit a name." }, { status: 400 });
  if (text.replace(/\s/g, "").length < 150) {
    return Response.json(
      { error: "I couldn't find enough text in this material. Try a PDF where you can select the text, or paste the text." },
      { status: 400 },
    );
  }

  try {
    const read = await readParts({ course, level, unit, currentTopic, material: text, from: 0, existing: [] });
    if (!read.topics.length) {
      return Response.json(
        { error: "I couldn't find study topics at the start of this material. Try a PDF of the notes themselves." },
        { status: 422 },
      );
    }

    await ensureStudent(student);
    const c = await findOrCreateCourse(student, course, level);
    const row = await createUnit({
      course_id: c.id,
      student_id: student,
      name: unit,
      current_topic: read.topics.length - 1,
      material_text: text,
      style: null,
      topics: read.topics,
      parts_read: read.partsRead,
      reached_current: read.reachedCurrent,
    });
    return Response.json({ id: row.id, topics: read.topics.map((t) => t.title) });
  } catch (e) {
    console.error("add unit failed", e);
    const msg =
      e instanceof AIError
        ? e.kind === "busy"
          ? "The AI is slow right now. Please try again in a minute."
          : "Study Pal couldn't make sense of this material. Please try again."
        : "Something went wrong saving your unit. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
