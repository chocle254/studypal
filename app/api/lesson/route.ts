// POST /api/lesson — teach one topic in the chosen style. Written once by the AI, then saved and reused.
// Body: { student, unit, topic, style, quick? }
import { getUnit, listAttempts, updateUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError, askJson } from "@/lib/nvidia";
import { lessonPrompt, validLesson, toQuestions, type RawLesson } from "@/lib/prompts";
import { cleanDiagram } from "@/lib/diagram";
import { splitParts } from "@/lib/parts";
import type { Lesson, PublicLesson, Question, Style } from "@/lib/types";

export const maxDuration = 180;
const LESSON_VERSION = 2; // version 2: full-topic, in-depth lessons with structured diagrams

// The part of the student's material that covers this topic: find the topic's title in its part, take the text from there.
function sourceFor(material: string, part: number, title: string, max = 9000): string {
  const parts = splitParts(material);
  const text = (parts[part] ?? parts[0])?.text ?? "";
  const words = title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const lower = text.toLowerCase();
  let at = -1;
  for (const w of words) {
    at = lower.indexOf(w);
    if (at !== -1) break;
  }
  const start = at === -1 ? 0 : Math.max(0, at - 400);
  return text.slice(start, start + max);
}

const STYLES: Style[] = ["five", "gossip", "nerd"];

function toPublic(l: Lesson): PublicLesson {
  return {
    style: l.style,
    quick: !!l.quick,
    intro: l.intro,
    steps: l.steps.map((s) => ({ title: s.title, text: s.text, ...(s.diagram ? { diagram: s.diagram } : {}) })),
    check: l.check.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, ...(q.options ? { options: q.options } : {}) })),
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { student, unit: unitId } = body;
  const index = Number(body.topic);
  const style: Style = STYLES.includes(body.style) ? body.style : "five";
  const quick = !!body.quick;
  if (!isUuid(student) || !isUuid(unitId) || !Number.isInteger(index)) {
    return Response.json({ error: "That request didn't make sense." }, { status: 400 });
  }

  try {
    const unit = await getUnit(unitId, student);
    const topic = unit?.topics[index];
    if (!unit || !topic) return Response.json({ error: "Not found." }, { status: 404 });

    const saved = topic.lessons?.[style];
    if (saved && saved.v === LESSON_VERSION && (!!saved.quick === quick || !quick)) {
      return Response.json({ lesson: toPublic(saved), cached: true });
    }

    // What the student got wrong in the first test, so the lesson focuses there.
    const baseline = (await listAttempts([unitId]))
      .filter((a) => a.topic_index === index && a.kind === "baseline")
      .pop();
    const results = ((baseline?.detail as { results?: { id: string; score: number }[] })?.results ?? []);
    const mistakes = results
      .filter((r) => r.score < 1)
      .map((r) => topic.baseline.find((q: Question) => q.id === r.id)?.prompt)
      .filter((x): x is string => !!x);

    const raw = await askJson<RawLesson>(
      {
        task: "lesson",
        ...lessonPrompt({
          unit: unit.name,
          topic,
          source: sourceFor(unit.material_text, topic.part ?? 0, topic.title),
          style,
          mistakes,
          quick,
        }),
        maxTokens: 6000,
        temperature: 0.6,
      },
      validLesson,
    );

    const lesson: Lesson = {
      v: LESSON_VERSION,
      style,
      quick,
      intro: String(raw.intro).slice(0, 400),
      steps: raw.steps.slice(0, 10).map((s) => {
        const diagram = cleanDiagram(s.diagram);
        return { title: String(s.title ?? "").slice(0, 80), text: String(s.text).slice(0, 2000), ...(diagram ? { diagram } : {}) };
      }),
      check: toQuestions(raw.check ?? [], `t${index}c${style[0]}`).slice(0, 3),
    };

    // Re-read before saving so nothing written meanwhile is lost.
    const fresh = (await getUnit(unitId, student))!;
    fresh.topics[index] = { ...fresh.topics[index], lessons: { ...(fresh.topics[index].lessons ?? {}), [style]: lesson } };
    await updateUnit(unitId, student, { topics: fresh.topics });
    return Response.json({ lesson: toPublic(lesson) });
  } catch (e) {
    console.error("lesson failed", e);
    const msg =
      e instanceof AIError && e.kind === "busy"
        ? "The AI is slow right now. Please try again in a minute."
        : "Couldn't write this lesson. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
