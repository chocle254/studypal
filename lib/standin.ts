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
  // Group sections so there are at most 5 topics, like the real prompt asks.
  const sections = topics.filter((t) => t.body.length);
  const per = Math.ceil(sections.length / 5) || 1;
  const usable = Array.from({ length: Math.ceil(sections.length / per) }, (_, g) => {
    const group = sections.slice(g * per, g * per + per);
    return { title: group.map((x) => x.title).join(" & "), body: group.flatMap((x) => x.body) };
  });
  const current = user.match(/currently at this topic: "([^"]+)"/)?.[1]?.toLowerCase();
  let currentIndex = 0;
  let contains = false;
  if (current) {
    const found = usable.findIndex((t) => t.title.toLowerCase().includes(current) || current.includes(t.title.toLowerCase()));
    if (found >= 0) {
      currentIndex = found;
      contains = true;
    }
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
    contains_current: contains,
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

// Rough marking by shared words with the model answer.
function standInMark(user: string) {
  const blocks = user.split(/\n\n(?=ID: )/).filter((b) => b.startsWith("ID: "));
  const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  return {
    results: blocks.map((b) => {
      const id = b.match(/ID: (.*)/)?.[1] ?? "";
      const model = words(b.match(/Model answer: (.*)/)?.[1] ?? "");
      const got = words(b.match(/Student answer: (.*)/)?.[1] ?? "");
      const overlap = [...got].filter((w) => model.has(w)).length / Math.max(1, model.size);
      const score = overlap >= 0.5 ? 1 : overlap >= 0.2 ? 0.5 : 0;
      return { id, score, feedback: score === 1 ? "[stand-in] Good." : score ? "[stand-in] Partly right." : "[stand-in] Not quite." };
    }),
  };
}

// A simple lesson with a labelled diagram per step.
function standInLesson(user: string) {
  const title = user.match(/Topic: (.*)/)?.[1] ?? "this topic";
  const parts = (user.match(/Key parts: (.*)/)?.[1] ?? "").split(/;\s*/).filter(Boolean);
  const quick = /quick brush-through/.test(user);
  const steps = (quick ? parts.slice(0, 2) : parts.slice(0, 4)).map((p, i) => ({
    title: `Step ${i + 1}`,
    text: `[stand-in] ${p}. Think of it like a house: every part has a job, and this one matters because it keeps things working.`,
    svg: `<svg viewBox="0 0 320 200"><rect x="20" y="120" width="280" height="50" rx="10" fill="#dfe8e2" stroke="#2f3532"/><polygon points="60,120 160,40 260,120" fill="#f0e2d8" stroke="#2f3532"/><circle cx="${80 + i * 50}" cy="145" r="14" fill="#c48f72"/><text x="160" y="190" text-anchor="middle" font-size="13" fill="#2f3532">${p.slice(0, 30).replace(/[<&]/g, "")}</text></svg>`,
  }));
  return {
    intro: `[stand-in] Let's make "${title}" easy.`,
    steps: steps.length >= 2 ? steps : [...steps, { title: "Recap", text: "[stand-in] That's the big idea." }],
    check: [
      { part: parts[0] ?? title, type: "typed", prompt: `[stand-in] In one sentence, what is ${title}?`, answer: parts[0] ?? title },
      { part: parts[1] ?? title, type: "typed", prompt: `[stand-in] Why does ${parts[1] ?? title} matter?`, answer: parts[1] ?? title },
      { part: title, type: "choice", prompt: `[stand-in] Which is about ${title}?`, options: [parts[0] ?? title, "Cooking rice", "Football rules", "Weather"], answer: parts[0] ?? title },
    ],
  };
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
    case "mark":
      return JSON.stringify(standInMark(opts.user));
    case "lesson":
      return JSON.stringify(standInLesson(opts.user));
    default:
      return "{}";
  }
}
