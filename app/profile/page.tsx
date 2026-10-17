"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudentId } from "@/lib/student";
import { usePomodoro } from "@/lib/pomodoro";
import { verdict } from "@/components/Results";
import type { ProfileUnit } from "@/app/api/profile/route";

interface Profile {
  courses: number;
  units: ProfileUnit[];
  totals: { topics: number; learned: number; finished: number; before: number | null; after: number | null };
}

const pct = (x: number) => Math.round(x * 100);

// The student's profile: overall progress and before-and-after across every unit.
export default function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = usePomodoro();

  useEffect(() => {
    fetch(`/api/profile?student=${getStudentId()}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setP(d)))
      .catch(() => setError("Couldn't reach Study Pal. Check your connection."));
  }, []);

  if (error) return <p className="mt-16 text-center text-muted">{error}</p>;
  if (!p) {
    return (
      <div className="mt-24 grid place-items-center">
        <div className="w-10 h-10 rounded-full bg-sage-soft animate-breathe" />
      </div>
    );
  }

  const { totals } = p;
  const hasScores = totals.before !== null && totals.after !== null;
  const v = hasScores ? verdict(totals.after!) : null;
  const byCourse = p.units.reduce<Record<string, ProfileUnit[]>>((m, u) => ((m[u.course] ??= []).push(u), m), {});

  return (
    <section className="mt-6 animate-rise">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-sage text-bg grid place-items-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Your progress</h1>
          <p className="text-sm text-muted">
            {p.courses} course{p.courses === 1 ? "" : "s"} · {p.units.length} unit{p.units.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {hasScores ? (
        <div className="mt-6 rounded-2xl bg-surface border border-line p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Overall, before and after</p>
          <p className="mt-2 text-2xl font-extrabold text-sage">{v!.title}</p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div className="rounded-2xl bg-bg border border-line py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Before</p>
              <p className="mt-1 text-3xl font-extrabold text-muted">{pct(totals.before!)}%</p>
            </div>
            <div className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${totals.after! > totals.before! ? "bg-sage text-bg" : "bg-clay-soft"}`}>
              {pct(totals.after!) - pct(totals.before!) > 0 ? "+" : ""}
              {pct(totals.after!) - pct(totals.before!)}
            </div>
            <div className="rounded-2xl bg-sage-soft py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">After</p>
              <p className="mt-1 text-3xl font-extrabold text-sage">{pct(totals.after!)}%</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">Across the {totals.finished} topics where you&apos;ve done the final test (counting retakes).</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-sky-soft p-5 text-sm">
          <p className="font-bold">Your before-and-after shows here</p>
          <p className="mt-1">Finish a round (first test, lessons, final test) and your improvement appears on this page.</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { n: totals.learned, label: "topics learned" },
          { n: totals.finished, label: "final tests" },
          { n: timer.done, label: "focus sessions today" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface border border-line py-3 px-1">
            <p className="text-2xl font-extrabold">{s.n}</p>
            <p className="text-xs text-muted leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {Object.entries(byCourse).map(([course, units]) => (
        <div key={course} className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{course}</p>
          <ul className="space-y-3">
            {units.map((u) => (
              <li key={u.id}>
                <Link href={`/unit/${u.id}`} className="block rounded-2xl bg-surface border border-line p-4 active:scale-[0.99] transition">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-bold">{u.name}</p>
                    {u.before !== null && u.after !== null && (
                      <p className={`shrink-0 text-sm font-bold ${u.after > u.before ? "text-sage" : "text-muted"}`}>
                        {pct(u.before)}% → {pct(u.after)}%
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {u.topics} topics · {u.tested} tested · {u.learned} learned · {u.finished} finished
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-sage rounded-full" style={{ width: `${u.topics ? Math.max(3, (u.finished / u.topics) * 100) : 0}%` }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {p.units.length === 0 && (
        <Link href="/add" className="mt-6 block rounded-xl bg-sage text-bg py-3 text-center font-bold">Add your first unit</Link>
      )}

      <p className="mt-8 text-center text-xs text-muted">
        No sign-in: your progress is tied to this phone&apos;s browser.
      </p>
    </section>
  );
}
