// Reads the next part of a unit's material with the AI and turns it into a new round of topics.
import "server-only";
import { askJson } from "./nvidia";
import { analyzePrompt, validAnalysis, type Analysis } from "./prompts";
import { splitParts, type Part } from "./parts";
import type { Topic } from "./types";

export function partLabel(parts: Part[], index: number): string {
  const p = parts[index];
  const pages = p.firstPage ? ` (pages ${p.firstPage}–${p.lastPage})` : "";
  return `part ${index + 1} of ${parts.length}${pages}`;
}

export function pagesRead(parts: Part[], partsRead: number): string | null {
  const last = parts[Math.min(partsRead, parts.length) - 1];
  const total = parts[parts.length - 1];
  if (!last?.lastPage || !total?.lastPage) return null;
  return `1–${last.lastPage} of ${total.lastPage}`;
}

// Reads parts starting at `from` until one has real study topics (skips front matter), up to 3 parts.
export async function readParts(opts: {
  course: string;
  level: string;
  unit: string;
  currentTopic: string;
  material: string;
  from: number;
  existing: Topic[];
}): Promise<{ topics: Topic[]; partsRead: number; reachedCurrent: boolean }> {
  const parts = splitParts(opts.material);
  let index = opts.from;
  const tries = Math.min(parts.length, opts.from + 3);
  while (index < tries) {
    const analysis = await askJson<Analysis>(
      {
        task: "analyze",
        ...analyzePrompt({
          course: opts.course,
          level: opts.level,
          unit: opts.unit,
          currentTopic: opts.currentTopic,
          text: parts[index].text,
          partLabel: partLabel(parts, index),
          earlierTopics: opts.existing.map((t) => t.title),
        }),
        maxTokens: 2500,
        temperature: 0.2,
      },
      validAnalysis,
    );
    let found = analysis.topics.slice(0, 5);
    const reachedCurrent = !!opts.currentTopic && !!analysis.contains_current;
    if (reachedCurrent) found = found.slice(0, Math.max(0, Number(analysis.current_index) || 0) + 1);
    index++;
    if (found.length) {
      const topics: Topic[] = found.map((t) => ({
        part: roundNumber(opts.existing),
        title: String(t.title).slice(0, 120),
        key_parts: (t.key_parts ?? []).map(String).slice(0, 5),
        notes: String(t.notes ?? "").slice(0, 1200),
        baseline: [],
        final: [],
        lessons: {},
      }));
      return { topics, partsRead: index, reachedCurrent };
    }
  }
  return { topics: [], partsRead: index, reachedCurrent: false };
}

// The round number for new topics: one more than the last round so far.
function roundNumber(existing: Topic[]): number {
  return existing.reduce((m, t) => Math.max(m, t.part + 1), 0);
}
