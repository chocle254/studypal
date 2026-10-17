"use client";

import { clock, type usePomodoro } from "@/lib/pomodoro";

// The focus timer panel that drops down under the navbar: a ring, the time, and simple controls.
export default function Pomodoro({ p, onClose }: { p: ReturnType<typeof usePomodoro>; onClose: () => void }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const progress = 1 - p.left / p.total;
  const focus = p.mode === "focus";

  return (
    <div className="max-w-xl mx-auto px-4 pb-4 animate-rise">
      <div className="rounded-2xl bg-surface border border-line p-5">
        <div className="flex items-center justify-between">
          <div className="flex rounded-full bg-bg border border-line p-1 text-sm font-semibold">
            {(["focus", "break"] as const).map((m) => (
              <button
                key={m}
                onClick={() => p.switchTo(m)}
                className={`px-4 py-1.5 rounded-full transition ${p.mode === m ? (m === "focus" ? "bg-clay text-bg" : "bg-sage text-bg") : "text-muted"}`}
              >
                {m === "focus" ? "Focus 25" : "Break 5"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-sm text-muted underline underline-offset-4">Hide</button>
        </div>

        <div className="mt-4 grid place-items-center">
          <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden>
            <circle cx="90" cy="90" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
            <circle
              cx="90" cy="90" r={r} fill="none"
              stroke={focus ? "var(--clay)" : "var(--sage)"} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
              transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
            <text x="90" y="88" textAnchor="middle" fontSize="34" fontWeight="800" fill="currentColor">{clock(p.left)}</text>
            <text x="90" y="114" textAnchor="middle" fontSize="13" fill="var(--muted)">
              {focus ? (p.running ? "Stay with it" : "Ready to focus?") : "Stretch, drink water"}
            </text>
          </svg>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={p.reset} className="flex-1 rounded-xl border border-line py-3 font-semibold">Reset</button>
          <button
            onClick={p.running ? p.pause : p.start}
            className={`flex-[2] rounded-xl py-3 font-bold text-bg active:scale-[0.98] transition ${focus ? "bg-clay" : "bg-sage"}`}
          >
            {p.running ? "Pause" : p.left < p.total ? "Resume" : focus ? "Start focusing" : "Start break"}
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          {p.done === 0 ? "No focus sessions yet today." : `🍅 ${p.done} focus session${p.done === 1 ? "" : "s"} today.`} A chime plays when time is up.
        </p>
      </div>
    </div>
  );
}
