// Shows a lesson section's text with lists laid out properly:
// "1. … 2. …" becomes a numbered list and "- …" a bullet list, even when the AI squeezed them into one paragraph.

type Block = { kind: "p"; text: string } | { kind: "ol" | "ul"; items: string[] };

export function toBlocks(raw: string): Block[] {
  let text = raw.replace(/\r/g, "");
  // Emoji number badges (1️⃣ 2️⃣ …) become plain numbered lines.
  text = text.replace(/\s*(\d)️?⃣\s*/g, "\n$1. ");
  // An inline numbered list ("… 1. Gather data. 2. Pick a model.") gets one line per point.
  if (/(^|\s)1[.)]\s[\s\S]+\s2[.)]\s/.test(text)) text = text.replace(/\s+(?=\d{1,2}[.)]\s)/g, "\n");
  // Inline bullets ("• a • b") too.
  text = text.replace(/\s+•\s+/g, "\n- ");

  const blocks: Block[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const num = line.match(/^\d{1,2}[.)]\s+(.*)$/);
    const bullet = line.match(/^[-•*]\s+(.*)$/);
    const kind = num ? "ol" : bullet ? "ul" : "p";
    const last = blocks[blocks.length - 1];
    if (kind === "p") blocks.push({ kind, text: line });
    else if (last && last.kind === kind) last.items.push((num ?? bullet)![1]);
    else blocks.push({ kind, items: [(num ?? bullet)![1]] });
  }
  return blocks;
}

export default function LessonText({ text }: { text: string }) {
  return (
    <div className="mt-2 space-y-3 leading-relaxed">
      {toBlocks(text).map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>{b.text}</p>
        ) : b.kind === "ol" ? (
          <ol key={i} className="space-y-2">
            {b.items.map((item, n) => (
              <li key={n} className="flex gap-3">
                <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-sage-soft text-sm font-bold grid place-items-center">{n + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        ) : (
          <ul key={i} className="space-y-2">
            {b.items.map((item, n) => (
              <li key={n} className="flex gap-3">
                <span className="mt-2.5 w-1.5 h-1.5 shrink-0 rounded-full bg-sage" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
