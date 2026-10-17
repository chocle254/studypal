// GET /api/units/<id>?student=<id> — a unit for the phone, without any model answers.
import type { NextRequest } from "next/server";
import { deleteUnit, getUnit, listHome } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import type { PublicUnit } from "@/lib/types";
import { splitParts } from "@/lib/parts";
import { pagesRead } from "@/lib/reading";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/units/[id]">) {
  const { id } = await ctx.params;
  const student = req.nextUrl.searchParams.get("student");
  if (!isUuid(student) || !isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    const unit = await getUnit(id, student);
    if (!unit) return Response.json({ error: "Not found." }, { status: 404 });
    const course = (await listHome(student)).find((c) => c.id === unit.course_id);
    const parts = splitParts(unit.material_text);
    const out: PublicUnit = {
      id: unit.id,
      name: unit.name,
      course: course?.name ?? "",
      level: course?.level ?? "",
      current_topic: unit.current_topic,
      style: unit.style,
      topics: unit.topics.map((t) => ({
        part: t.part ?? 0,
        title: t.title,
        key_parts: t.key_parts,
        ready: t.baseline.length > 0 && t.final.length > 0,
      })),
      parts_read: unit.parts_read ?? 1,
      parts_total: parts.length,
      can_read_more: !unit.reached_current && (unit.parts_read ?? 1) < parts.length,
      pages_read: pagesRead(parts, unit.parts_read ?? 1),
    };
    return Response.json({ unit: out });
  } catch (e) {
    console.error("get unit failed", e);
    return Response.json({ error: "Couldn't load this unit." }, { status: 500 });
  }
}

// DELETE /api/units/<id>?student=<id> — remove a unit (for example, the wrong PDF was picked).
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/units/[id]">) {
  const { id } = await ctx.params;
  const student = req.nextUrl.searchParams.get("student");
  if (!isUuid(student) || !isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    await deleteUnit(id, student);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("delete unit failed", e);
    return Response.json({ error: "Couldn't delete this unit." }, { status: 500 });
  }
}
