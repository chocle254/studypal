// The instructions Study Pal gives the AI. Kept in one place so they're easy to read and improve.
import type { Question } from "./types";

export const MATERIAL_START = "<<<MATERIAL";
export const MATERIAL_END = "MATERIAL>>>";

// ---------- 1. Split a unit into topics ----------

export interface AnalyzedTopic {
  title: string;
  key_parts: string[];
  notes: string; // the core facts of this topic, used to write questions and lessons
}

export interface Analysis {
  topics: AnalyzedTopic[];
  contains_current: boolean; // the student's current topic is in this part
  current_index: number; // its index in this part's topics, if contained
}

export function analyzePrompt(p: {
  course: string;
  level: string;
  unit: string;
  currentTopic: string;
  text: string;
  partLabel: string; // e.g. "part 1 of 6 (pages 1–15)"
  earlierTopics: string[];
}) {
  return {
    system:
      "You are Study Pal, a study assistant for students. You read a unit's study material and split it into its topics. You only use what is in the material. You answer with JSON only.",
    user: `Course: ${p.course} (level: ${p.level || "not given"})
Unit: ${p.unit}
This is ${p.partLabel} of the student's material.
${p.earlierTopics.length ? `Topics already covered from earlier parts (don't repeat them): ${p.earlierTopics.join("; ")}` : ""}
The student says they are currently at this topic: ${p.currentTopic ? `"${p.currentTopic}"` : "not given"}

Find the main study topics in THIS part, in the order they appear: at most 5 topics. If this part has more sections
than that, group related sections into one topic so that nothing is left out. Skip front matter such as
the cover, copyright, contents page, preface and index. If a topic continues from an earlier part, give only what is new.
For each topic give:
- "title": a short topic title
- "key_parts": 3 to 5 distinct ideas a student must understand in this topic (short phrases)
- "notes": the core facts of this topic FROM THIS PART, in plain English, at most 120 words

Also give:
- "contains_current": true if the student's current topic is in this part, otherwise false
- "current_index": the 0-based index of that topic in your list (0 if not contained)

If this part has no real study content (for example only front matter), return an empty "topics" list.

Return ONLY this JSON:
{"topics":[{"title":"...","key_parts":["..."],"notes":"..."}],"contains_current":false,"current_index":0}

${MATERIAL_START}
${p.text}
${MATERIAL_END}`,
  };
}

export function validAnalysis(a: Analysis): boolean {
  return (
    !!a &&
    Array.isArray(a.topics) &&
    a.topics.every((t) => t && typeof t.title === "string" && Array.isArray(t.key_parts) && t.key_parts.length > 0)
  );
}

// ---------- 2. Write the baseline and final questions for one topic ----------

export interface RawQuestion {
  part: string;
  type: "typed" | "choice";
  prompt: string;
  options?: string[];
  answer: string;
}

export interface QuestionSets {
  baseline: RawQuestion[];
  final: RawQuestion[];
}

export function questionsPrompt(p: { unit: string; topic: AnalyzedTopic }) {
  return {
    system:
      "You are Study Pal. You write questions that test real understanding, not memorized wording. Simple English. You answer with JSON only.",
    user: `Unit: ${p.unit}
Topic: ${p.topic.title}
Key parts: ${p.topic.key_parts.map((k, i) => `${i + 1}. ${k}`).join("  ")}
Topic notes: ${p.topic.notes}

Write two sets of 5 questions about this topic:
- "baseline": the first test, before any teaching. Spread the 5 questions across the key parts.
- "final": the last test, after teaching. Question N in "final" must cover the SAME key part as question N in "baseline", but ask it in a different way and structure (for example: explain it, apply it to a real-life situation, compare, or spot what's wrong). Never reuse the wording.

In each set, make 4 questions "typed" (the student writes an answer in their own words) and 1 question "choice" (4 options).
For every question give a short model "answer" (1 to 3 sentences). For "choice", the answer must be exactly one of the options.
Use only facts from the topic notes.

Return ONLY this JSON:
{"baseline":[{"part":"...","type":"typed","prompt":"...","answer":"..."},{"part":"...","type":"choice","prompt":"...","options":["...","...","...","..."],"answer":"..."}],"final":[...]}`,
  };
}

export function validQuestionSets(q: QuestionSets): boolean {
  const ok = (list: RawQuestion[]) =>
    Array.isArray(list) &&
    list.length >= 3 &&
    list.every((x) => x && typeof x.prompt === "string" && typeof x.answer === "string");
  return !!q && ok(q.baseline) && ok(q.final);
}

export function toQuestions(list: RawQuestion[], prefix: string): Question[] {
  return list.slice(0, 5).map((q, i) => {
    const isChoice = q.type === "choice" && Array.isArray(q.options) && q.options.length >= 2;
    return {
      id: `${prefix}${i + 1}`,
      part: String(q.part ?? ""),
      type: isChoice ? "choice" : "typed",
      prompt: String(q.prompt),
      ...(isChoice ? { options: q.options!.map(String).slice(0, 5) } : {}),
      answer: String(q.answer),
    };
  });
}
