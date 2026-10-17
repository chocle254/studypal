// Checks and trims the structured diagram the AI suggests. Anything that doesn't fit is dropped.
import type { Diagram } from "./types";

const str = (v: unknown, n = 60) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const list = (v: unknown, min: number, max: number) => {
  const out = Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean).slice(0, max) : [];
  return out.length >= min ? out : null;
};

export function cleanDiagram(raw: unknown): Diagram | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;
  const title = str(d.title) || undefined;
  if (d.kind === "flow" || d.kind === "cycle") {
    const steps = list(d.steps, 2, 7);
    return steps ? { kind: d.kind, title, steps } : undefined;
  }
  if (d.kind === "compare") {
    const side = (x: unknown) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const points = list(o.points, 1, 5);
      return str(o.title) && points ? { title: str(o.title), points } : null;
    };
    const left = side(d.left);
    const right = side(d.right);
    return left && right ? { kind: "compare", title, left, right } : undefined;
  }
  if (d.kind === "parts") {
    const center = str(d.center);
    const parts = Array.isArray(d.parts)
      ? d.parts
          .map((p) => ({ name: str((p as Record<string, unknown>)?.name), job: str((p as Record<string, unknown>)?.job, 90) }))
          .filter((p) => p.name)
          .slice(0, 6)
      : [];
    return center && parts.length >= 2 ? { kind: "parts", title, center, parts } : undefined;
  }
  return undefined;
}
