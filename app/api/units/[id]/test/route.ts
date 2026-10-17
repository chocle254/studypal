// GET /api/units/<id>/test?student=<id>&round=<n>&kind=baseline|final
// The questions for one round's topics, WITHOUT the model answers.
import type { NextRequest } from "next/server";
import { getUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { roundTopics } from "@/lib/batches";
import type { TestTopic } from "@/lib/types";

// Shuffle choice options (the same way every time for a question) so the right one isn't always first.
function shuffled(options: string[], seed: string): string[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/units/[id]/test">) {
  const { id } = await ctx.params;
  const q = req.nextUrl.searchParams;
  const student = q.get("student");
  const round = Number(q.get("round"));
  const kind = q.get("kind") === "final" ? "final" : "baseline";
  if (!isUuid(student) || !isUuid(id) || !Number.isInteger(round)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  const unit = await getUnit(id, student);
  if (!unit) return Response.json({ error: "Not found." }, { status: 404 });

  const topics: TestTopic[] = roundTopics(round, unit.topics.map((t) => ({ part: t.part ?? 0 }))).map((i) => ({
    topic: i,
    title: unit.topics[i].title,
    questions: unit.topics[i][kind].map((x) => ({ id: x.id, type: x.type, prompt: x.prompt, ...(x.options ? { options: shuffled(x.options, unit.id + x.id) } : {}) })),
  }));
  if (topics.some((t) => !t.questions.length)) {
    return Response.json({ error: "Some topics in this round don't have questions yet." }, { status: 409 });
  }
  return Response.json({ topics });
}
