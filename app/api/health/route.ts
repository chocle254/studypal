// GET /api/health — confirms the database and the AI both answer. Used to verify each deploy.
import { connection } from "next/server";
import { dbMode, ping } from "@/lib/supabase";
import { aiMode, aiModel, ask } from "@/lib/nvidia";

export async function GET() {
  await connection(); // always run fresh, never cached
  const result: Record<string, unknown> = {};

  try {
    await ping();
    result.database = { ok: true, mode: dbMode() };
  } catch (e) {
    result.database = { ok: false, mode: dbMode(), error: String(e).slice(0, 200) };
  }

  try {
    const reply = await ask({
      task: "ping",
      system: "You are a health check. Reply with the single word OK.",
      user: "Reply with OK.",
      maxTokens: 400,
      temperature: 0,
    });
    result.ai = { ok: /ok/i.test(reply), mode: aiMode(), model: aiModel(), reply: reply.slice(0, 40) };
  } catch (e) {
    result.ai = { ok: false, mode: aiMode(), model: aiModel(), error: String(e).slice(0, 300) };
  }

  const ok = (result.database as { ok: boolean }).ok && (result.ai as { ok: boolean }).ok;
  return Response.json({ ok, ...result }, { status: ok ? 200 : 503 });
}
