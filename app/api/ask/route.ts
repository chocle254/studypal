// POST /api/ask — answer a student's own question about a topic, from their material.
// Body: { student, unit, topic, style, section, question }
import { getUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError, askJson } from "@/lib/nvidia";
import { askPrompt } from "@/lib/prompts";
import { sourceFor } from "@/lib/parts";
import { cleanCode } from "@/lib/diagram";

export const maxDuration = 90;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { student, unit: unitId } = body;
  const index = Number(body.topic);
  const question = String(body.question ?? "").trim().slice(0, 500);
  if (!isUuid(student) || !isUuid(unitId) || !Number.isInteger(index) || question.length < 3) {
    return Response.json({ error: "Type a question first." }, { status: 400 });
  }
  try {
    const unit = await getUnit(unitId, student);
    const topic = unit?.topics[index];
    if (!unit || !topic) return Response.json({ error: "Not found." }, { status: 404 });
    const raw = await askJson<{ answer: string; code?: unknown }>(
      {
        task: "ask",
        ...askPrompt({
          unit: unit.name,
          topic: topic.title,
          source: sourceFor(unit.material_text, topic.part ?? 0, topic.title, 6000),
          section: String(body.section ?? "").slice(0, 2500),
          style: String(body.style ?? "five"),
          question,
        }),
        maxTokens: 1800,
        temperature: 0.5,
      },
      (v) => typeof v?.answer === "string" && v.answer.length > 0,
    );
    const code = cleanCode(raw.code);
    return Response.json({ answer: raw.answer.slice(0, 3000), ...(code ? { code } : {}) });
  } catch (e) {
    console.error("ask failed", e);
    const msg =
      e instanceof AIError && e.kind === "busy" ? "The AI is slow right now. Please ask again in a minute." : "Couldn't answer that. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
