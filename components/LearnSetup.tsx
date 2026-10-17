"use client";

import { useState } from "react";
import { STYLES, type Style } from "@/lib/types";

// After the first test: pick how to be taught, and where to start.
export default function LearnSetup({
  topics,
  suggested,
  currentStyle,
  allowEmpty = false,
  onSave,
}: {
  topics: { index: number; title: string; score: number }[]; // this round's topics
  suggested: number[]; // Study Pal's suggested order
  currentStyle: Style | null;
  allowEmpty?: boolean; // every topic is strong: the plan may be empty
  onSave: (style: Style, plan: number[]) => Promise<void>;
}) {
  const [style, setStyle] = useState<Style | null>(currentStyle);
  const [custom, setCustom] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set(suggested));
  const [saving, setSaving] = useState(false);

  const plan = custom ? topics.map((t) => t.index).filter((i) => picked.has(i)) : suggested;

  async function save() {
    if (!style || (!plan.length && !allowEmpty) || saving) return;
    setSaving(true);
    await onSave(style, plan);
    setSaving(false);
  }

  return (
    <div className="mt-6 rounded-2xl bg-surface border border-line p-5 animate-rise">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">How would you like to learn?</p>
      <div className="mt-3 space-y-2">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStyle(s.id)}
            className={`w-full text-left rounded-xl border p-3 transition active:scale-[0.99] ${
              style === s.id ? "border-sage bg-sage-soft" : "border-line bg-bg"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">{s.name}</span>
              <span className="text-xs text-muted">{s.blurb}</span>
            </div>
            <p className="mt-1 text-sm italic text-muted">&ldquo;{s.sample}&rdquo;</p>
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs font-bold uppercase tracking-wider text-muted">Where to start</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setCustom(false)}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${!custom ? "border-sage bg-sage-soft" : "border-line"}`}
        >
          Study Pal&apos;s suggestion
        </button>
        <button
          onClick={() => setCustom(true)}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${custom ? "border-sage bg-sage-soft" : "border-line"}`}
        >
          Choose topics
        </button>
      </div>

      <ol className="mt-3 space-y-2">
        {(custom ? topics : topics.filter((t) => suggested.includes(t.index)).sort((a, b) => suggested.indexOf(a.index) - suggested.indexOf(b.index))).map((t, n) => (
          <li key={t.index}>
            {custom ? (
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-[var(--sage)]"
                  checked={picked.has(t.index)}
                  onChange={(e) =>
                    setPicked((p) => {
                      const next = new Set(p);
                      if (e.target.checked) next.add(t.index);
                      else next.delete(t.index);
                      return next;
                    })
                  }
                />
                <span className="flex-1">{t.title}</span>
                <span className={`text-xs ${t.score >= 0.7 ? "text-sage" : "text-clay"}`}>{Math.round(t.score * 100)}%</span>
              </label>
            ) : (
              <div className="flex gap-2 text-sm">
                <span className="w-5 h-5 shrink-0 rounded-full bg-clay-soft grid place-items-center text-xs font-bold">{n + 1}</span>
                <span>{t.title}</span>
              </div>
            )}
          </li>
        ))}
      </ol>

      <button
        onClick={save}
        disabled={!style || (!plan.length && !allowEmpty) || saving}
        className="mt-5 w-full rounded-xl bg-sage text-bg font-bold py-3.5 active:scale-[0.98] transition disabled:opacity-50"
      >
        {saving ? "Saving…" : !style ? "Pick a style first" : !plan.length && !allowEmpty ? "Pick at least one topic" : "Start learning"}
      </button>
    </div>
  );
}
