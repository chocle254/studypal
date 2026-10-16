"use client";

import Link from "next/link";
import { useState } from "react";

// Top navbar: burger (courses) on the far left; pomodoro and avatar on the far right.
// The courses dropdown, timer and profile are completed in slice 6.
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-line">
      <nav className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            aria-label="Courses"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
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
            className="h-9 px-3 rounded-full bg-clay-soft text-ink text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2M9 2h6" />
            </svg>
            25:00
          </button>
          <Link
            href="/profile"
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

      {menuOpen && (
        <div className="max-w-xl mx-auto px-4 pb-3 animate-rise">
          <div className="rounded-2xl bg-surface border border-line p-3 text-sm text-muted">
            Your courses will show here.
          </div>
        </div>
      )}
    </header>
  );
}
