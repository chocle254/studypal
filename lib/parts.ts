// Study Pal reads a long PDF one part at a time (about 15 pages), as the student progresses.
// Each part becomes one round: up to 4 topics, tested, taught and tested again.
// Pages are separated by a form-feed character (\f) when the phone reads the PDF.

export const PART_CHARS = 22_000; // about 15 pages of notes; fits the AI's free per-minute limit

export interface Part {
  text: string;
  firstPage: number | null; // 1-based; null for pasted text (no pages)
  lastPage: number | null;
}

export function splitParts(material: string, size = PART_CHARS): Part[] {
  const hasPages = material.includes("\f");
  const pieces = hasPages ? material.split("\f") : material.split(/\n{2,}/);
  const parts: Part[] = [];
  let buf: string[] = [];
  let len = 0;
  let first = 1;
  pieces.forEach((piece, i) => {
    const page = i + 1;
    if (len > 0 && len + piece.length > size) {
      parts.push({ text: buf.join("\n\n"), firstPage: hasPages ? first : null, lastPage: hasPages ? page - 1 : null });
      buf = [];
      len = 0;
      first = page;
    }
    buf.push(piece.slice(0, size)); // a single huge page is cut to fit
    len += Math.min(piece.length, size);
  });
  if (buf.some((b) => b.trim())) {
    parts.push({ text: buf.join("\n\n"), firstPage: hasPages ? first : null, lastPage: hasPages ? pieces.length : null });
  }
  return parts.filter((p) => p.text.replace(/\s/g, "").length > 0);
}
