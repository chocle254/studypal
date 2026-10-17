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

// Checks the code example the AI suggests: a language name and a short snippet.
export function cleanCode(raw: unknown): { language: string; code: string } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  const code = typeof c.code === "string" ? c.code.replace(/\r/g, "").replace(/^\n+|\s+$/g, "").slice(0, 3000) : "";
  if (code.split("\n").filter((l) => l.trim()).length < 1) return undefined;
  const language = (typeof c.language === "string" ? c.language : "code").toLowerCase().replace(/[^a-z0-9+#.-]/g, "").slice(0, 20) || "code";
  return { language, code };
}
