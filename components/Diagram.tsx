import type { Diagram as D } from "@/lib/types";

// Draws a lesson diagram from structured data: a flowchart, a cycle, a side-by-side comparison,
// or a thing with its labelled parts. Styled to match the app, readable on a phone.
export default function Diagram({ d }: { d: D }) {
  return (
    <figure className="bg-bg px-4 py-4 animate-rise">
      {d.title && <figcaption className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">{d.title}</figcaption>}
      {d.kind === "flow" && <Flow steps={d.steps} />}
      {d.kind === "cycle" && <Cycle steps={d.steps} />}
      {d.kind === "compare" && <Compare left={d.left} right={d.right} />}
      {d.kind === "parts" && <Parts center={d.center} parts={d.parts} />}
    </figure>
  );
}

function Arrow() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" className="mx-auto my-1 text-muted" aria-hidden>
      <path d="M8 1v14M3 10l5 6 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Flow({ steps }: { steps: string[] }) {
  return (
    <ol>
      {steps.map((s, i) => (
        <li key={i} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
            <span className="w-6 h-6 shrink-0 rounded-full bg-sage text-bg grid place-items-center text-xs font-bold">{i + 1}</span>
            <span className="text-sm font-semibold">{s}</span>
          </div>
          {i < steps.length - 1 && <Arrow />}
        </li>
      ))}
    </ol>
  );
}

function Cycle({ steps }: { steps: string[] }) {
  return (
    <div>
      <Flow steps={steps} />
      <div className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold text-sage">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        then back to step 1, again and again
      </div>
    </div>
  );
}

function Compare({ left, right }: { left: { title: string; points: string[] }; right: { title: string; points: string[] } }) {
  const side = (s: { title: string; points: string[] }, tone: string) => (
    <div className={`rounded-xl p-3 ${tone}`}>
      <p className="font-bold text-sm">{s.title}</p>
      <ul className="mt-2 space-y-1.5">
        {s.points.map((p, i) => (
          <li key={i} className="text-sm leading-snug">• {p}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-2">
      {side(left, "bg-sage-soft")}
      {side(right, "bg-clay-soft")}
    </div>
  );
}

function Parts({ center, parts }: { center: string; parts: { name: string; job: string }[] }) {
  return (
    <div>
      <div className="mx-auto w-fit rounded-full bg-sage text-bg px-4 py-2 text-sm font-bold">{center}</div>
      <div className="mx-auto h-4 w-px bg-line" />
      <ul className="grid grid-cols-2 gap-2">
        {parts.map((p, i) => (
          <li key={i} className="rounded-xl border border-line bg-surface p-2.5 animate-rise" style={{ animationDelay: `${i * 80}ms` }}>
            <p className="text-sm font-bold">{p.name}</p>
            {p.job && <p className="mt-0.5 text-xs text-muted leading-snug">{p.job}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
