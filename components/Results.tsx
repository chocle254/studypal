// Results of a round's baseline test: strong and weak topics, and overall understanding.
export const STRONG = 0.7; // a topic scored at least 70% counts as strong

export default function Results({
  topics,
}: {
  topics: { index: number; title: string; score: number }[];
}) {
  const overall = topics.reduce((s, t) => s + t.score, 0) / Math.max(1, topics.length);
  const strong = topics.filter((t) => t.score >= STRONG);
  const weak = topics.filter((t) => t.score < STRONG);
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div className="mt-6 rounded-2xl bg-surface border border-line p-5 animate-rise">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Your starting point</p>
      <div className="mt-2 flex items-end gap-3">
        <p className="text-5xl font-extrabold text-sage leading-none">{pct(overall)}</p>
        <p className="pb-1 text-sm text-muted">overall understanding of this round</p>
      </div>

      {weak.length > 0 && (
        <div className="mt-5">
          <p className="font-bold">To learn ({weak.length})</p>
          <ul className="mt-2 space-y-2">
            {weak.map((t) => (
              <li key={t.index} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span>{t.title}</span>
                  <span className="text-clay font-semibold">{pct(t.score)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-line overflow-hidden">
                  <div className="h-full bg-clay" style={{ width: `${Math.max(4, t.score * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {strong.length > 0 && (
        <div className="mt-5">
          <p className="font-bold">You know these ({strong.length})</p>
          <ul className="mt-2 space-y-2">
            {strong.map((t) => (
              <li key={t.index} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span>✓ {t.title}</span>
                  <span className="text-sage font-semibold">{pct(t.score)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-line overflow-hidden">
                  <div className="h-full bg-sage" style={{ width: `${t.score * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 text-sm text-muted">
        {weak.length
          ? "Next, Study Pal teaches only the topics you're still learning, in the style you pick."
          : "You're strong in every topic of this round. Nice."}
      </p>
    </div>
  );
}
