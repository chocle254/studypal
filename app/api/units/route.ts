// POST /api/units — add a course (if new) and a unit. The AI splits the unit's text into topics
// and writes the baseline and final questions for each topic up to where the student is.
import { ensureStudent, findOrCreateCourse, createUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError, askJson } from "@/lib/nvidia";
import {
  analyzePrompt, validAnalysis, questionsPrompt, validQuestionSets, toQuestions,
  type Analysis, type QuestionSets,
} from "@/lib/prompts";
import type { Topic } from "@/lib/types";

export const maxDuration = 300; // reading a whole unit can take the AI a while

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

  try {
    // 1. Split the unit into topics.
    const analysis = await askJson<Analysis>(
      { task: "analyze", ...analyzePrompt({ course, level, unit, currentTopic, text }), maxTokens: 4096, temperature: 0.2 },
      validAnalysis,
    );
    const all = analysis.topics.slice(0, 8);
    const current = Math.min(Math.max(0, Number(analysis.current_index) || 0), all.length - 1);
    const studied = all.slice(0, current + 1); // the AI reads from the first topic to where the student is

    // 2. Write questions for every topic at once (one AI call per topic, in parallel).
    const sets = await Promise.all(
      studied.map((t) =>
        askJson<QuestionSets>(
          { task: "questions", ...questionsPrompt({ unit, topic: t }), maxTokens: 4096, temperature: 0.4 },
          validQuestionSets,
        ),
      ),
    );

    const topics: Topic[] = studied.map((t, i) => ({
      title: String(t.title).slice(0, 120),
      key_parts: t.key_parts.map(String).slice(0, 5),
      notes: String(t.notes ?? "").slice(0, 1200),
      baseline: toQuestions(sets[i].baseline, `t${i}b`),
      final: toQuestions(sets[i].final, `t${i}f`),
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
    return Response.json({ id: row.id, topics: topics.length });
  } catch (e) {
    console.error("add unit failed", e);
    const msg =
      e instanceof AIError
        ? e.kind === "busy"
          ? "Study Pal is busy right now. Try again in a minute."
          : "Study Pal couldn't make sense of this material. Please try again."
        : "Something went wrong saving your unit. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
