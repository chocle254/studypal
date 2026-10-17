"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudentId } from "@/lib/student";
import type { HomeCourse } from "@/lib/types";
import Pomodoro from "@/components/Pomodoro";
import { clock, usePomodoro } from "@/lib/pomodoro";

// Top navbar: burger (courses) on the far left; pomodoro and avatar on the far right.
// The pomodoro button shows the live time and opens the timer panel.
// The burger opens a dropdown of the student's courses and units.
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const p = usePomodoro();
  const [courses, setCourses] = useState<HomeCourse[] | null>(null);
  // Load the courses each time the menu opens, so new units show up.
  useEffect(() => {
    if (!menuOpen) return;
    fetch(`/api/home?student=${getStudentId()}`)
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => setCourses([]));
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-line">
      <nav className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            aria-label="Courses"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((o) => !o);
              setTimerOpen(false);
            }}
            className="w-10 h-10 -ml-2 grid place-items-center rounded-xl active:bg-sage-soft"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>
          <Link href="/" className="font-extrabold tracking-tight text-lg">
            Study <span className="text-sage">Pal</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Pomodoro focus timer"
            aria-expanded={timerOpen}
            onClick={() => {
              setTimerOpen((o) => !o);
              setMenuOpen(false);
            }}
            className={`h-9 px-3 rounded-full text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition tabular-nums ${
              p.running ? (p.mode === "focus" ? "bg-clay text-bg" : "bg-sage text-bg") : "bg-clay-soft text-ink"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2M9 2h6" />
            </svg>
            {clock(p.left)}
          </button>
          <Link
            href="/profile"
            onClick={() => {
              setMenuOpen(false);
              setTimerOpen(false);
            }}
            aria-label="Your profile"
            className="w-9 h-9 rounded-full bg-sage text-bg grid place-items-center font-bold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          </Link>
        </div>
      </nav>

      {timerOpen && <Pomodoro p={p} onClose={() => setTimerOpen(false)} />}

      {menuOpen && (
        <div className="max-w-xl mx-auto px-4 pb-4 animate-rise">
          {/* Tapping any link inside closes the menu. */}
          <div
            onClick={(e) => (e.target as HTMLElement).closest("a") && setMenuOpen(false)}
            className="rounded-2xl bg-surface border border-line p-3 max-h-[70vh] overflow-y-auto"
          >
            <p className="px-2 pt-1 text-xs font-bold uppercase tracking-wider text-muted">Your courses</p>
            {courses === null ? (
              <p className="px-2 py-3 text-sm text-muted animate-pulse">Loading…</p>
            ) : courses.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted">No courses yet.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {courses.map((c) => (
                  <li key={c.id}>
                    <p className="px-2 text-sm font-bold">
                      {c.name}
                      {c.level && <span className="font-normal text-muted"> · {c.level}</span>}
                    </p>
                    <ul className="mt-1">
                      {c.units.map((u) => (
                        <li key={u.id}>
                          <Link href={`/unit/${u.id}`} className="flex items-center justify-between rounded-xl px-2 py-2 text-sm active:bg-sage-soft">
                            <span>{u.name}</span>
                            <span className="text-xs text-muted">{u.topics} topics</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/add" className="rounded-xl bg-sage text-bg py-2.5 text-center text-sm font-bold">+ Add a unit</Link>
              <Link href="/profile" className="rounded-xl border border-line py-2.5 text-center text-sm font-semibold">My progress</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
