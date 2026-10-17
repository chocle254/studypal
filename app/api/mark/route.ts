// POST /api/mark — mark one topic's answers and save the attempt.
// Body: { student, unit, topic, kind: "baseline"|"final"|"check", style? (for "check"), answers: { [questionId]: string } }
// "check" is the short check at the end of a lesson; its questions come from the lesson in that style.
// Choice questions are marked here exactly; typed answers are marked by the AI in ONE call per topic.
import { addAttempt, getUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError, askJson } from "@/lib/nvidia";
import { markPrompt, type MarkResult } from "@/lib/prompts";
import type { MarkedAnswer, Question } from "@/lib/types";

export const maxDuration = 120;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { student, unit: unitId } = body;
  const topicIndex = Number(body.topic);
  const kind: "baseline" | "final" | "check" = body.kind === "final" ? "final" : body.kind === "check" ? "check" : "baseline";
  const answers: Record<string, string> = body.answers && typeof body.answers === "object" ? body.answers : {};
  if (!isUuid(student) || !isUuid(unitId) || !Number.isInteger(topicIndex)) {
    return Response.json({ error: "That request didn't make sense." }, { status: 400 });
  }

  try {
    const unit = await getUnit(unitId, student);
    const topic = unit?.topics[topicIndex];
    if (!unit || !topic) return Response.json({ error: "Not found." }, { status: 404 });
    const questions: Question[] =
      kind === "check" ? (topic.lessons?.[body.style as keyof typeof topic.lessons]?.check ?? []) : topic[kind];
    if (!questions.length) return Response.json({ error: "There are no questions to mark here." }, { status: 409 });
    const given = (q: Question) => String(answers[q.id] ?? "").slice(0, 1500);

    const results = new Map<string, MarkedAnswer>();
    // Choice questions: exact match, no AI needed.
    for (const q of questions.filter((q) => q.type === "choice")) {
      const ok = norm(given(q)) === norm(q.answer);
      results.set(q.id, { id: q.id, score: ok ? 1 : 0, feedback: ok ? "Correct." : `The answer was: ${q.answer}` });
    }
    // Typed questions: empty answers score 0 without asking the AI; the rest in one AI call.
    const typed = questions.filter((q) => q.type === "typed");
    for (const q of typed.filter((q) => !given(q).trim())) {
      results.set(q.id, { id: q.id, score: 0, feedback: "No answer given." });
    }
    const toMark = typed.filter((q) => given(q).trim());
    if (toMark.length) {
      const marked = await askJson<{ results: MarkResult[] }>(
        {
          task: "mark",
          ...markPrompt({
            topic: topic.title,
            items: toMark.map((q) => ({ id: q.id, prompt: q.prompt, answer: q.answer, student: given(q) })),
          }),
          maxTokens: 1500,
          temperature: 0,
        },
        (v) => Array.isArray(v?.results),
      );
      for (const q of toMark) {
        const r = marked.results.find((x) => x.id === q.id);
        const score = r ? Math.max(0, Math.min(1, Math.round(Number(r.score) * 2) / 2)) : 0;
        results.set(q.id, { id: q.id, score, feedback: String(r?.feedback ?? "").slice(0, 300) });
      }
    }

    const list = questions.map((q) => results.get(q.id)!);
    const score = list.reduce((s, r) => s + r.score, 0) / Math.max(1, list.length);
    await addAttempt({
      unit_id: unitId,
      topic_index: topicIndex,
      kind,
      score,
      detail: { answers, results: list },
    });
    return Response.json({ score, results: list });
  } catch (e) {
    console.error("marking failed", e);
    const msg =
      e instanceof AIError && e.kind === "busy"
        ? "The AI is slow right now. Your answers are kept; please try again in a minute."
        : "Couldn't mark your answers. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
