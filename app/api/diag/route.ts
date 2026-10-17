// GET /api/diag — timing check for the AI: how long a tiny answer takes with and without "thinking".
// Temporary, for choosing the fastest setup. Shows no secrets.
import { connection } from "next/server";
import { aiModel, listModels } from "@/lib/nvidia";

export const maxDuration = 120;

async function timed(label: string, model: string, extra: Record<string, unknown>, system: string) {
  const started = Date.now();
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: "List three types of building foundations as JSON: {\"types\":[...]}" },
        ],
        max_tokens: 600,
        temperature: 0,
        ...extra,
      }),
      signal: AbortSignal.timeout(50_000),
    });
    const data = await res.json().catch(() => ({}));
    const msg = data?.choices?.[0]?.message ?? {};
    return {
      label, model, status: res.status, seconds: (Date.now() - started) / 1000,
      reply: String(msg.content ?? "").slice(0, 120),
      reasoning_chars: String(msg.reasoning_content ?? msg.reasoning ?? "").length,
      tokens: data?.usage ?? null,
      error: res.ok ? undefined : JSON.stringify(data).slice(0, 200),
    };
  } catch (e) {
    return { label, model, seconds: (Date.now() - started) / 1000, error: String(e).slice(0, 120) };
  }
}

export async function GET() {
  await connection();
  const model = aiModel();
  let nemotron: string[] = [];
  try {
    nemotron = (await listModels()).filter((m) => /nemotron/i.test(m));
  } catch (e) {
    nemotron = [String(e)];
  }
  const off = { chat_template_kwargs: { enable_thinking: false } };
  const sys = "Answer with JSON only.";
  const runs = await Promise.all([
    timed("lightning, thinking off", model, off, sys),
    timed("nano 3", "nvidia/nemotron-nano-3-30b-a3b", off, sys),
    timed("super 3", "nvidia/nemotron-3-super-120b-a12b", off, sys),
    timed("llama nemotron 70b", "nvidia/llama-3.1-nemotron-70b-instruct", {}, sys),
    timed("llama nemotron 51b", "nvidia/llama-3.1-nemotron-51b-instruct", {}, sys),
  ]);
  const out = { model, nemotron_models: nemotron, runs };
  console.log("DIAG", JSON.stringify(out));
  return Response.json(out);
}
