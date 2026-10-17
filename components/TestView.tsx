"use client";

import { useEffect, useRef, useState } from "react";
import { getStudentId } from "@/lib/student";
import type { TestTopic } from "@/lib/types";

// A round's test: one topic at a time, five questions each, with a box showing the other topics.
// Answers for each topic are marked by the AI as soon as the topic is submitted.
export default function TestView({
  unitId,
  round,
  kind,
  alreadyDone,
  onFinished,
  onExit,
}: {
  unitId: string;
  round: number;
  kind: "baseline" | "final";
  alreadyDone: number[]; // topic indices that already have this kind of attempt
  onFinished: () => void;
  onExit: () => void;
}) {
  const [topics, setTopics] = useState<TestTopic[] | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set(alreadyDone));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/units/${unitId}/test?student=${getStudentId()}&round=${round}&kind=${kind}`)
      .then((r) => r.json())
      .then((d) => (d.topics ? setTopics(d.topics) : setError(d.error || "Couldn't load the test.")))
      .catch(() => setError("Couldn't reach Study Pal. Check your connection."));
  }, [unitId, round, kind]);

  if (error && !topics) return <p className="mt-16 text-center text-muted">{error}</p>;
  if (!topics) {
    return (
      <div className="mt-24 grid place-items-center">
        <div className="w-10 h-10 rounded-full bg-sage-soft animate-breathe" />
      </div>
    );
  }

  const current = topics.find((t) => !done.has(t.topic));
  if (!current) return null;
  const position = topics.indexOf(current) + 1;
  const answered = current.questions.filter((q) => (answers[q.id] ?? "").trim()).length;

  async function submitTopic() {
    if (!current || marking) return;
    setMarking(true);
    setError(null);
    try {
      const res = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: getStudentId(),
          unit: unitId,
          topic: current.topic,
          kind,
          answers: Object.fromEntries(current.questions.map((q) => [q.id, answers[q.id] ?? ""])),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't mark your answers. Please try again.");
      const next = new Set(done).add(current.topic);
      setDone(next);
      top.current?.scrollIntoView({ behavior: "smooth" });
      if (topics!.every((t) => next.has(t.topic))) onFinished();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't mark your answers.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <section ref={top} className="mt-4 animate-rise">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {kind === "baseline" ? "What do you already know?" : "Final test"} · Round {round + 1}
        </p>
        <button onClick={onExit} className="text-sm text-muted underline underline-offset-4">Pause</button>
      </div>

      {/* The box showing every topic in this round: done, now, or still to come. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {topics.map((t, n) => {
          const isDone = done.has(t.topic);
          const isNow = t.topic === current.topic;
          return (
            <span
              key={t.topic}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                isDone ? "bg-sage text-bg border-sage" : isNow ? "bg-clay-soft border-clay" : "bg-surface border-line text-muted"
              }`}
            >
              {isDone ? "✓ " : `${n + 1}. `}
              {t.title.length > 22 ? t.title.slice(0, 21) + "…" : t.title}
            </span>
          );
        })}
      </div>

      <h1 key={current.topic} className="mt-6 text-2xl font-extrabold animate-rise">
        <span className="text-muted text-base font-bold block">Topic {position} of {topics.length}</span>
        {current.title}
      </h1>

      <ol className="mt-5 space-y-4">
        {current.questions.map((q, n) => (
          <li key={q.id} className="rounded-2xl bg-surface border border-line p-4 animate-rise" style={{ animationDelay: `${n * 60}ms` }}>
            <p className="font-semibold leading-snug">
              <span className="text-sage mr-1">{n + 1}.</span> {q.prompt}
            </p>
            {q.type === "choice" && q.options ? (
              <div className="mt-3 space-y-2">
                {q.options.map((o) => {
                  const picked = answers[q.id] === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm transition ${
                        picked ? "border-sage bg-sage-soft font-semibold" : "border-line bg-bg"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Answer in your own words…"
                className="mt-3 w-full h-24 rounded-xl bg-bg border border-line px-3 py-2.5 text-base outline-none focus:border-sage transition"
              />
            )}
          </li>
        ))}
      </ol>

      {error && <p className="mt-4 text-sm text-clay">{error}</p>}

      <button
        onClick={submitTopic}
        disabled={marking}
        className="mt-5 w-full rounded-xl bg-sage text-bg font-bold py-3.5 active:scale-[0.98] transition disabled:opacity-70"
      >
        {marking ? "Marking your answers…" : position === topics.length ? "Finish the test" : "Next topic"}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        {answered} of {current.questions.length} answered. It&apos;s fine to leave one blank if you don&apos;t know it.
      </p>
    </section>
  );
}
