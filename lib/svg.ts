// Makes an AI-drawn diagram safe to show: only plain shapes and text survive.
// Anything unusable returns null, and the lesson step shows as a text card instead.
const ALLOWED = new Set(["svg", "g", "rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text", "tspan", "title"]);

export function safeSvg(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  const start = s.indexOf("<svg");
  const end = s.lastIndexOf("</svg>");
  if (start === -1 || end === -1 || s.length > 12_000) return null;
  s = s.slice(start, end + 6);
  // Drop comments, then refuse anything with tags we don't allow.
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  const tags = [...s.matchAll(/<\/?\s*([a-zA-Z][\w:-]*)/g)].map((m) => m[1].toLowerCase());
  if (!tags.length || tags.some((t) => !ALLOWED.has(t))) return null;
  // Remove event handlers, links and style tricks.
  s = s
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(xlink:)?href\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none")
    .replace(/javascript:/gi, "");
  // Make it scale to the card width.
  s = s.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
    const cleaned = attrs.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    const vb = /viewBox/i.test(cleaned) ? "" : ' viewBox="0 0 320 200"';
    return `<svg${cleaned}${vb} width="100%" role="img">`;
  });
  return s;
}
