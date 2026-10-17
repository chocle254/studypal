// Database access. Server only: the service key never reaches the phone.
// On Vercel this talks to Supabase. When SUPABASE_URL is not set (local development
// without keys), it uses a small JSON file in .data/ so the app can still be tried.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import type { Attempt, Course, HomeCourse, Unit } from "./types";

type Tables = {
  students: { id: string; created_at: string }[];
  courses: Course[];
  units: Unit[];
  attempts: Attempt[];
};

let client: SupabaseClient | null = null;

// Accept the names we chose and the names Vercel's Supabase integration adds automatically.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export function dbMode(): "supabase" | "local" {
  return SUPABASE_URL && SUPABASE_KEY ? "supabase" : "local";
}

function sb(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// ---------- local stand-in store ----------
const FILE = path.join(process.cwd(), ".data", "db.json");

async function readLocal(): Promise<Tables> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { students: [], courses: [], units: [], attempts: [] };
  }
}

async function writeLocal(t: Tables) {
  if (process.env.VERCEL) {
    throw new Error("Database settings are missing on Vercel (SUPABASE_URL and SUPABASE_SERVICE_KEY).");
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(t, null, 2));
}

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ---------- operations ----------

export async function ping(): Promise<void> {
  if (dbMode() === "local") {
    await readLocal();
    return;
  }
  check(await sb().from("students").select("id").limit(1));
}

export async function ensureStudent(id: string): Promise<void> {
  if (dbMode() === "local") {
    const t = await readLocal();
    if (!t.students.some((s) => s.id === id)) {
      t.students.push({ id, created_at: now() });
      await writeLocal(t);
    }
    return;
  }
  check(await sb().from("students").upsert({ id }, { onConflict: "id", ignoreDuplicates: true }));
}

export async function listHome(studentId: string): Promise<HomeCourse[]> {
  let courses: Course[];
  let units: Pick<Unit, "id" | "name" | "course_id" | "topics">[];
  if (dbMode() === "local") {
    const t = await readLocal();
    courses = t.courses.filter((c) => c.student_id === studentId);
    units = t.units.filter((u) => u.student_id === studentId);
  } else {
    courses = check(
      await sb().from("courses").select("*").eq("student_id", studentId).order("created_at"),
    ) as Course[];
    units = check(
      await sb()
        .from("units")
        .select("id,name,course_id,topics")
        .eq("student_id", studentId)
        .order("created_at"),
    ) as Unit[];
  }
  return courses.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    units: units
      .filter((u) => u.course_id === c.id)
      .map((u) => ({ id: u.id, name: u.name, topics: (u.topics || []).length })),
  }));
}

export async function findOrCreateCourse(studentId: string, name: string, level: string): Promise<Course> {
  if (dbMode() === "local") {
    const t = await readLocal();
    let c = t.courses.find(
      (x) => x.student_id === studentId && x.name.toLowerCase() === name.toLowerCase() && x.level === level,
    );
    if (!c) {
      c = { id: newId(), student_id: studentId, name, level, created_at: now() };
      t.courses.push(c);
      await writeLocal(t);
    }
    return c;
  }
  const found = check(
    await sb().from("courses").select("*").eq("student_id", studentId).ilike("name", name).eq("level", level).limit(1),
  ) as Course[];
  if (found.length) return found[0];
  return check(
    await sb().from("courses").insert({ student_id: studentId, name, level }).select().single(),
  ) as Course;
}

export async function createUnit(u: Omit<Unit, "id" | "created_at">): Promise<Unit> {
  if (dbMode() === "local") {
    const t = await readLocal();
    const row: Unit = { ...u, id: newId(), created_at: now() };
    t.units.push(row);
    await writeLocal(t);
    return row;
  }
  return check(await sb().from("units").insert(u).select().single()) as Unit;
}

export async function getUnit(id: string, studentId: string): Promise<Unit | null> {
  if (dbMode() === "local") {
    const t = await readLocal();
    return t.units.find((u) => u.id === id && u.student_id === studentId) ?? null;
  }
  const rows = check(
    await sb().from("units").select("*").eq("id", id).eq("student_id", studentId).limit(1),
  ) as Unit[];
  return rows[0] ?? null;
}

export async function updateUnit(id: string, studentId: string, patch: Partial<Unit>): Promise<void> {
  if (dbMode() === "local") {
    const t = await readLocal();
    const u = t.units.find((x) => x.id === id && x.student_id === studentId);
    if (u) Object.assign(u, patch);
    await writeLocal(t);
    return;
  }
  check(await sb().from("units").update(patch).eq("id", id).eq("student_id", studentId));
}

export async function addAttempt(a: Omit<Attempt, "id" | "created_at">): Promise<Attempt> {
  if (dbMode() === "local") {
    const t = await readLocal();
    const row: Attempt = { ...a, id: newId(), created_at: now() };
    t.attempts.push(row);
    await writeLocal(t);
    return row;
  }
  return check(await sb().from("attempts").insert(a).select().single()) as Attempt;
}

export async function listAttempts(unitIds: string[]): Promise<Attempt[]> {
  if (!unitIds.length) return [];
  if (dbMode() === "local") {
    const t = await readLocal();
    return t.attempts.filter((a) => unitIds.includes(a.unit_id));
  }
  return check(
    await sb().from("attempts").select("*").in("unit_id", unitIds).order("created_at"),
  ) as Attempt[];
}
