// Study Pal works through a unit in rounds of up to 4 topics: test, teach, test again, then the next round.
// This keeps each test short and only uses the AI for the round the student is on.
export const ROUND_SIZE = 4;

export function roundCount(topicCount: number): number {
  return Math.max(1, Math.ceil(topicCount / ROUND_SIZE));
}

export function roundOf(topicIndex: number): number {
  return Math.floor(topicIndex / ROUND_SIZE);
}

// The topic indices in a round, e.g. round 1 of 8 topics -> [4, 5, 6, 7]
export function roundTopics(round: number, topicCount: number): number[] {
  const start = round * ROUND_SIZE;
  return Array.from({ length: Math.max(0, Math.min(ROUND_SIZE, topicCount - start)) }, (_, i) => start + i);
}
