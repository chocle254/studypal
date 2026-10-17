"use client";

import { useState } from "react";
import { getStudentId } from "@/lib/student";
import type { Style } from "@/lib/types";
import LessonText from "@/components/LessonText";
import CodeBlock from "@/components/CodeBlock";

interface QA {
  q: string;
  a?: string;
  code?: { language: string; code: string };
  error?: string;
}

// "Ask about this": the student types their own question and gets an answer from their material, in their style.
export default function AskBox({
  unitId,
  topic,
  style,
  section,
}: {
  unitId: string;
  topic: number;
  style: Style;
  section: string; // the lesson section they are reading, for context
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState<QA[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    const q = text.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setText("");
    setItems((list) => [...list, { q }]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: getStudentId(), unit: unitId, topic, style, section, question: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't answer that.");
      setItems((list) => list.map((x, i) => (i === list.length - 1 ? { ...x, a: data.answer, code: data.code } : x)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't answer that.";
      setItems((list) => list.map((x, i) => (i === list.length - 1 ? { ...x, error: msg } : x)));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-dashed border-sage/60 py-2.5 text-sm font-semibold text-sage active:scale-[0.98] transition"
      >
        ? Ask about this
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-line bg-surface p-4 animate-rise">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Ask about this</p>
      <ul className="space-y-3">
        {items.map((x, i) => (
          <li key={i} className="mt-3">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-sage text-bg px-3 py-2 text-sm">{x.q}</p>
            {x.a ? (
              <div className="mt-2 rounded-2xl rounded-bl-md bg-bg border border-line px-3 py-1 text-sm">
                <LessonText text={x.a} />
                {x.code && (
                  <div className="-mx-4 mt-2">
                    <CodeBlock language={x.code.language} code={x.code.code} />
                  </div>
                )}
                <div className="h-2" />
              </div>
            ) : x.error ? (
              <p className="mt-2 text-sm text-clay">{x.error}</p>
            ) : (
              <p className="mt-2 text-sm text-muted animate-pulse">Thinking…</p>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="e.g. Why do we split the data 80/20?"
          maxLength={500}
          className="flex-1 min-w-0 rounded-xl bg-bg border border-line px-3 py-2.5 text-base outline-none focus:border-sage"
        />
        <button onClick={ask} disabled={busy || text.trim().length < 3}
          className="rounded-xl bg-sage text-bg px-4 font-bold disabled:opacity-50">
          Ask
        </button>
      </div>
    </div>
  );
}
