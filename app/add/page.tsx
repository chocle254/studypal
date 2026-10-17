"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getStudentId } from "@/lib/student";
import { readPdfText, cleanText, UnreadableFileError } from "@/lib/pdf";
import type { HomeCourse } from "@/lib/types";
import { pickFacts, prepareTopics } from "@/lib/prepare";
import Preparing from "@/components/Preparing";
import { roundTopics } from "@/lib/batches";

type Stage = "course" | "unit" | "reading" | "questions";

const field =
  "w-full rounded-xl bg-surface border border-line px-4 py-3 text-base outline-none focus:border-sage transition";

export default function AddPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("course");
  const [courses, setCourses] = useState<HomeCourse[]>([]);
  const [course, setCourse] = useState("");
  const [level, setLevel] = useState("");
  const [unit, setUnit] = useState("");
  const [currentTopic, setCurrentTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [facts, setFacts] = useState<string[]>([]);
  const [note, setNote] = useState<string | undefined>();
  const [topics, setTopics] = useState<string[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const busy = useRef(false);

  useEffect(() => {
    fetch(`/api/home?student=${getStudentId()}`)
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {});
  }, []);

  function nextFromCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!course.trim()) return setError("What's the course called?");
    setError(null);
    setStage("unit");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return; // ignore extra taps while working
    setError(null);
    if (!unit.trim()) return setError("Give the unit a name.");
    if (!pasteMode && !file) return setError("Pick the PDF for this unit, or paste its text.");
    busy.current = true;

    let text: string;
    try {
      text = pasteMode ? cleanText(pasted) : await readPdfText(file!);
    } catch (err) {
      busy.current = false;
      return setError(
        err instanceof UnreadableFileError ? err.message : "I couldn't read that file. Try another PDF, or paste the text.",
      );
    }

    setFacts(pickFacts(text));
    // Long PDFs (a whole book) are trimmed for the AI's free limits; say so honestly.
    setNote(
      text.length > 24_000
        ? "This PDF is long, so Study Pal is reading its first part. For best results, add one chapter or set of notes at a time."
        : undefined,
    );
    setStage("reading");

    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: getStudentId(), course, level, unit, currentTopic, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error || "Something went wrong. Please try again.");

      // Only the first round (up to 4 topics) is prepared now; later rounds when the student gets there.
      const first = roundTopics(0, data.topics.length);
      setTopics(first.map((n) => data.topics[n]));
      setDone(new Set());
      setStage("questions");
      const result = await prepareTopics(data.id, first, (n) => setDone((d) => new Set(d).add(n)));
      // Even if one topic failed, the unit is saved: the unit page offers to finish preparing.
      router.push(`/unit/${data.id}`);
      if (!result.ok) console.warn(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStage("unit");
      busy.current = false;
    }
  }

  if (stage === "reading" || stage === "questions") {
    return <Preparing facts={facts} topics={topics} done={done} phase={stage} note={note} />;
  }

  return (
    <section className="mt-6 animate-rise">
      <p className="text-sm text-muted">{stage === "course" ? "Step 1 of 2" : "Step 2 of 2"}</p>
      <h1 className="mt-1 text-2xl font-extrabold">{stage === "course" ? "Your course" : "Add a unit"}</h1>

      {stage === "course" ? (
        <form onSubmit={nextFromCourse} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Course</span>
            <input className={`${field} mt-1`} value={course} onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. Building Construction" autoFocus />
          </label>
          {courses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => (
                <button type="button" key={c.id}
                  onClick={() => { setCourse(c.name); setLevel(c.level); }}
                  className="px-3 py-1.5 rounded-full bg-sage-soft text-sm active:scale-95 transition">
                  {c.name}{c.level ? ` · ${c.level}` : ""}
                </button>
              ))}
            </div>
          )}
          <label className="block">
            <span className="text-sm font-semibold">Your level</span>
            <input className={`${field} mt-1`} value={level} onChange={(e) => setLevel(e.target.value)}
              placeholder="e.g. Diploma, Year 2" />
          </label>
          {error && <p className="text-sm text-clay">{error}</p>}
          <button className="w-full rounded-xl bg-sage text-bg font-bold py-3.5 active:scale-[0.98] transition">
            Next
          </button>
        </form>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <p className="text-sm text-muted">{course}{level ? ` · ${level}` : ""}</p>
          <label className="block">
            <span className="text-sm font-semibold">Unit name</span>
            <input className={`${field} mt-1`} value={unit} onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. Foundations" autoFocus />
          </label>

          {!pasteMode ? (
            <label className="block">
              <span className="text-sm font-semibold">Study material (PDF)</span>
              <div className={`${field} mt-1 flex items-center gap-3`}>
                <span className="w-9 h-9 rounded-lg bg-clay-soft grid place-items-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
                  </svg>
                </span>
                <span className="truncate text-sm">{file ? file.name : "Tap to pick a PDF from your phone"}</span>
              </div>
              <input type="file" accept="application/pdf,.pdf" className="sr-only"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }} />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-semibold">Paste the unit&apos;s text</span>
              <textarea className={`${field} mt-1 h-40`} value={pasted} onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste your notes here…" />
            </label>
          )}
          <button type="button" onClick={() => setPasteMode((p) => !p)} className="text-sm text-sage font-semibold">
            {pasteMode ? "Pick a PDF instead" : "No PDF? Paste the text instead"}
          </button>

          <label className="block">
            <span className="text-sm font-semibold">Which topic are you at?</span>
            <input className={`${field} mt-1`} value={currentTopic} onChange={(e) => setCurrentTopic(e.target.value)}
              placeholder="e.g. Types of foundations (leave empty for all)" />
          </label>

          {error && <p className="text-sm text-clay">{error}</p>}
          <button className="w-full rounded-xl bg-sage text-bg font-bold py-3.5 active:scale-[0.98] transition">
            Read my unit
          </button>
          <button type="button" onClick={() => { setError(null); setStage("course"); }}
            className="w-full text-sm text-muted py-2">
            Back
          </button>
        </form>
      )}
    </section>
  );
}
