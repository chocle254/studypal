// The stand-in AI. Used ONLY when no NVIDIA_API_KEY is set (local building and checks).
// It gives simple, predictable answers so each step can be verified offline.
// It is never used on the live app once the key is set.

import type { AskOptions } from "./nvidia";
import { MATERIAL_END, MATERIAL_START } from "./prompts";

function between(text: string, a: string, b: string) {
  const i = text.indexOf(a);
  const j = text.lastIndexOf(b);
  return i >= 0 && j > i ? text.slice(i + a.length, j) : "";
}

function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(" ").length >= 4);
}

// Very rough topic split: short lines without a full stop are treated as headings.
function standInAnalyze(user: string) {
  const material = between(user, MATERIAL_START, MATERIAL_END).trim();
  const lines = material.split("\n").map((l) => l.trim()).filter(Boolean);
  const topics: { title: string; body: string[] }[] = [];
  for (const line of lines) {
    const looksLikeHeading = line.length < 60 && !/[.!?]$/.test(line) && line.split(" ").length <= 8;
    if (looksLikeHeading || topics.length === 0) topics.push({ title: line.replace(/^[\d.\s]+/, "") || "Topic", body: [] });
    else topics[topics.length - 1].body.push(line);
  }
  const usable = topics.filter((t) => t.body.length).slice(0, 8);
  const current = user.match(/currently at this topic: "([^"]+)"/)?.[1]?.toLowerCase();
  let currentIndex = usable.length - 1;
  if (current) {
    const found = usable.findIndex((t) => t.title.toLowerCase().includes(current) || current.includes(t.title.toLowerCase()));
    if (found >= 0) currentIndex = found;
  }
  return {
    topics: usable.map((t) => {
      const s = sentences(t.body.join(" "));
      return {
        title: t.title,
        key_parts: s.slice(0, 4).map((x) => x.split(" ").slice(0, 6).join(" ")),
        notes: s.slice(0, 5).join(" "),
      };
    }),
    current_index: Math.max(0, currentIndex),
  };
}

function standInQuestions(user: string) {
  const title = user.match(/Topic: (.*)/)?.[1] ?? "this topic";
  const parts = (user.match(/Key parts: (.*)/)?.[1] ?? "").split(/\s{2}\d+\.\s|^\d+\.\s/).filter(Boolean);
  const notes = sentences(user.match(/Topic notes: (.*)/)?.[1] ?? "");
  const make = (kind: "baseline" | "final") =>
    Array.from({ length: 5 }, (_, i) => {
      const part = parts[i % Math.max(parts.length, 1)] ?? title;
      const answer = notes[i % Math.max(notes.length, 1)] ?? `It is about ${part}.`;
      if (i === 4) {
        return {
          part,
          type: "choice",
          prompt: `[stand-in] Which statement about "${title}" is true?`,
          options: [answer, "None of these is in the notes.", "It has nothing to do with this unit.", "It only applies on weekends."],
          answer,
        };
      }
      return {
        part,
        type: "typed",
        prompt:
          kind === "baseline"
            ? `[stand-in] In your own words, explain: ${part}.`
            : `[stand-in] Give a real-life example that shows: ${part}.`,
        answer,
      };
    });
  return { baseline: make("baseline"), final: make("final") };
}

export async function standIn(opts: AskOptions): Promise<string> {
  // Optional pretend "thinking time", to try the waiting screens locally.
  const delay = Number(process.env.STANDIN_DELAY_MS || 0);
  if (delay && opts.task !== "ping") await new Promise((r) => setTimeout(r, delay));
  switch (opts.task) {
    case "ping":
      return "OK";
    case "analyze":
      return JSON.stringify(standInAnalyze(opts.user));
    case "questions":
      return JSON.stringify(standInQuestions(opts.user));
    default:
      return "{}";
  }
}
