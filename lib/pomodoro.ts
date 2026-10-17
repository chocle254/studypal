"use client";

// A 25/5 pomodoro timer whose state lives in the phone's storage, so it keeps time across pages and reloads.
import { useEffect, useState } from "react";

export type Mode = "focus" | "break";
export const LENGTH: Record<Mode, number> = { focus: 25 * 60, break: 5 * 60 };

interface State {
  mode: Mode;
  endAt: number | null; // when running: the time it ends (ms)
  left: number; // when paused: seconds left
  done: number; // focus sessions finished today
  day: string;
}

const KEY = "studypal.pomodoro";
const today = () => new Date().toDateString();
const fresh = (day = ""): State => ({ mode: "focus", endAt: null, left: LENGTH.focus, done: 0, day });

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null") as State | null;
    if (!s) return fresh(today());
    return s.day === today() ? s : { ...s, done: 0, day: today() };
  } catch {
    return fresh(today());
  }
}
function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode: the timer still works for this page */
  }
}

// A soft two-note chime and a buzz when a session ends.
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.35;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
  } catch {
    /* no sound available */
  }
  navigator.vibrate?.([200, 100, 200]);
}

export function usePomodoro() {
  const [s, setS] = useState<State>(() => fresh()); // filled from storage after the page loads
  const [now, setNow] = useState(0);

  useEffect(() => {
    setS(load());
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    const sync = (e: StorageEvent) => e.key === KEY && setS(load());
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = (next: State) => {
    save(next);
    setS(next);
  };

  const running = s.endAt !== null;
  const left = running ? Math.max(0, Math.ceil((s.endAt! - now) / 1000)) : s.left;

  // When a session ends: chime, then switch. A finished focus starts the break by itself; after a break, wait for the student.
  useEffect(() => {
    if (!running || left > 0) return;
    chime();
    if (s.mode === "focus") {
      update({ ...s, mode: "break", endAt: Date.now() + LENGTH.break * 1000, left: LENGTH.break, done: s.done + 1 });
    } else {
      update({ ...s, mode: "focus", endAt: null, left: LENGTH.focus });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, left]);

  return {
    mode: s.mode,
    running,
    left,
    done: s.done,
    total: LENGTH[s.mode],
    start: () => update({ ...s, endAt: Date.now() + left * 1000 }),
    pause: () => update({ ...s, endAt: null, left }),
    reset: () => update({ ...s, endAt: null, left: LENGTH[s.mode] }),
    switchTo: (mode: Mode) => update({ ...s, mode, endAt: null, left: LENGTH[mode] }),
  };
}

export const clock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
