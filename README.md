# Study Pal

An AI study assistant for students. It tests what you already know, teaches only the topics you're weak in, in a style you pick (explain-like-I'm-5, gossip, or nerd), and shows your before-and-after score.

**Live app:** https://studypal-murex.vercel.app (no sign-in; tap "Try a sample unit" to run the whole loop with a sample PDF)

## Hackathon docs — Build With AI: Basics

Built for Devpost's **Build With AI: Basics** hackathon, from an empty folder, using the Devpost Learn Skill Pack (flipped interaction, then plan-first). The planning documents, in the folder the skill pack creates:

| Document | What it holds |
|---|---|
| [`devpost/scope.md`](devpost/scope.md) | The problem, who it's for, and the proof-of-concept boundary |
| [`devpost/prd.md`](devpost/prd.md) | The core journey, every behavior, states and edge cases |
| [`devpost/spec.md`](devpost/spec.md) | Stack, where it runs, components, data model, file structure |
| [`devpost/checklist.md`](devpost/checklist.md) | The six build slices, learner checks, final review, and every revision made from testing |
| [`devpost/app-map.html`](devpost/app-map.html) | A one-page map of how the code fits together |
| [`devpost/video/`](devpost/video/) | Sources for the demo video (narration script, intro animation, recording and edit scripts) |

The full commit history shows the build slice by slice, starting with the first commit on Oct 16, 2026.

## How it works

- **Phone browser** shows the screens and reads PDF text on the phone.
- **Vercel** serves the app and runs small server functions that hold the keys.
- **Supabase** stores courses, units, topics, questions, lessons and scores.
- **The AI** (Groq by default, or NVIDIA Nemotron, chosen by settings) reads the unit, writes questions, marks typed answers, and writes lessons.

There's no sign-in: each phone gets a random secret ID the first time it opens the app.

## Run it

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Get a Groq API key at https://console.groq.com (or an NVIDIA key at https://build.nvidia.com).
3. Set the variables in [`.env.example`](.env.example) (in Vercel's project settings, or in a local `.env.local`).
4. `npm install`, then `npm run dev`, and open http://localhost:3000.

Without keys, the app runs with a local file database and a clearly labelled stand-in AI, for development only.

Check that everything is connected at `/api/health`.
