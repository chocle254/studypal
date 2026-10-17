// POST /api/units/<id>/read-next — read the next part of the material (about 15 pages) into a new round.
import { getUnit, listHome, updateUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import { AIError } from "@/lib/nvidia";
import { readParts } from "@/lib/reading";
import { splitParts } from "@/lib/parts";

export const maxDuration = 300;

export async function POST(req: Request, ctx: RouteContext<"/api/units/[id]/read-next">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const student = body.student;
  if (!isUuid(student) || !isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });

  try {
    const unit = await getUnit(id, student);
    if (!unit) return Response.json({ error: "Not found." }, { status: 404 });
    const total = splitParts(unit.material_text).length;
    if (unit.reached_current || unit.parts_read >= total) {
      return Response.json({ error: "You've reached the end of this material." }, { status: 409 });
    }
    const course = (await listHome(student)).find((c) => c.id === unit.course_id);
    const read = await readParts({
      course: course?.name ?? "",
      level: course?.level ?? "",
      unit: unit.name,
      currentTopic: "",
      material: unit.material_text,
      from: unit.parts_read,
      existing: unit.topics,
    });
    const topics = [...unit.topics, ...read.topics];
    await updateUnit(id, student, {
      topics,
      parts_read: read.partsRead,
      current_topic: topics.length - 1,
    });
    return Response.json({ added: read.topics.map((t) => t.title), round: read.topics[0]?.part ?? null });
  } catch (e) {
    console.error("read next part failed", e);
    const msg =
      e instanceof AIError && e.kind === "busy"
        ? "The AI is slow right now. Please try again in a minute."
        : "Couldn't read the next part. Please try again.";
    return Response.json({ error: msg }, { status: 502 });
  }
}
