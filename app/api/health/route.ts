// GET /api/health — confirms the database and the AI both answer. Used to verify each deploy.
import { connection } from "next/server";
import { dbMode, ping } from "@/lib/supabase";
import { aiMode, aiModel, aiProvider, ask, listModels } from "@/lib/nvidia";

export async function GET() {
  await connection(); // always run fresh, never cached
  const result: Record<string, unknown> = {};

  // Which settings this deployment can see (names only, never values).
  const names = [
    "AI_API_KEY", "AI_MODEL", "AI_BASE_URL", "NVIDIA_API_KEY", "NVIDIA_MODEL", "SUPABASE_URL", "SUPABASE_SERVICE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY",
  ];
  result.settings = Object.fromEntries(names.map((n) => [n, Boolean(process.env[n])]));
  result.environment = process.env.VERCEL_ENV ?? "local";

  try {
    await ping();
    result.database = { ok: true, mode: dbMode() };
  } catch (e) {
    result.database = { ok: false, mode: dbMode(), error: String(e).slice(0, 200) };
  }

  // Is the chosen model one this key can use?
  try {
    const models = await listModels();
    if (models.length) {
      result.models = {
        chosen_is_available: models.includes(aiModel()),
        options: models.filter((m) => /nemotron|gpt-oss|qwen|llama/i.test(m)).slice(0, 30),
      };
    }
  } catch (e) {
    result.models = { error: String(e).slice(0, 200) };
  }

  const started = Date.now();
  try {
    const reply = await ask({
      task: "ping",
      system: "You are a health check. Reply with the single word OK.",
      user: "Reply with OK.",
      maxTokens: 400,
      temperature: 0,
      timeoutMs: 25_000,
      retries: 0,
    });
    result.ai = {
      ok: /ok/i.test(reply), mode: aiMode(), provider: aiProvider(), model: aiModel(),
      seconds: (Date.now() - started) / 1000, reply: reply.slice(0, 40),
    };
  } catch (e) {
    result.ai = {
      ok: false, mode: aiMode(), provider: aiProvider(), model: aiModel(),
      seconds: (Date.now() - started) / 1000, error: String(e).slice(0, 300),
    };
  }

  const ok = (result.database as { ok: boolean }).ok && (result.ai as { ok: boolean }).ok;
  return Response.json({ ok, ...result }, { status: ok ? 200 : 503 });
}
