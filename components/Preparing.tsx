"use client";

import { useEffect, useState } from "react";

// The waiting screen while the AI reads a unit and writes questions.
// It keeps the student busy with facts from their own notes, and shows real progress topic by topic.
export default function Preparing({
  facts,
  topics,
  done,
  phase,
  note,
}: {
  facts: string[];
  topics: string[]; // empty while the AI is still finding the topics
  done: Set<number>;
  phase: "reading" | "questions";
  note?: string;
}) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!facts.length) return;
    const t = setInterval(() => {
      setI((n) => (n + 1) % facts.length);
      setFlipped(false);
    }, 9000);
    return () => clearInterval(t);
  }, [facts.length]);

  const fact = facts[i];
  const progress = topics.length ? done.size / topics.length : 0;

  return (
    <section className="mt-8 animate-rise">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 shrink-0">
          <div className="absolute inset-0 rounded-full bg-sage-soft animate-breathe" />
          <div className="absolute inset-2.5 rounded-full bg-sage/60 animate-breathe" style={{ animationDelay: "0.6s" }} />
        </div>
        <div>
          <p className="font-bold">
            {phase === "reading" ? "Reading your unit…" : `Writing your test questions (${done.size}/${topics.length})`}
          </p>
          <p className="text-sm text-muted">
            {phase === "reading" ? "Finding the topics and their key parts." : "One topic at a time. Keep this screen open."}
          </p>
        </div>
      </div>

      {note && <p className="mt-4 rounded-xl bg-clay-soft px-4 py-3 text-sm">{note}</p>}

      {phase === "questions" && (
        <>
          <div className="mt-5 h-2 rounded-full bg-line overflow-hidden">
            <div className="h-full bg-sage transition-all duration-700" style={{ width: `${Math.max(6, progress * 100)}%` }} />
          </div>
          <ol className="mt-4 space-y-2">
            {topics.map((t, n) => {
              const isDone = done.has(n);
              const isNow = !isDone && n === Math.min(...[...Array(topics.length).keys()].filter((k) => !done.has(k)));
              return (
                <li key={n} className="flex items-center gap-3 text-sm animate-rise" style={{ animationDelay: `${n * 80}ms` }}>
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-bold transition ${
                      isDone ? "bg-sage text-bg" : isNow ? "bg-clay-soft animate-breathe" : "bg-line text-muted"
                    }`}
                  >
                    {isDone ? "✓" : n + 1}
                  </span>
                  <span className={isDone ? "" : "text-muted"}>{t}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {fact && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">While you wait · from your notes</p>
          <button
            key={i}
            onClick={() => setFlipped((f) => !f)}
            className="mt-2 w-full text-left rounded-2xl bg-surface border border-line p-5 animate-rise active:scale-[0.99] transition"
          >
            {!flipped ? (
              <>
                <p className="text-lg leading-snug font-semibold">{fact}</p>
                <p className="mt-3 text-xs text-muted">Tap if you already knew this</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-sage">Nice. That&apos;s one you know.</p>
                <p className="mt-1 text-sm text-muted">The test will check the parts you&apos;re less sure about.</p>
              </>
            )}
          </button>
          <div className="mt-3 flex justify-center gap-1.5">
            {facts.map((_, n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-sage" : "w-1.5 bg-line"}`} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
