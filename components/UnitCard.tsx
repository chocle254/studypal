import Link from "next/link";

// A unit card with generated artwork: soft shapes picked from the unit's name,
// so each unit looks different without any image service.
const PALETTES = [
  ["var(--sage-soft)", "var(--sage)", "var(--clay)"],
  ["var(--clay-soft)", "var(--clay)", "var(--sky)"],
  ["var(--sky-soft)", "var(--sky)", "var(--sage)"],
];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function Artwork({ seed }: { seed: string }) {
  const h = hash(seed);
  const [bg, a, b] = PALETTES[h % PALETTES.length];
  const x1 = 20 + (h % 50);
  const y1 = 25 + ((h >> 3) % 30);
  const r1 = 22 + ((h >> 5) % 18);
  const x2 = 60 + ((h >> 7) % 30);
  const y2 = 55 + ((h >> 9) % 25);
  return (
    <svg viewBox="0 0 100 80" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="100" height="80" fill={bg} />
      <circle cx={x1} cy={y1} r={r1} fill={a} opacity="0.55" />
      <rect x={x2 - 18} y={y2 - 14} width="36" height="28" rx="10" fill={b} opacity="0.45" transform={`rotate(${h % 30 - 15} ${x2} ${y2})`} />
      <path d={`M0 ${62 + (h % 10)} Q 50 ${48 + ((h >> 4) % 20)} 100 ${64 + ((h >> 2) % 10)} V80 H0Z`} fill={a} opacity="0.3" />
    </svg>
  );
}

export default function UnitCard({
  id,
  name,
  course,
  topics,
  index,
}: {
  id: string;
  name: string;
  course: string;
  topics: number;
  index: number;
}) {
  return (
    <Link
      href={`/unit/${id}`}
      className="block rounded-2xl overflow-hidden bg-surface border border-line active:scale-[0.98] transition animate-rise"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="h-24">
        <Artwork seed={name + id} />
      </div>
      <div className="p-3">
        <p className="font-bold leading-tight line-clamp-2">{name}</p>
        <p className="mt-1 text-xs text-muted">
          {course} · {topics} topic{topics === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
