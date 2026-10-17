import { STRONG, verdict } from "@/components/Results";

export interface CompareTopic {
  index: number;
  title: string;
  before: number; // baseline score, 0..1
  after: number; // final test score, 0..1
  retake?: number; // after the second pass on a weak topic
}

const pct = (x: number) => Math.round(x * 100);

// The before-and-after screen for a finished round: overall, then each topic, baseline next to final.
export default function ScoreCompare({
  round,
  topics,
  onFix,
}: {
  round: number;
  topics: CompareTopic[];
  onFix?: (topic: number, again: boolean) => void; // open the second pass for a weak topic
}) {
  const best = (t: CompareTopic) => Math.max(t.after, t.retake ?? 0);
  const weak = topics.filter((t) => best(t) < STRONG);
  const fixed = topics.filter((t) => t.retake !== undefined);
  const withFixes = topics.reduce((s, t) => s + best(t), 0) / Math.max(1, topics.length);
  const avg = (k: "before" | "after") => topics.reduce((s, t) => s + t[k], 0) / Math.max(1, topics.length);
  const before = avg("before");
  const after = avg("after");
  const change = pct(after) - pct(before);
  const v = verdict(after);
  const headline =
    change >= 15 ? "Look how far you came!" : change > 0 ? "You moved forward" : change === 0 ? "You held your ground" : "A tougher test this time";
  const line =
    change > 0
      ? `Your understanding of this round went from ${pct(before)}% to ${pct(after)}%.`
      : change === 0
        ? `You stayed at ${pct(after)}%. Open a lesson again for the topics still in progress.`
        : `The final test asked different questions, and some of them caught you out. Revisit the topics below that dropped.`;

  return (
    <div className="mt-6 rounded-2xl bg-surface border border-line p-5 animate-rise">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Round {round + 1} · before and after</p>
      <p className="mt-2 text-2xl font-extrabold">{headline}</p>
      <p className="mt-1 text-sm">{line}</p>

      {/* The big comparison: two numbers with the change between them. */}
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <div className="rounded-2xl bg-bg border border-line py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Before</p>
          <p className="mt-1 text-3xl font-extrabold text-muted">{pct(before)}%</p>
        </div>
        <div className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${change > 0 ? "bg-sage text-bg" : "bg-clay-soft"}`}>
          {change > 0 ? `+${change}` : change}
        </div>
        <div className="rounded-2xl bg-sage-soft py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">After</p>
          <p className="mt-1 text-3xl font-extrabold text-sage">{pct(after)}%</p>
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-semibold">{v.title}</p>
      {fixed.length > 0 && (
        <p className="mt-2 text-center text-sm">
          After fixing weak topics: <span className="font-extrabold text-sage">{pct(withFixes)}%</span>
        </p>
      )}

      {onFix && weak.length > 0 && (
        <div className="mt-5 rounded-xl bg-clay-soft p-4 text-sm">
          <p className="font-bold">{weak.length === 1 ? "One topic needs another go" : `${weak.length} topics need another go`}</p>
          <p className="mt-1">
            Study Pal will explain {weak.length === 1 ? "it" : "each one"} a different way, aimed at what you missed, then give you a
            retake with new questions.
          </p>
        </div>
      )}

      <ul className="mt-5 space-y-4">
        {topics.map((t, n) => {
          const d = pct(t.after) - pct(t.before);
          return (
            <li key={t.index} className="animate-rise" style={{ animationDelay: `${n * 90}ms` }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-bold leading-snug">{t.title}</p>
                <p className={`shrink-0 text-xs font-bold ${d > 0 ? "text-sage" : d < 0 ? "text-clay" : "text-muted"}`}>
                  {pct(t.before)}% → {pct(t.after)}%
                  {t.retake !== undefined && <span className="text-sage"> → {pct(t.retake)}%</span>}
                </p>
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="h-2 rounded-full bg-line overflow-hidden">
                  <div className="h-full bg-muted/50 rounded-full" style={{ width: `${Math.max(2, pct(t.before))}%` }} />
                </div>
                <div className="h-2 rounded-full bg-line overflow-hidden">
                  <div className="h-full bg-sage rounded-full transition-all duration-1000" style={{ width: `${Math.max(2, pct(t.after))}%` }} />
                </div>
                {t.retake !== undefined && (
                  <div className="h-2 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-clay rounded-full" style={{ width: `${Math.max(2, pct(t.retake))}%` }} />
                  </div>
                )}
              </div>
              {onFix && best(t) < STRONG && (
                <button
                  onClick={() => onFix(t.index, t.retake !== undefined)}
                  className="mt-2 w-full rounded-xl bg-sage text-bg py-2.5 text-sm font-bold active:scale-[0.98] transition"
                >
                  {t.retake !== undefined ? "Try it another way" : "Fix this topic"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-muted/50" /> Before</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-sage" /> After</span>
        {fixed.length > 0 && <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-full bg-clay" /> Retake</span>}
      </div>
    </div>
  );
}
