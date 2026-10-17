"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStudentId } from "@/lib/student";
import type { PublicUnit } from "@/lib/types";
import { Artwork } from "@/components/UnitCard";
import Preparing from "@/components/Preparing";
import { prepareTopics } from "@/lib/prepare";
import { roundCount, roundTopics } from "@/lib/batches";

// The unit screen. For now it shows the topics the AI found; the test flow arrives in slice 3.
export default function UnitView() {
  const { id } = useParams<{ id: string }>();
  const [unit, setUnit] = useState<PublicUnit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [prepError, setPrepError] = useState<string | null>(null);
  const currentRound = 0; // the round the student is on; moves forward once tests exist (slice 3)

  function load() {
    return fetch(`/api/units/${id}?student=${getStudentId()}`)
      .then((r) => r.json())
      .then((d) => (d.unit ? setUnit(d.unit) : setError(d.error || "Couldn't find this unit.")))
      .catch(() => setError("Couldn't reach Study Pal. Check your connection."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function finishPreparing() {
    if (!unit) return;
    setPrepError(null);
    const round = roundTopics(currentRound, unit.topics.length);
    setDone(new Set(round.filter((n) => unit.topics[n].ready).map((n) => round.indexOf(n))));
    setPreparing(true);
    const missing = round.filter((n) => !unit.topics[n].ready);
    const result = await prepareTopics(unit.id, missing, (n) => setDone((d) => new Set(d).add(round.indexOf(n))));
    if (!result.ok) setPrepError(result.error);
    await load();
    setPreparing(false);
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

  if (preparing) {
    return (
      <Preparing
        facts={roundTopics(currentRound, unit.topics.length).flatMap((n) =>
          unit.topics[n].key_parts.map((k) => `${unit.topics[n].title}: ${k}`),
        )}
        topics={roundTopics(currentRound, unit.topics.length).map((n) => unit.topics[n].title)}
        done={done}
        phase="questions"
      />
    );
  }

  const rounds = roundCount(unit.topics.length);
  const notReady = roundTopics(currentRound, unit.topics.length).filter((n) => !unit.topics[n].ready).length;

  return (
    <section className="mt-4 animate-rise">
      <div className="h-28 rounded-2xl overflow-hidden">
        <Artwork seed={unit.name + unit.id} />
      </div>
      <p className="mt-4 text-sm text-muted">{unit.course}{unit.level ? ` · ${unit.level}` : ""}</p>
      <h1 className="text-2xl font-extrabold">{unit.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {unit.topics.length} topic{unit.topics.length === 1 ? "" : "s"}, up to where you are
      </p>

      {Array.from({ length: rounds }, (_, r) => (
        <div key={r} className="mt-5">
          {rounds > 1 && (
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
              Round {r + 1} of {rounds}
              {r === currentRound ? " · you are here" : r > currentRound ? " · prepared when you get here" : ""}
            </p>
          )}
          <ol className="space-y-3">
            {roundTopics(r, unit.topics.length).map((i) => {
              const t = unit.topics[i];
              return (
                <li key={i} className={`rounded-2xl bg-surface border border-line p-4 animate-rise ${r > currentRound ? "opacity-60" : ""}`}
                  style={{ animationDelay: `${i * 70}ms` }}>
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

      {notReady > 0 && (
        <div className="mt-6 rounded-2xl bg-sky-soft p-4 text-sm">
          <p className="font-semibold">
            {notReady} topic{notReady === 1 ? "" : "s"} in this round still need{notReady === 1 ? "s" : ""} test questions.
          </p>
          {prepError && <p className="mt-1 text-clay">{prepError}</p>}
          <button onClick={finishPreparing}
            className="mt-3 w-full rounded-xl bg-sage text-bg font-bold py-3 active:scale-[0.98] transition">
            Finish preparing
          </button>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-clay-soft p-4 text-sm">
        Next up: a quick test to see what you already know. <span className="text-muted">(Coming in the next step.)</span>
      </div>
    </section>
  );
}
