// A unit is worked through in rounds. Each round is one part of the PDF (about 15 pages, up to 5 topics):
// test, teach, test again, then Study Pal reads the next part.
// Topics remember which part (round) they came from.

export function roundCount(topics: { part: number }[]): number {
  return topics.reduce((m, t) => Math.max(m, t.part + 1), 0);
}

// Indices of the topics in a round, e.g. round 1 -> [4, 5, 6]
export function roundTopics(round: number, topics: { part: number }[]): number[] {
  return topics.flatMap((t, i) => (t.part === round ? [i] : []));
}
