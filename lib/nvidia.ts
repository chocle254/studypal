// Calls the AI through an OpenAI-compatible endpoint: Groq or NVIDIA, chosen by settings.
//   AI_BASE_URL, AI_API_KEY, AI_MODEL  (e.g. https://api.groq.com/openai/v1 + a Groq key + openai/gpt-oss-20b)
//   If those aren't set, the NVIDIA_* settings are used (NVIDIA's Nemotron).
// Server only: the key lives in Vercel's settings and never reaches the phone.
// With no key at all, a clearly labelled stand-in answers instead, so the app
// can be built and checked without network access.

import "server-only";
import { standIn } from "./standin";
import { jsonrepair } from "jsonrepair";

const KEY = process.env.AI_API_KEY || process.env.NVIDIA_API_KEY;
const BASE = (
  process.env.AI_BASE_URL ||
  (process.env.AI_API_KEY ? "https://api.groq.com/openai/v1" : process.env.NVIDIA_BASE_URL) ||
  "https://integrate.api.nvidia.com/v1"
).replace(/\/$/, "");

export function aiProvider(): "groq" | "nvidia" | "other" {
  return BASE.includes("groq.com") ? "groq" : BASE.includes("nvidia.com") ? "nvidia" : "other";
}

// Turn off long "thinking" where the model supports it: it was the main cause of slow answers.
function speedOptions(model: string, json: boolean): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (/gpt-oss/i.test(model)) o.reasoning_effort = "low";
  if (/qwen3/i.test(model) && aiProvider() === "groq") o.reasoning_effort = "none";
  if (aiProvider() === "nvidia" && /nemotron-3|nemotron-nano-3/i.test(model)) {
    o.chat_template_kwargs = { enable_thinking: false };
  }
  if (json && aiProvider() === "groq") o.response_format = { type: "json_object" };
  return o;
}

export type Task = "ping" | "analyze" | "questions" | "mark" | "lesson" | "ask";

export interface AskOptions {
  task: Task;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number; // per attempt; default 55s
  json?: boolean; // ask the provider for JSON output when it supports it
  retries?: number; // extra attempts after the first; default 1
}

export class AIError extends Error {
  constructor(
    message: string,
    public kind: "busy" | "bad_output" | "config" | "failed" = "failed",
  ) {
    super(message);
  }
}

export function aiMode(): "live" | "stand-in" {
  return KEY ? "live" : "stand-in";
}

export function aiModel(): string {
  return (
    process.env.AI_MODEL ||
    (process.env.AI_API_KEY ? "openai/gpt-oss-20b" : process.env.NVIDIA_MODEL) ||
    "nvidia/nemotron-3.5-lightning-30b-a3b"
  );
}

// Remove any visible reasoning the model adds before its answer.
function clean(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export async function ask(opts: AskOptions): Promise<string> {
  if (aiMode() === "stand-in") return standIn(opts);

  let lastErr: unknown;
  let rateLimitWaits = 0;
  const attempts = 1 + (opts.retries ?? 1);
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiModel(),
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 2048,
          ...speedOptions(aiModel(), !!opts.json),
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 55_000),
      });
      if (res.status === 429) {
        // Free plans limit requests per minute. Wait as long as the provider asks (up to 20s), then try again.
        const wait = Math.min(20, Number(res.headers.get("retry-after")) || 6);
        if (rateLimitWaits < 3) {
          rateLimitWaits++;
          console.warn(`AI rate limited (task ${opts.task}); waiting ${wait}s`);
          await new Promise((r) => setTimeout(r, wait * 1000));
          attempt--; // a rate-limit wait doesn't use up a normal attempt
          continue;
        }
        throw new AIError("Study Pal is busy, try again in a minute.", "busy");
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        const body = await res.text();
        throw new AIError(`AI setup problem (${res.status}): ${body.slice(0, 200)}`, "config");
      }
      if (res.status === 400) {
        // Groq's JSON mode rejects replies it thinks aren't valid JSON, but sends back what the model wrote.
        // That text is often usable (our parser is more forgiving), so hand it on; askJson checks the shape.
        const body = await res.text();
        let failed = "";
        try {
          failed = JSON.parse(body)?.error?.failed_generation ?? "";
        } catch {
          /* not JSON */
        }
        if (failed.trim()) return clean(failed);
        throw new AIError(`AI error 400: ${body.slice(0, 200)}`, "failed");
      }
      if (!res.ok) throw new AIError(`AI error ${res.status}`, "failed");
      const data = await res.json();
      const text = clean(data?.choices?.[0]?.message?.content ?? "");
      if (!text) throw new AIError("The AI sent an empty answer.", "bad_output");
      return text;
    } catch (e) {
      lastErr =
        e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")
          ? new AIError("The AI took too long to answer.", "busy")
          : e;
      console.error(`AI call failed (task ${opts.task}, attempt ${attempt + 1}):`, String(lastErr));
      if (e instanceof AIError && e.kind === "config") break; // retrying won't fix a bad key or model
    }
  }
  throw lastErr instanceof AIError ? lastErr : new AIError(String(lastErr));
}

// Pull the first JSON object or array out of an AI reply (models sometimes wrap it in ``` fences).
export function parseJson<T>(text: string): T {
  let body = text.trim();
  // Strip a fence only when the WHOLE reply is fenced; code inside the JSON may contain ``` too.
  const whole = body.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i);
  if (whole) body = whole[1];
  const start = body.search(/[[{]/);
  if (start === -1) throw new AIError("The AI didn't send JSON.", "bad_output");
  const close = body[start] === "{" ? "}" : "]";
  const end = body.lastIndexOf(close);
  const slice = end > start ? body.slice(start, end + 1) : body.slice(start);
  try {
    return JSON.parse(slice) as T;
  } catch {
    // Common slips: raw line breaks or quotes inside code strings, trailing commas, a reply cut off at the end.
    try {
      return JSON.parse(jsonrepair(body.slice(start))) as T;
    } catch (e) {
      console.warn(`JSON unreadable (${text.length} chars): ${String(e).slice(0, 120)} | starts: ${text.slice(0, 80)} | ends: ${text.slice(-80)}`);
      throw new AIError("The AI sent JSON that couldn't be read.", "bad_output");
    }
  }
}

// Ask, then parse JSON. Up to 3 tries: a bad reply or a rejected reply gets another go,
// the last one without the provider's strict JSON mode (which itself sometimes rejects good answers).
export async function askJson<T>(opts: AskOptions, valid: (v: T) => boolean): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const text = await ask({
        ...opts,
        retries: 0,
        json: attempt < 2,
        user: attempt === 0 ? opts.user : opts.user + "\n\nReturn ONLY valid JSON in exactly the requested shape. No text before or after it.",
      });
      const v = parseJson<T>(text);
      if (valid(v)) return v;
      console.warn(`AI JSON had the wrong shape (task ${opts.task}, attempt ${attempt + 1}): ${text.slice(0, 120)}`);
    } catch (e) {
      lastErr = e;
      // A settings problem won't be fixed by trying again; anything else gets another go.
      if (e instanceof AIError && e.kind === "config") throw e;
    }
  }
  if (lastErr instanceof AIError && lastErr.kind === "busy") throw lastErr;
  throw new AIError("The AI's answer wasn't in the right shape. Please try again.", "bad_output");
}

// List the model names this key can use (for the health page).
export async function listModels(): Promise<string[]> {
  if (aiMode() === "stand-in") return [];
  const res = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`models list ${res.status}`);
  const data = await res.json();
  return (data?.data ?? []).map((m: { id: string }) => m.id);
}
