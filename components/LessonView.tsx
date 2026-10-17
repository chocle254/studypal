"use client";

import { useEffect, useState } from "react";
import { getStudentId } from "@/lib/student";
import { STYLES, type PublicLesson, type Style } from "@/lib/types";
import Diagram from "@/components/Diagram";
import LessonText from "@/components/LessonText";
import CodeBlock from "@/components/CodeBlock";
import TopicCheck from "@/components/TopicCheck";

// A lesson for one topic, one step at a time, each with a simple drawing.
export default function LessonView({
  unitId,
  topic,
  title,
  keyParts,
  style,
  quick,
  nextTitle,
  onNext,
  onDone,
  onExit,
}: {
  unitId: string;
  topic: number;
  title: string;
  keyParts: string[];
  style: Style;
  quick: boolean;
  nextTitle?: string; // the next topic in the student's learning path, if any
  onNext?: () => void;
  onDone: () => void;
  onExit: () => void;
}) {
  const [lesson, setLesson] = useState<PublicLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [tip, setTip] = useState(0);
  const [checking, setChecking] = useState(false);

  async function fetchLesson() {
    setError(null);
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: getStudentId(), unit: unitId, topic, style, quick }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.lesson) throw new Error(data.error || "Couldn't write this lesson.");
      setLesson(data.lesson);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write this lesson.");
    }
  }

  useEffect(() => {
    fetchLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, topic, style, quick]);

  // While the lesson is being written, cycle through the topic's key parts.
  useEffect(() => {
    if (lesson || !keyParts.length) return;
    const t = setInterval(() => setTip((n) => (n + 1) % keyParts.length), 3500);
    return () => clearInterval(t);
  }, [lesson, keyParts.length]);

  const styleName = STYLES.find((s) => s.id === style)?.name ?? style;

  if (error) {
    return (
      <section className="mt-16 text-center">
        <p className="text-muted">{error}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={onExit} className="rounded-xl border border-line px-4 py-2 text-sm">Back</button>
          <button onClick={fetchLesson} className="rounded-xl bg-sage text-bg px-4 py-2 text-sm font-bold">Try again</button>
        </div>
      </section>
    );
  }

  if (!lesson) {
    return (
      <section className="mt-16 text-center animate-rise">
        <div className="mx-auto relative w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-sage-soft animate-breathe" />
          <div className="absolute inset-3 rounded-full bg-sage/60 animate-breathe" style={{ animationDelay: "0.6s" }} />
        </div>
        <p className="mt-6 font-bold">Writing your lesson on {title}…</p>
        <p className="mt-1 text-sm text-muted">In &ldquo;{styleName}&rdquo; style, with drawings.</p>
        {keyParts.length > 0 && (
          <p key={tip} className="mt-6 mx-auto max-w-xs rounded-xl bg-surface border border-line px-4 py-3 text-sm animate-rise">
            Coming up: <span className="font-semibold">{keyParts[tip]}</span>
          </p>
        )}
      </section>
    );
  }

  const nextLabel = nextTitle && onNext ? `Next topic: ${nextTitle} →` : "Done — back to my unit";
  const goOn = () => (nextTitle && onNext ? onNext() : onDone());

  if (checking && lesson.check.length) {
    return (
      <>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted">{title}</p>
          <button onClick={onExit} className="text-sm text-muted underline underline-offset-4">Close</button>
        </div>
        <TopicCheck
          unitId={unitId}
          topic={topic}
          style={style}
          questions={lesson.check}
          nextLabel={nextLabel}
          onNext={goOn}
          onBack={() => setChecking(false)}
        />
      </>
    );
  }

  const s = lesson.steps[step];
  const last = step === lesson.steps.length - 1;

  return (
    <section className="mt-4 animate-rise">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {lesson.quick ? "Quick brush-through" : "Lesson"} · {styleName}
        </p>
        <button onClick={onExit} className="text-sm text-muted underline underline-offset-4">Close</button>
      </div>
      <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
      {step === 0 && <p className="mt-2 text-muted">{lesson.intro}</p>}

      <div className="mt-4 flex gap-1.5">
        {lesson.steps.map((_, n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full transition ${n <= step ? "bg-sage" : "bg-line"}`} />
        ))}
      </div>

      <article key={step} className="mt-4 rounded-2xl bg-surface border border-line overflow-hidden animate-rise">
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Step {step + 1} of {lesson.steps.length}</p>
          <p className="mt-1 text-lg font-bold">{s.title}</p>
          <LessonText text={s.text} />
        </div>
        {s.code && <CodeBlock language={s.code.language} code={s.code.code} />}
        {s.diagram && <Diagram d={s.diagram} />}
      </article>

      {!last ? (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setStep((n) => Math.max(0, n - 1))}
            disabled={step === 0}
            className="flex-1 rounded-xl border border-line py-3 font-semibold disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={() => {
              setStep((n) => n + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex-[2] rounded-xl bg-sage text-bg py-3 font-bold active:scale-[0.98] transition"
          >
            Next
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {lesson.check.length > 0 && !lesson.quick ? (
            <button
              onClick={() => {
                setChecking(true);
                window.scrollTo({ top: 0 });
              }}
              className="w-full rounded-xl bg-sage text-bg py-3.5 font-bold active:scale-[0.98] transition"
            >
              Check what you learned →
            </button>
          ) : (
            <button onClick={goOn} className="w-full rounded-xl bg-sage text-bg py-3.5 font-bold active:scale-[0.98] transition">
              {nextLabel}
            </button>
          )}
          <button onClick={() => setStep((n) => Math.max(0, n - 1))} className="w-full rounded-xl border border-line py-3 font-semibold">
            Back
          </button>
        </div>
      )}
    </section>
  );
}
