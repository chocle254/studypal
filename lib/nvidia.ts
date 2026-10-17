// Calls NVIDIA's Nemotron through its OpenAI-compatible endpoint.
// Server only: the key lives in Vercel's settings and never reaches the phone.
// With no NVIDIA_API_KEY set, a clearly labelled stand-in answers instead, so the app
// can be built and checked without network access to NVIDIA.

import "server-only";
import { standIn } from "./standin";

const BASE = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

export type Task = "ping" | "analyze" | "mark" | "lesson";

export interface AskOptions {
  task: Task;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number; // per attempt; default 55s
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

export function aiMode(): "nemotron" | "stand-in" {
  return process.env.NVIDIA_API_KEY ? "nemotron" : "stand-in";
}

export function aiModel(): string {
  return process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";
}

// Remove any visible reasoning the model adds before its answer.
function clean(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export async function ask(opts: AskOptions): Promise<string> {
  if (aiMode() === "stand-in") return standIn(opts);

  let lastErr: unknown;
  const attempts = 1 + (opts.retries ?? 1);
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
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
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 55_000),
      });
      if (res.status === 429) throw new AIError("Study Pal is busy, try again in a minute.", "busy");
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        const body = await res.text();
        throw new AIError(`AI setup problem (${res.status}): ${body.slice(0, 200)}`, "config");
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
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new AIError("The AI didn't send JSON.", "bad_output");
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  const end = body.lastIndexOf(close);
  try {
    return JSON.parse(body.slice(start, end + 1)) as T;
  } catch {
    throw new AIError("The AI sent JSON that couldn't be read.", "bad_output");
  }
}

// Ask, then parse JSON; one extra try if the reply wasn't usable JSON.
export async function askJson<T>(opts: AskOptions, valid: (v: T) => boolean): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await ask(
      attempt === 0
        ? opts
        : { ...opts, user: opts.user + "\n\nReturn ONLY valid JSON in exactly the requested shape." },
    );
    try {
      const v = parseJson<T>(text);
      if (valid(v)) return v;
    } catch {
      /* try again */
    }
  }
  throw new AIError("The AI's answer wasn't in the right shape. Please try again.", "bad_output");
}

// List the model names this key can use (for the health page).
export async function listModels(): Promise<string[]> {
  if (aiMode() === "stand-in") return [];
  const res = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`models list ${res.status}`);
  const data = await res.json();
  return (data?.data ?? []).map((m: { id: string }) => m.id);
}
