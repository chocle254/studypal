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

Write two sets of 5 questions about this topic. Each set must work like a mini tour of the WHOLE topic, so that a
student who can answer all 5 really understands it:
1. The core idea: what it is, in plain words (easy).
2. How it works or what it's made of (medium).
3. Why it matters or why it's done that way (medium).
4. Apply it: a short real-life situation the student has to reason about (harder).
5. A "choice" question with 4 options that checks a common mix-up or misconception.
Together the 5 questions must cover every key part listed above. Keep each question short and clear.

- "baseline": the first test, before any teaching.
- "final": the last test, after teaching. Question N in "final" covers the SAME idea as question N in "baseline",
  but asked in a different way and structure (a different example, a different angle). Never reuse the wording.

Questions 1–4 are "typed" (the student answers in their own words); question 5 is "choice" (4 options).
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

// ---------- 3. Mark a topic's typed answers ----------

export interface MarkResult {
  id: string;
  score: number; // 0, 0.5 or 1
  feedback: string;
}

export function markPrompt(p: {
  topic: string;
  items: { id: string; prompt: string; answer: string; student: string }[];
}) {
  return {
    system:
      "You are Study Pal, a fair and kind examiner. You mark by MEANING, not exact wording: an answer in the student's own simple words that shows the right idea is correct. You answer with JSON only.",
    user: `Topic: ${p.topic}

Mark each student answer against the model answer.
- score 1: shows the key idea correctly (own words, small slips are fine)
- score 0.5: partly right, or right idea but missing an important piece
- score 0: wrong, empty, "I don't know", or off-topic
Give one short "feedback" sentence per answer (what was right or what was missing). Don't reveal anything beyond the model answer.

${p.items
  .map((x) => `ID: ${x.id}\nQuestion: ${x.prompt}\nModel answer: ${x.answer}\nStudent answer: ${x.student || "(no answer)"}`)
  .join("\n\n")}

Return ONLY this JSON:
{"results":[{"id":"...","score":1,"feedback":"..."}]}`,
  };
}

// ---------- 4. Teach a topic in the chosen style ----------

export const STYLE_GUIDES: Record<string, string> = {
  five: `Explain like the student is 5 years old. Tiny everyday words, short sentences. Use home and family examples
(a house, a dog guarding a compound, a kitchen, a football team). Replace every technical name with a simple picture
first, then give the real name once in brackets.`,
  gossip: `Explain like an excited friend sharing gossip: chatty, dramatic, "okay so, guess what…", characters and drama.
The facts must stay 100% correct; the drama is only in how it's told.`,
  nerd: `Explain like an enthusiastic expert: precise technical terms, how and why in more depth, one surprising fun fact.
Still clear and step by step.`,
};

export interface RawLesson {
  intro: string;
  steps: { title: string; text: string; diagram?: unknown; code?: unknown }[];
  check: RawQuestion[];
}

export function lessonPrompt(p: {
  unit: string;
  topic: { title: string; key_parts: string[]; notes: string };
  source: string; // the student's own material for this topic
  style: string;
  mistakes: string[]; // questions the student got wrong or partly wrong
  quick: boolean;
}) {
  const plan = p.quick
    ? `This is a quick brush-through (the student already knows the topic well): 3 sections — the core idea, how it works, and a summary.`
    : `Teach the WHOLE topic properly, in 6 to 9 sections, building up from zero:
  1. What it is (the core idea in plain words, with an everyday comparison)
  2. Why it matters (what problem it solves, what goes wrong without it)
  3–5. How it works, step by step, and its parts or types — explain EVERY key part and every important idea in the material,
     not only the ideas from the test
  6. A worked example from real life, walked through step by step
  7. Common mistakes and confusions, and how to avoid them
  8. A short summary the student could say back in their own words`;
  return {
    system:
      "You are Study Pal, a brilliant, kind teacher. You make hard ideas simple and memorable and you teach in depth, never just a surface skim. You never make the student feel stupid. You answer with JSON only.",
    user: `Unit: ${p.unit}
Topic: ${p.topic.title}
Key parts: ${p.topic.key_parts.join("; ")}
Short notes: ${p.topic.notes}

The student's own material for this topic:
${MATERIAL_START}
${p.source}
${MATERIAL_END}

${p.mistakes.length ? `In the first test, the student struggled with these questions — make sure the lesson clears them up:\n${p.mistakes.map((m) => `- ${m}`).join("\n")}\n` : ""}
Teaching style: ${STYLE_GUIDES[p.style] ?? STYLE_GUIDES.five}

${plan}

Each section has:
- "title": a few words
- "text": 4 to 8 sentences in easy English, step by step. Use the material's real facts, names and numbers.
  When you list steps or several points, put EACH on its own line (use "\\n" between them), starting with "1. ", "2. " …
  for steps in order, or "- " for points without an order. Never squeeze a numbered list into one paragraph.
- "code" (ONLY when the topic is about programming, data or maths that is done with code, and a short example helps):
  {"language":"python","code":"..."} — a short, correct, runnable snippet (at most 25 lines) with brief comments,
  using the libraries the material uses. Use "\\n" for new lines inside the code. Leave it out for non-code topics.
- "diagram" (ONLY when a picture genuinely helps; otherwise leave it out). Pick ONE shape:
  {"kind":"flow","steps":["...","..."]}  for a process in order (3 to 7 short steps)
  {"kind":"cycle","steps":["...","..."]}  for a process that repeats (3 to 6 steps)
  {"kind":"compare","left":{"title":"...","points":["..."]},"right":{"title":"...","points":["..."]}}  for two things side by side
  {"kind":"parts","center":"...","parts":[{"name":"...","job":"..."}]}  for a thing and what each of its parts does (2 to 6 parts)
  Keep every label under 8 words.

Then write "check": 3 questions to check the student understood the whole lesson (2 "typed", 1 "choice" with 4 options),
each with a short model "answer". For "choice", the answer must be exactly one of the options.

Return ONLY this JSON:
{"intro":"one friendly sentence","steps":[{"title":"...","text":"...","diagram":{"kind":"flow","steps":["..."]}}],"check":[{"part":"...","type":"typed","prompt":"...","answer":"..."}]}`,
  };
}

export function validLesson(l: RawLesson): boolean {
  return (
    !!l &&
    typeof l.intro === "string" &&
    Array.isArray(l.steps) &&
    l.steps.length >= 3 &&
    l.steps.every((s) => s && typeof s.text === "string") &&
    Array.isArray(l.check)
  );
}
