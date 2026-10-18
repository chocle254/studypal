// POST /api/lesson — teach one topic in the chosen style. Written once by the AI, then saved and reused.
// Body: { student, unit, topic, style, quick? }
import { getUnit, listAttempts, updateUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError, askJson } from "@/lib/nvidia";
import { lessonPrompt, validLesson, toQuestions, type RawLesson } from "@/lib/prompts";
import { cleanCode, cleanDiagram } from "@/lib/diagram";
import { sourceFor } from "@/lib/parts";
import type { Lesson, PublicLesson, Question, Style } from "@/lib/types";

export const maxDuration = 180;
const LESSON_VERSION = 3; // v3: points on their own lines, code examples for code topics

const STYLES: Style[] = ["five", "gossip", "nerd"];

function toPublic(l: Lesson): PublicLesson {
  return {
    style: l.style,
    quick: !!l.quick,
    intro: l.intro,
    steps: l.steps.map((s) => ({
      title: s.title,
      text: s.text,
      ...(s.diagram ? { diagram: s.diagram } : {}),
      ...(s.code ? { code: s.code } : {}),
    })),
    check: l.check.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, ...(q.options ? { options: q.options } : {}) })),
  };
}

// Turn the AI's lesson into a saved lesson: check the diagrams and code, trim sizes.
function shape(raw: RawLesson, style: Style, quick: boolean, idPrefix: string, checks: number): Lesson {
  return {
    v: LESSON_VERSION,
    style,
    quick,
    intro: String(raw.intro ?? "").slice(0, 400),
    steps: raw.steps.slice(0, 10).map((s) => {
      const diagram = cleanDiagram(s.diagram);
      const code = cleanCode(s.code);
      return {
        title: String(s.title ?? "").slice(0, 80),
        text: String(s.text).slice(0, 2400),
        ...(diagram ? { diagram } : {}),
        ...(code ? { code } : {}),
      };
    }),
    check: toQuestions(Array.isArray(raw.check) ? raw.check : [], idPrefix).slice(0, checks),
  };
}

// Body: { student, unit, topic, style, quick?, mode?: "full"|"fix"|"deeper", fresh? }
//   full   — the normal lesson (or a quick brush-through), saved per style
//   fix    — a second pass after a weak final test; its 5 check questions are the retake
//   deeper — 3–4 extra, harder sections added after the normal lesson
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { student, unit: unitId } = body;
  const index = Number(body.topic);
  const style: Style = STYLES.includes(body.style) ? body.style : "five";
  const mode: "full" | "fix" | "deeper" = body.mode === "fix" ? "fix" : body.mode === "deeper" ? "deeper" : "full";
  const quick = mode === "full" && !!body.quick;
  if (!isUuid(student) || !isUuid(unitId) || !Number.isInteger(index)) {
    return Response.json({ error: "That request didn't make sense." }, { status: 400 });
  }

  try {
    const unit = await getUnit(unitId, student);
    const topic = unit?.topics[index];
    if (!unit || !topic) return Response.json({ error: "Not found." }, { status: 404 });

    // Saved lessons are reused (a "fresh" fix asks for a new second pass, explained another way).
    if (mode === "full") {
      const saved = topic.lessons?.[style];
      if (saved && saved.v === LESSON_VERSION && (!saved.quick || quick)) {
        return Response.json({ lesson: toPublic(saved), cached: true });
      }
    }
    if (mode === "fix" && topic.fix && topic.fix.style === style && !body.fresh) {
      return Response.json({ lesson: toPublic(topic.fix), cached: true });
    }
    if (mode === "deeper" && topic.deeper?.[style]?.length) {
      return Response.json({ steps: topic.deeper[style], cached: true });
    }

    // What the student got wrong: in the first test for a normal lesson, in the final test (and any retake) for a fix.
    const attempts = (await listAttempts([unitId])).filter((a) => a.topic_index === index);
    const wrongIn = (kind: string, questions: Question[]) => {
      const last = attempts.filter((a) => a.kind === kind).pop();
      const results = ((last?.detail as { results?: { id: string; score: number }[] })?.results ?? []);
      return results
        .filter((r) => r.score < 1)
        .map((r) => questions.find((q) => q.id === r.id)?.prompt)
        .filter((x): x is string => !!x);
    };
    const mistakes =
      mode === "fix"
        ? [...wrongIn("final", topic.final), ...wrongIn("quick", topic.fix?.check ?? [])]
        : mode === "full"
          ? wrongIn("baseline", topic.baseline)
          : [];
    const earlier =
      mode === "fix"
        ? [...topic.baseline, ...topic.final, ...(topic.fix?.check ?? [])].map((q) => q.prompt)
        : mode === "deeper"
          ? (topic.lessons?.[style]?.steps ?? []).map((s) => s.title)
          : [];

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
          mode,
          earlier,
        }),
        maxTokens: mode === "full" ? 8000 : 6000,
        temperature: 0.6,
      },
      validLesson,
    );

    const round = attempts.filter((a) => a.kind === "quick").length + 1;
    const lesson = shape(
      raw,
      style,
      quick,
      mode === "fix" ? `t${index}r${round}x` : `t${index}c${style[0]}`,
      mode === "fix" ? 5 : 3,
    );

    // If a long reply was cut off before its questions, reuse questions from the first test so the
    // lesson can still be checked (the path and the final test depend on it).
    const need = mode === "fix" ? 5 : mode === "full" && !quick ? 3 : 0;
    if (lesson.check.length < need) {
      const extra = topic.baseline.filter((q) => !lesson.check.some((c) => c.prompt === q.prompt));
      lesson.check = [...lesson.check, ...extra.map((q, i) => ({ ...q, id: `${q.id}r${i}` }))].slice(0, need);
    }

    // Re-read before saving so nothing written meanwhile is lost.
    const fresh = (await getUnit(unitId, student))!;
    const t = fresh.topics[index];
    if (mode === "full") fresh.topics[index] = { ...t, lessons: { ...(t.lessons ?? {}), [style]: lesson } };
    if (mode === "fix") fresh.topics[index] = { ...t, fix: lesson };
    if (mode === "deeper") fresh.topics[index] = { ...t, deeper: { ...(t.deeper ?? {}), [style]: lesson.steps } };
    await updateUnit(unitId, student, { topics: fresh.topics });
    return mode === "deeper" ? Response.json({ steps: lesson.steps }) : Response.json({ lesson: toPublic(lesson) });
  } catch (e) {
    console.error("lesson failed", e);
    const msg =
      e instanceof AIError && e.kind === "busy"
        ? "The AI is slow right now. Please try again in a minute."
        : "Couldn't write this lesson. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
