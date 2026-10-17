"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getStudentId } from "@/lib/student";
import type { PublicUnit } from "@/lib/types";
import { Artwork } from "@/components/UnitCard";

// The unit screen. For now it shows the topics the AI found; the test flow arrives in slice 3.
export default function UnitView() {
  const { id } = useParams<{ id: string }>();
  const [unit, setUnit] = useState<PublicUnit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/units/${id}?student=${getStudentId()}`)
      .then((r) => r.json())
      .then((d) => (d.unit ? setUnit(d.unit) : setError(d.error || "Couldn't find this unit.")))
      .catch(() => setError("Couldn't reach Study Pal. Check your connection."));
  }, [id]);

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

      <ol className="mt-5 space-y-3">
        {unit.topics.map((t, i) => (
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
        ))}
      </ol>

      <div className="mt-6 rounded-2xl bg-clay-soft p-4 text-sm">
        Next up: a quick test to see what you already know. <span className="text-muted">(Coming in the next step.)</span>
      </div>
    </section>
  );
}
