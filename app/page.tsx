"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudentId } from "@/lib/student";
import type { HomeCourse } from "@/lib/types";
import UnitCard from "@/components/UnitCard";

export default function Home() {
  const [courses, setCourses] = useState<HomeCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = getStudentId();
    fetch(`/api/home?student=${id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setCourses(d.courses)))
      .catch(() => setError("Couldn't reach Study Pal. Check your connection."));
  }, []);

  if (error) {
    return <p className="mt-10 text-center text-muted">{error}</p>;
  }

  if (!courses) {
    return (
      <div className="mt-24 grid place-items-center">
        <div className="w-10 h-10 rounded-full bg-sage-soft animate-breathe" />
      </div>
    );
  }

  const units = courses.flatMap((c) => c.units.map((u) => ({ ...u, course: c.name })));

  if (units.length === 0) {
    return (
      <section className="mt-20 flex flex-col items-center text-center animate-rise">
        <Link
          href="/add"
          aria-label="Add a course"
          className="w-24 h-24 rounded-full bg-sage text-bg grid place-items-center shadow-sm animate-breathe active:scale-95 transition"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
        <p className="mt-6 text-lg font-semibold">No units added yet</p>
        <p className="mt-1 text-sm text-muted max-w-xs">
          Tap the plus to add your course and the unit you&apos;re studying.
        </p>
        <Link href="/add?sample=1" className="mt-6 text-sm font-semibold text-sage underline underline-offset-4">
          No PDF handy? Try a sample unit
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-extrabold">Your units</h1>
        <Link
          href="/add"
          aria-label="Add a unit"
          className="w-10 h-10 rounded-full bg-sage text-bg grid place-items-center active:scale-95 transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {units.map((u, i) => (
          <UnitCard key={u.id} id={u.id} name={u.name} course={u.course} topics={u.topics} index={i} />
        ))}
      </div>
    </section>
  );
}
