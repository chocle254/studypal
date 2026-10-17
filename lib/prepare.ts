// Client helpers for the waiting time while the AI prepares a unit.
import { getStudentId } from "./student";

// Pick short, fact-like sentences from the student's own notes to show while they wait.
export function pickFacts(text: string, max = 12): string[] {
  // Split on line breaks first so headings don't glue onto the next sentence.
  const sentences = text
    .split(/\n+/)
    .flatMap((line) => line.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => {
      const words = s.split(" ").length;
      return words >= 7 && words <= 32 && /[a-z]/i.test(s) && !/^(figure|table|page)\b/i.test(s);
    });
  const factLike = sentences.filter((s) => /\b(is|are|was|were|because|called|used|means|helps|consists|made)\b/i.test(s));
  const pool = factLike.length >= 4 ? factLike : sentences;
  // Spread picks across the whole document so they don't all come from page one.
  const step = Math.max(1, Math.floor(pool.length / max));
  const picked: string[] = [];
  for (let i = 0; i < pool.length && picked.length < max; i += step) picked.push(pool[i]);
  return picked;
}

// Write questions for each topic, one after another, reporting progress.
export async function prepareTopics(
  unitId: string,
  indices: number[],
  onDone: (index: number) => void,
): Promise<{ ok: true } | { ok: false; error: string; index: number }> {
  for (const index of indices) {
    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`/api/units/${unitId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student: getStudentId(), topic: index }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          lastError = "";
          break;
        }
        lastError = data.error || "Something went wrong.";
      } catch {
        lastError = "Couldn't reach Study Pal. Check your connection.";
      }
    }
    if (lastError) return { ok: false, error: lastError, index };
    onDone(index);
  }
  return { ok: true };
}
