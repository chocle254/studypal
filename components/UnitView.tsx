"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStudentId } from "@/lib/student";
import type { PublicUnit } from "@/lib/types";
import { Artwork } from "@/components/UnitCard";
import Preparing from "@/components/Preparing";
import { prepareTopics } from "@/lib/prepare";
import { roundCount, roundTopics } from "@/lib/batches";
import TestView from "@/components/TestView";
import Results, { learningPlan, STRONG } from "@/components/Results";
import LearnSetup from "@/components/LearnSetup";
import LessonView from "@/components/LessonView";
import ScoreCompare from "@/components/ScoreCompare";
import { STYLES, type Style } from "@/lib/types";

// The unit screen: the rounds read so far, each with its topics.
// Each round: baseline test → lessons with a check each → final test → before-and-after, then the next part.
export default function UnitView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<PublicUnit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "reading" | "questions">(null);
  const [prepTopics, setPrepTopics] = useState<string[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [prepError, setPrepError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testing, setTesting] = useState<false | "baseline" | "final">(false);
  const [lesson, setLesson] = useState<{ topic: number; quick: boolean; fix?: boolean; fresh?: boolean } | null>(null);
  const [changingStyle, setChangingStyle] = useState(false);

  async function savePlan(style: Style, plan: number[]) {
    if (!unit) return;
    const others = (unit.plan ?? []).filter((i) => !plan.includes(i));
    await fetch(`/api/units/${unit.id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student: getStudentId(), style, plan: [...others, ...plan] }),
    });
    setChangingStyle(false);
    await load();
  }

  function load() {
    return fetch(`/api/units/${id}?student=${getStudentId()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.unit) setUnit(d.unit as PublicUnit);
        else setError(d.error || "Couldn't find this unit.");
        return (d.unit as PublicUnit) ?? null;
      })
      .catch(() => {
        setError("Couldn't reach Study Pal. Check your connection.");
        return null;
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Write questions for every topic in a round that doesn't have them yet.
  async function prepareRound(u: PublicUnit, round: number) {
    const indices = roundTopics(round, u.topics);
    setPrepTopics(indices.map((n) => u.topics[n].title));
    setDone(new Set(indices.flatMap((n, k) => (u.topics[n].ready ? [k] : []))));
    setBusy("questions");
    const missing = indices.filter((n) => !u.topics[n].ready);
    const result = await prepareTopics(u.id, missing, (n) => setDone((d) => new Set(d).add(indices.indexOf(n))));
    if (!result.ok) setPrepError(result.error);
    await load();
    setBusy(null);
  }

  // Read the next part of the PDF (about 15 pages) into a new round, then prepare its questions.
  async function readNext() {
    if (!unit) return;
    setPrepError(null);
    setPrepTopics([]);
    setBusy("reading");
    try {
      const res = await fetch(`/api/units/${unit.id}/read-next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: getStudentId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't read the next part.");
      const fresh = await load();
      if (fresh && data.round !== null) await prepareRound(fresh, data.round);
      else setBusy(null);
    } catch (e) {
      setPrepError(e instanceof Error ? e.message : "Couldn't read the next part.");
      setBusy(null);
    }
  }

  async function removeUnit() {
    const res = await fetch(`/api/units/${id}?student=${getStudentId()}`, { method: "DELETE" });
    if (res.ok) router.push("/");
    else setError("Couldn't delete this unit. Try again.");
  }

  if (error) {
    return (
      <div className="mt-16 text-center">
        <p className="text-muted">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sage font-semibold">Back home</Link>
      </div>
    );
  }
  if (!unit) {
    return (
      <div className="mt-24 grid place-items-center">
        <div className="w-10 h-10 rounded-full bg-sage-soft animate-breathe" />
      </div>
    );
  }

  const rounds = roundCount(unit.topics);
  // The round the student is on: the first one whose final test isn't finished.
  const firstOpen = Array.from({ length: rounds }, (_, r) => r).find((r) =>
    roundTopics(r, unit.topics).some((n) => unit.progress[n]?.final === undefined),
  );
  const currentRound = firstOpen ?? Math.max(0, rounds - 1);
  const roundIdx = roundTopics(currentRound, unit.topics);
  const baselineDone = roundIdx.filter((n) => unit.progress[n]?.baseline !== undefined);
  const baselineComplete = roundIdx.length > 0 && baselineDone.length === roundIdx.length;

  const roundResults = roundIdx.map((n) => ({ index: n, title: unit.topics[n].title, score: unit.progress[n]?.baseline ?? 0 }));
  const allStrong = baselineComplete && roundResults.every((t) => t.score >= STRONG);
  const planForRound = (unit.plan ?? []).filter((i) => roundIdx.includes(i));
  const needsSetup = baselineComplete && (changingStyle || (!allStrong && (!unit.style || planForRound.length === 0)));

  // A topic in the path is finished once its lesson check is done. The final test unlocks when all are finished.
  const checked = (i: number) => unit.progress[i]?.check !== undefined;
  const pathLeft = planForRound.filter((i) => !checked(i));
  const finalDone = roundIdx.filter((n) => unit.progress[n]?.final !== undefined);
  const roundFinished = roundIdx.length > 0 && finalDone.length === roundIdx.length;
  const finishedRounds = Array.from({ length: rounds }, (_, r) => r)
    .filter((r) => roundTopics(r, unit.topics).every((n) => unit.progress[n]?.final !== undefined))
    .reverse();
  const compareFor = (r: number) =>
    roundTopics(r, unit.topics).map((n) => ({
      index: n,
      title: unit.topics[n].title,
      before: unit.progress[n]?.baseline ?? 0,
      after: unit.progress[n]?.final ?? 0,
      retake: unit.progress[n]?.retake,
    }));

  // The next topic in the learning path after the one being taught (lessons flow straight into each other).
  const nextInPath = lesson && !lesson.quick && !lesson.fix ? planForRound[planForRound.indexOf(lesson.topic) + 1] : undefined;

  if (lesson && unit.style) {
    return (
      <LessonView
        key={`${lesson.topic}-${lesson.quick}-${lesson.fix}`}
        unitId={unit.id}
        topic={lesson.topic}
        title={unit.topics[lesson.topic].title}
        keyParts={unit.topics[lesson.topic].key_parts}
        style={unit.style}
        quick={lesson.quick}
        mode={lesson.fix ? "fix" : "full"}
        fresh={lesson.fresh}
        nextTitle={nextInPath !== undefined ? unit.topics[nextInPath].title : undefined}
        onNext={() => {
          if (nextInPath !== undefined) {
            setLesson({ topic: nextInPath, quick: false });
            window.scrollTo({ top: 0 });
          }
        }}
        onDone={async () => {
          setLesson(null);
          await load();
        }}
        onExit={async () => {
          setLesson(null);
          await load();
        }}
      />
    );
  }

  if (testing) {
    return (
      <TestView
        unitId={unit.id}
        round={currentRound}
        kind={testing}
        alreadyDone={testing === "final" ? finalDone : baselineDone}
        onFinished={async () => {
          await load();
          setTesting(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onExit={async () => {
          await load();
          setTesting(false);
        }}
      />
    );
  }

  if (busy) {
    return (
      <Preparing
        facts={unit.topics.flatMap((t) => t.key_parts.map((k) => `${t.title}: ${k}`))}
        topics={prepTopics}
        done={done}
        phase={busy}
      />
    );
  }

  const notReady = roundTopics(currentRound, unit.topics).filter((n) => !unit.topics[n].ready).length;

  return (
    <section className="mt-4 animate-rise">
      <div className="h-28 rounded-2xl overflow-hidden">
        <Artwork seed={unit.name + unit.id} />
      </div>
      <p className="mt-4 text-sm text-muted">{unit.course}{unit.level ? ` · ${unit.level}` : ""}</p>
      <h1 className="text-2xl font-extrabold">{unit.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {unit.topics.length} topic{unit.topics.length === 1 ? "" : "s"} so far
        {unit.pages_read ? ` · pages ${unit.pages_read} read` : unit.parts_total > 1 ? ` · part ${unit.parts_read} of ${unit.parts_total} read` : ""}
      </p>

      {roundFinished && (
        <ScoreCompare
          round={currentRound}
          topics={compareFor(currentRound)}
          onFix={(topic, again) => {
            if (!unit.style) return setChangingStyle(true);
            setLesson({ topic, quick: false, fix: true, fresh: again });
            window.scrollTo({ top: 0 });
          }}
        />
      )}

      {baselineComplete && !roundFinished && <Results topics={roundResults} />}

      {needsSetup && (
        <LearnSetup
          topics={roundResults}
          suggested={learningPlan(roundResults).order.map((t) => t.index)}
          currentStyle={unit.style}
          allowEmpty={allStrong}
          onSave={savePlan}
        />
      )}

      {baselineComplete && !needsSetup && (
        <div className="mt-6 rounded-2xl bg-surface border border-line p-5 animate-rise">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Your learning path</p>
            {unit.style && (
              <button onClick={() => setChangingStyle(true)} className="text-xs text-sage font-semibold">
                {STYLES.find((x) => x.id === unit.style)?.name} · change
              </button>
            )}
          </div>
          {planForRound.length > 0 && (
            <ol className="mt-3 space-y-2">
              {planForRound.map((i, n) => {
                const learned = checked(i);
                const started = unit.style ? unit.lessons[i]?.includes(unit.style) : false;
                return (
                  <li key={i} className="flex items-center gap-3">
                    <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-sm font-bold ${learned ? "bg-sage text-bg" : "bg-clay-soft"}`}>
                      {learned ? "✓" : n + 1}
                    </span>
                    <span className="flex-1 text-sm font-semibold">
                      {unit.topics[i].title}
                      {learned && (
                        <span className="block text-xs font-normal text-muted">Check: {Math.round((unit.progress[i]?.check ?? 0) * 100)}%</span>
                      )}
                      {!learned && started && <span className="block text-xs font-normal text-muted">Check not done yet</span>}
                    </span>
                    <button onClick={() => setLesson({ topic: i, quick: false })}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold ${learned ? "border border-line" : "bg-sage text-bg"}`}>
                      {learned ? "Again" : started ? "Continue" : "Learn"}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {roundResults.filter((t) => t.score >= STRONG && !planForRound.includes(t.index)).map((t) => (
            <div key={t.index} className="mt-3 rounded-xl bg-sage-soft p-3 text-sm">
              <p><span className="font-bold">{t.title}:</span> you are great in this topic, we don&apos;t need to spend time on it.</p>
              <button
                onClick={() => (unit.style ? setLesson({ topic: t.index, quick: true }) : setChangingStyle(true))}
                className="mt-2 text-sage font-bold underline underline-offset-4">
                Brush through it anyway
              </button>
            </div>
          ))}
        </div>
      )}

      {baselineComplete && !needsSetup && !roundFinished && (
        pathLeft.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-clay-soft p-4 animate-rise">
            <p className="font-bold">{finalDone.length ? "Carry on with your final test" : "Ready for the final test"}</p>
            <p className="mt-1 text-sm text-muted">
              Same topics as your first test, new questions. Then you&apos;ll see your before and after.
            </p>
            <button onClick={() => setTesting("final")}
              className="mt-3 w-full rounded-xl bg-sage text-bg font-bold py-3 active:scale-[0.98] transition">
              {finalDone.length ? `Continue (${finalDone.length}/${roundIdx.length} done)` : "Start the final test"}
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
            🔒 The final test unlocks after {pathLeft.length === 1 ? "1 more lesson and its check" : `${pathLeft.length} more lessons and their checks`}.
          </p>
        )
      )}

      {finishedRounds.filter((r) => r !== currentRound).map((r) => (
        <details key={r} className="mt-4 rounded-2xl border border-line px-4 py-3">
          <summary className="text-sm font-semibold">Round {r + 1} results</summary>
          <ScoreCompare
            round={r}
            topics={compareFor(r)}
            onFix={(topic, again) => unit.style && setLesson({ topic, quick: false, fix: true, fresh: again })}
          />
        </details>
      ))}

      {Array.from({ length: rounds }, (_, r) => (
        <div key={r} className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Round {r + 1}
            {r === currentRound ? " · you are here" : ""}
          </p>
          <ol className="space-y-3">
            {roundTopics(r, unit.topics).map((i) => {
              const t = unit.topics[i];
              return (
                <li key={i} className="rounded-2xl bg-surface border border-line p-4 animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-sage-soft grid place-items-center text-sm font-bold">{i + 1}</span>
                    <div>
                      <p className="font-bold leading-snug">{t.title}</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {t.key_parts.map((k, j) => (
                          <li key={j} className="text-xs px-2 py-1 rounded-full bg-bg border border-line text-muted">{k}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      {prepError && <p className="mt-4 text-sm text-clay">{prepError}</p>}

      {notReady > 0 && (
        <div className="mt-6 rounded-2xl bg-sky-soft p-4 text-sm">
          <p className="font-semibold">
            {notReady} topic{notReady === 1 ? "" : "s"} in this round still need{notReady === 1 ? "s" : ""} test questions.
          </p>
          <button onClick={() => prepareRound(unit, currentRound)}
            className="mt-3 w-full rounded-xl bg-sage text-bg font-bold py-3 active:scale-[0.98] transition">
            Finish preparing
          </button>
        </div>
      )}

      {notReady === 0 && !baselineComplete && (
        <div className="mt-6 rounded-2xl bg-clay-soft p-4">
          <p className="font-bold">{baselineDone.length ? "Carry on with your test" : "First, what do you already know?"}</p>
          <p className="mt-1 text-sm text-muted">
            {roundIdx.length} topic{roundIdx.length === 1 ? "" : "s"}, 5 questions each. Answer in your own words; Study Pal
            marks by meaning, not exact wording.
          </p>
          <button onClick={() => setTesting("baseline")}
            className="mt-3 w-full rounded-xl bg-sage text-bg font-bold py-3 active:scale-[0.98] transition">
            {baselineDone.length ? `Continue (${baselineDone.length}/${roundIdx.length} done)` : "Start the test"}
          </button>
        </div>
      )}

      {unit.can_read_more && notReady === 0 && (
        <div className="mt-4 rounded-2xl border border-line p-4 text-sm">
          <p className="font-semibold">There&apos;s more in your PDF.</p>
          {roundFinished ? (
            <>
              <p className="mt-1 text-muted">Round {currentRound + 1} is done. Read the next part (about 15 pages) to start round {currentRound + 2}.</p>
              <button onClick={readNext} className="mt-3 w-full rounded-xl bg-sage text-bg font-bold py-3 active:scale-[0.98] transition">
                Read the next part
              </button>
            </>
          ) : (
            <p className="mt-1 text-muted">🔒 Study Pal reads about 15 pages per round. Finish this round&apos;s final test to unlock the next part.</p>
          )}
        </div>
      )}

      <div className="mt-10 text-center">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-sm text-muted underline underline-offset-4">
            Wrong PDF? Delete this unit
          </button>
        ) : (
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm">Delete &ldquo;{unit.name}&rdquo; and its questions? You can add it again with the right PDF.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-xl border border-line py-2.5 text-sm">Keep it</button>
              <button onClick={removeUnit} className="flex-1 rounded-xl bg-clay text-bg py-2.5 text-sm font-bold">Delete</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
