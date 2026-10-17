// POST /api/units — add a course (if new) and a unit. The AI splits the unit's text into topics,
// up to where the student is. Questions are written next, one topic at a time
// (POST /api/units/<id>/questions), so the phone can show real progress.
import { ensureStudent, findOrCreateCourse, createUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError, askJson, aiProvider } from "@/lib/nvidia";
import { analyzePrompt, validAnalysis, type Analysis } from "@/lib/prompts";
import type { Topic } from "@/lib/types";

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
  const text = clip(body.text, 60_000);

  if (!isUuid(student)) return Response.json({ error: "Missing student ID." }, { status: 400 });
  if (!course || !unit) return Response.json({ error: "Please give the course and the unit a name." }, { status: 400 });
  if (text.replace(/\s/g, "").length < 150) {
    return Response.json(
      { error: "I couldn't find enough text in this material. Try a PDF where you can select the text, or paste the text." },
      { status: 400 },
    );
  }

  // Groq's free plan limits tokens per minute, so send it a shorter slice of very long notes.
  const forAI = aiProvider() === "groq" ? text.slice(0, 24_000) : text;

  try {
    const analysis = await askJson<Analysis>(
      { task: "analyze", ...analyzePrompt({ course, level, unit, currentTopic, text: forAI }), maxTokens: 3000, temperature: 0.2 },
      validAnalysis,
    );
    const all = analysis.topics.slice(0, 8);
    const current = Math.min(Math.max(0, Number(analysis.current_index) || 0), all.length - 1);
    const topics: Topic[] = all.slice(0, current + 1).map((t) => ({
      title: String(t.title).slice(0, 120),
      key_parts: t.key_parts.map(String).slice(0, 5),
      notes: String(t.notes ?? "").slice(0, 1200),
      baseline: [],
      final: [],
      lessons: {},
    }));

    await ensureStudent(student);
    const c = await findOrCreateCourse(student, course, level);
    const row = await createUnit({
      course_id: c.id,
      student_id: student,
      name: unit,
      current_topic: topics.length - 1,
      material_text: text,
      style: null,
      topics,
    });
    return Response.json({ id: row.id, topics: topics.map((t) => t.title) });
  } catch (e) {
    console.error("add unit failed", e);
    return Response.json({ error: aiMessage(e) }, { status: 502 });
  }
}

function aiMessage(e: unknown) {
  if (e instanceof AIError) {
    return e.kind === "busy"
      ? "The AI is slow right now. Please try again in a minute."
      : "Study Pal couldn't make sense of this material. Please try again.";
  }
  return "Something went wrong saving your unit. Please try again.";
}
