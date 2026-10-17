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

// The unit screen: the rounds read so far, each with its topics.
// The test flow is added in slice 3.
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
  const currentRound = Math.max(0, rounds - 1); // the latest round read; the test flow refines this in slice 3

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

      <div className="mt-6 rounded-2xl bg-clay-soft p-4 text-sm">
        Next up: a quick test to see what you already know. <span className="text-muted">(Coming in the next step.)</span>
      </div>

      {unit.can_read_more && notReady === 0 && (
        <div className="mt-4 rounded-2xl border border-line p-4 text-sm">
          <p className="font-semibold">There&apos;s more in your PDF.</p>
          <p className="mt-1 text-muted">Study Pal reads about 15 pages per round. When you finish this round, read the next part.</p>
          <button onClick={readNext} className="mt-3 w-full rounded-xl border border-sage text-sage font-bold py-3 active:scale-[0.98] transition">
            Read the next part
          </button>
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
