// Results of a round's baseline test: a gentle verdict, where to start learning, and strong/weak topics.
export const STRONG = 0.7; // a topic scored at least 70% counts as strong

// A kind, honest word for the overall score, so a student isn't just handed a bare number.
export function verdict(overall: number): { title: string; line: string; tone: "great" | "good" | "building" } {
  if (overall >= 0.85) return { title: "Great understanding", line: "You really get this round. Let's polish the last bits.", tone: "great" };
  if (overall >= 0.7) return { title: "Good understanding", line: "You know most of this. A few gaps to close.", tone: "good" };
  if (overall >= 0.5) return { title: "Getting there", line: "You have the basics. Some topics need more work.", tone: "building" };
  if (overall >= 0.3) return { title: "Still building", line: "This is new for you in places. We'll learn it together.", tone: "building" };
  return { title: "A fresh start", line: "Most of this is new, and that's fine. We'll go step by step.", tone: "building" };
}

export interface ResultTopic {
  index: number;
  title: string;
  score: number;
}

// Where to start: everything from topic one if most of the round is new; otherwise only the weak topics.
export function learningPlan(topics: ResultTopic[]): { fromStart: boolean; order: ResultTopic[] } {
  const overall = topics.reduce((s, t) => s + t.score, 0) / Math.max(1, topics.length);
  if (overall < 0.4) return { fromStart: true, order: topics };
  return { fromStart: false, order: topics.filter((t) => t.score < STRONG) };
}

export default function Results({ topics }: { topics: ResultTopic[] }) {
  const overall = topics.reduce((s, t) => s + t.score, 0) / Math.max(1, topics.length);
  const v = verdict(overall);
  const plan = learningPlan(topics);
  const strong = topics.filter((t) => t.score >= STRONG);
  const weak = topics.filter((t) => t.score < STRONG);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const color = v.tone === "great" ? "text-sage" : v.tone === "good" ? "text-sage" : "text-clay";

  return (
    <div className="mt-6 rounded-2xl bg-surface border border-line p-5 animate-rise">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Your starting point</p>
      <p className={`mt-2 text-2xl font-extrabold ${color}`}>{v.title}</p>
      <p className="mt-1 text-sm">{v.line}</p>
      <div className="mt-3 h-2 rounded-full bg-line overflow-hidden">
        <div className={`h-full ${v.tone === "building" ? "bg-clay" : "bg-sage"}`} style={{ width: `${Math.max(4, overall * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">{pct(overall)} of this round understood</p>

      {plan.order.length > 0 && (
        <div className="mt-5 rounded-xl bg-bg border border-line p-4">
          <p className="font-bold">Where you&apos;ll start</p>
          <p className="mt-1 text-sm text-muted">
            {plan.fromStart
              ? "Most of this round is new, so we'll go from the first topic, one at a time."
              : "We'll skip what you already know and start with the topics you're still learning."}
          </p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {plan.order.map((t, n) => (
              <li key={t.index} className="flex gap-2">
                <span className="w-5 h-5 shrink-0 rounded-full bg-clay-soft grid place-items-center text-xs font-bold">{n + 1}</span>
                <span>{t.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {weak.length > 0 && (
        <div className="mt-5">
          <p className="font-bold">Still learning ({weak.length})</p>
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

      {weak.length === 0 && (
        <p className="mt-5 text-sm text-muted">You&apos;re strong in every topic of this round. You can still do a quick check on any of them.</p>
      )}
    </div>
  );
}
