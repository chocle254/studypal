// POST /api/units/<id>/questions — write the baseline and final questions for one topic and save them.
// The phone calls this once per topic, one after another, and shows each topic as it's ready.
import { getUnit, updateUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError, askJson } from "@/lib/nvidia";
import { questionsPrompt, validQuestionSets, toQuestions, type QuestionSets } from "@/lib/prompts";

export const maxDuration = 300;

export async function POST(req: Request, ctx: RouteContext<"/api/units/[id]/questions">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const student = body.student;
  const index = Number(body.topic);
  if (!isUuid(student) || !isUuid(id) || !Number.isInteger(index)) {
    return Response.json({ error: "That request didn't make sense." }, { status: 400 });
  }

  try {
    const unit = await getUnit(id, student);
    const topic = unit?.topics[index];
    if (!unit || !topic) return Response.json({ error: "Not found." }, { status: 404 });
    if (topic.baseline.length && topic.final.length) return Response.json({ ok: true, cached: true });

    const sets = await askJson<QuestionSets>(
      {
        task: "questions",
        ...questionsPrompt({ unit: unit.name, topic: { title: topic.title, key_parts: topic.key_parts, notes: topic.notes } }),
        maxTokens: 3000,
        temperature: 0.4,
      },
      validQuestionSets,
    );

    // Re-read just before saving so nothing written meanwhile is lost.
    const fresh = (await getUnit(id, student))!;
    fresh.topics[index] = {
      ...fresh.topics[index],
      baseline: toQuestions(sets.baseline, `t${index}b`),
      final: toQuestions(sets.final, `t${index}f`),
    };
    await updateUnit(id, student, { topics: fresh.topics });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("write questions failed", e);
    const msg =
      e instanceof AIError && e.kind === "busy"
        ? "The AI is slow right now. Please try again in a minute."
        : "Couldn't write the questions for this topic. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
