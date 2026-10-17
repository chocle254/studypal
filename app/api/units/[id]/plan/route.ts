// POST /api/units/<id>/plan — save the student's teaching style and the topics they'll learn, in order.
// Body: { student, style?, plan? }
import { getUnit, updateUnit } from "@/lib/supabase";
import { isUuid } from "@/lib/student";
import type { Style } from "@/lib/types";

const STYLES: Style[] = ["five", "gossip", "nerd"];

export async function POST(req: Request, ctx: RouteContext<"/api/units/[id]/plan">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  if (!isUuid(body.student) || !isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const unit = await getUnit(id, body.student);
  if (!unit) return Response.json({ error: "Not found." }, { status: 404 });

  const patch: { style?: Style; plan?: number[] } = {};
  if (STYLES.includes(body.style)) patch.style = body.style;
  if (Array.isArray(body.plan)) {
    patch.plan = body.plan.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n < unit.topics.length);
  }
  await updateUnit(id, body.student, patch);
  return Response.json({ ok: true });
}
