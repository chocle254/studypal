"use client";

import { useState } from "react";
import { getStudentId } from "@/lib/student";
import type { MarkedAnswer, PublicQuestion, Style } from "@/lib/types";

// The short check at the end of a lesson: 3 questions, marked right away, with a line of feedback on each.
export default function TopicCheck({
  unitId,
  topic,
  style,
  questions,
  kind = "check",
  nextLabel,
  onNext,
  onBack,
}: {
  unitId: string;
  topic: number;
  style: Style;
  questions: PublicQuestion[];
  kind?: "check" | "retake";
  nextLabel: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; results: MarkedAnswer[] } | null>(null);

  async function submit() {
    if (marking) return;
    setMarking(true);
    setError(null);
    try {
      const res = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: getStudentId(),
          unit: unitId,
          topic,
          kind,
          style,
          answers: Object.fromEntries(questions.map((q) => [q.id, answers[q.id] ?? ""])),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't mark your answers. Please try again.");
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't mark your answers.");
    } finally {
      setMarking(false);
    }
  }

  const verdict = result
    ? result.score >= 0.8
      ? { title: "You've got it!", line: "That topic is yours now.", tone: "bg-sage-soft" }
      : result.score >= 0.5
        ? { title: "Nearly there", line: "Most of it stuck. Glance at the notes below, then carry on.", tone: "bg-sky-soft" }
        : { title: "Still settling in", line: "That's normal on a first pass. Read the notes below; you can open the lesson again anytime.", tone: "bg-clay-soft" }
    : null;

  return (
    <section className="mt-4 animate-rise">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">
        {kind === "retake" ? `Retake · ${questions.length} new questions` : `Quick check · ${questions.length} questions`}
      </p>

      {result && verdict && (
        <div className={`mt-3 rounded-2xl p-4 ${verdict.tone} animate-rise`}>
          <p className="text-lg font-extrabold">{verdict.title}</p>
          <p className="mt-1 text-sm">{verdict.line}</p>
        </div>
      )}

      <ol className="mt-4 space-y-4">
        {questions.map((q, n) => {
          const r = result?.results.find((x) => x.id === q.id);
          return (
            <li key={q.id} className="rounded-2xl bg-surface border border-line p-4">
              <p className="font-semibold leading-snug">
                <span className="text-sage mr-1">{n + 1}.</span> {q.prompt}
              </p>
              {q.type === "choice" && q.options ? (
                <div className="mt-3 space-y-2">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      disabled={!!result}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm transition ${
                        answers[q.id] === o ? "border-sage bg-sage-soft font-semibold" : "border-line bg-bg"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] ?? ""}
                  disabled={!!result}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Answer in your own words…"
                  className="mt-3 w-full h-20 rounded-xl bg-bg border border-line px-3 py-2.5 text-base outline-none focus:border-sage transition disabled:opacity-80"
                />
              )}
              {r && (
                <p className={`mt-2 text-sm rounded-lg px-3 py-2 ${r.score >= 1 ? "bg-sage-soft" : r.score > 0 ? "bg-sky-soft" : "bg-clay-soft"}`}>
                  <span className="font-bold">{r.score >= 1 ? "✓ " : r.score > 0 ? "Partly. " : "Not quite. "}</span>
                  {r.feedback}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {error && <p className="mt-4 text-sm text-clay">{error}</p>}

      {!result ? (
        <div className="mt-5 space-y-2">
          <button onClick={submit} disabled={marking}
            className="w-full rounded-xl bg-sage text-bg font-bold py-3.5 active:scale-[0.98] transition disabled:opacity-70">
            {marking ? "Marking…" : "Check my answers"}
          </button>
          <button onClick={onBack} className="w-full rounded-xl border border-line py-3 font-semibold">Back to the lesson</button>
        </div>
      ) : (
        <button onClick={onNext} className="mt-5 w-full rounded-xl bg-sage text-bg py-3.5 font-bold active:scale-[0.98] transition">
          {nextLabel}
        </button>
      )}
    </section>
  );
}
