---
doc: spec
status: approved
---

# AI Study Pal (working title) — Technical Spec

## How This Works, In Plain Language
Study Pal is a website that opens on a phone, like an app. It has three helpers behind it.

- **Vercel** is the computer on the internet that serves the screens to the student's phone. It also runs a few small "server functions", which are bits of code that run on Vercel, not on the phone. Those are the only place the AI key is kept, so it never reaches the phone.
- **Supabase** is a spreadsheet in the cloud. It remembers each student's courses, units, topics, questions, lessons and scores, so everything is still there when they come back.
- **NVIDIA's Nemotron** is the AI. It reads the unit, writes the questions, marks typed answers, and writes the lessons, including simple drawings.

There is no sign-in. The first time a phone opens the app, it makes a random secret ID and keeps it. That ID is how Supabase knows which student is back.

When a student picks a PDF, the phone reads the text out of it right there. Only that text goes to Supabase, filed under the course and then the unit. The PDF stays untouched on the phone.

Why this shape: it is the smallest set of pieces that still gives you a real database, a real AI and a live link, and it matches tools you already use. The extra pieces from the full vision (accounts, folders on the phone, badges) are left out on purpose.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. The student opens the Vercel link. The phone checks for its secret ID, makes one if missing, and asks Supabase for its units (`GET /api/home`). Nothing yet → the empty screen with the plus button.
2. They add a course, a level, a unit name and a PDF. The phone reads the PDF text itself. The text goes to a Vercel function (`POST /api/units`), which asks Nemotron to split it into topics with their key parts, and saves the unit and topics to Supabase.
3. Nemotron also writes the baseline questions (five per topic) and the final questions (same key parts, different wording and structure), and the function saves them with the topics.
4. The student answers a topic's five questions. The phone sends the answers to `POST /api/mark`. Nemotron marks all five in one call, and the score is saved as an attempt.
5. Results show strong and weak topics from the saved scores. The student picks a style and a starting topic.
6. For a weak topic, `POST /api/lesson` asks Nemotron for a step-by-step lesson in that style, with a simple drawing for each step. It is saved so it is never written twice.
7. After the lesson the student answers the topic check. Same marking call, saved as an attempt.
8. When all topics up to the student's current one are done, they take the final test. The before-and-after screen compares the baseline and final scores.

## Stack
- **Next.js (App Router) with TypeScript** — one project for screens and server functions, deploys to Vercel with no setup. Docs: https://nextjs.org/docs
- **Tailwind CSS** — quick calm styling, mobile first. Docs: https://tailwindcss.com/docs
- **Supabase (Postgres) with `@supabase/supabase-js`** — the cloud database the learner chose. Docs: https://supabase.com/docs
- **NVIDIA Nemotron through an OpenAI-compatible endpoint** — the learner's choice of free AI. Called with plain `fetch`, no extra library. Base URL `https://integrate.api.nvidia.com/v1`, key from https://build.nvidia.com. Third-party docs list model names (e.g. `nvidia/nemotron-3.5-lightning-30b-a3b`): https://docs.openclaw.ai/providers/nvidia.md
- **`pdfjs-dist` (Mozilla pdf.js)** — reads text from the PDF in the phone's browser. Docs: https://mozilla.github.io/pdf.js/
- **Hosting: Vercel**. Docs: https://vercel.com/docs

Tradeoff accepted: three outside services (Vercel, Supabase, NVIDIA) mean three accounts and three places something can fail. Accepted because the learner already uses Vercel and Supabase.

Unverified, to check early in the build: the exact Nemotron model name and that the key works; the free limits (reported as about 1,000 credits and 40 requests a minute); that pdf.js works inside Next.js on a phone; how good AI-drawn diagrams look.

## Where It Runs and How Someone Tries It
- **Runs in:** a phone browser, served by Vercel. Deployed from the public GitHub repo.
- **Settings needed (set in Vercel, never in the repo):** `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. A secret-free `.env.example` lists the names.
- **To try it:** open the Vercel link on a phone.
- **To run locally (optional):** `npm install`, then `npm run dev`, then open `http://localhost:3000`.
- **Demo recording:** a phone screen recording of the Vercel link, 1 to 3 minutes: add a unit, baseline test, results, a lesson, a topic check, the final test, and the before-and-after score.
- **Submission:** the short demo video and the public GitHub repo (with `scope.md`, `prd.md` and `spec.md`). A live link is a bonus.

## Look and Feel
Carried forward from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.
- Calm and clean, with soft, low-brightness colors that are easy on the eyes. No bright whites or neon.
- Playful on 5-year-old lessons: rounder shapes, friendlier copy, gentle motion.
- Motion by CSS transitions and small SVG animations. No animation library.
- Friendly, simple interface copy. Mobile first (single column, big tap targets); a PC layout comes later.
- Tailwind can do all of this. No named references were given.

## Components

### Home and Navbar
Top navbar: burger on the far left (dropdown of courses), pomodoro button and avatar on the far right. Main area: plus button with "no units added yet", or the units in two columns with an image and name.
PRD ref: `prd.md > Home and navigation`. Files: `app/page.tsx`, `components/Navbar.tsx`, `components/UnitCard.tsx`. Unit card images are generated artwork (soft gradients and simple shapes) in the app's style.

### Pomodoro
A button that opens a small timer panel and counts down a study block. Runs in the phone; nothing saved. Default 25 minutes work, 5 minutes break (assumption, see Open Issues).
PRD ref: `prd.md > Pomodoro`. File: `components/Pomodoro.tsx`.

### Add Course and Unit
Course and level, then unit name, PDF picker and the topic the student is at. The PDF is read in the phone's browser by pdf.js; only the text is sent on.
PRD ref: `prd.md > Adding a course and unit`. Files: `app/add/page.tsx`, `lib/pdf.ts`, `app/api/units/route.ts`.

### Unit Analysis (AI)
One Nemotron call splits the text into topics with their key parts, then writes baseline and final questions for each topic (same key parts, different wording and structure). Saved on the unit.
PRD ref: `prd.md > Baseline mock test`. Files: `app/api/units/route.ts`, `lib/nvidia.ts`, `lib/prompts.ts`.

### Baseline and Final Tests
One topic at a time, five questions, mostly typed. A box shows the other topics, unmarked until done. Answers go to one marking call per topic.
PRD ref: `prd.md > Baseline mock test`, `prd.md > Final test and before-and-after score`. Files: `components/TestView.tsx`, `components/TopicProgress.tsx`, `app/api/mark/route.ts`.

### Results, Style and Topic Choice
Strong and weak topics from saved scores. A strong topic gets the nudge and a quick-check option. The student picks 5-year-old, gossip or nerd, then topic one or custom topics.
PRD ref: `prd.md > Teaching styles and starting point`, `prd.md > Lesson`. File: `components/Results.tsx`.

### Lesson
One Nemotron call per topic and style returns steps in easy English with real-life examples, and a small SVG drawing per step. Saved so it is never written twice. If a drawing is unusable, the step shows as a text card.
PRD ref: `prd.md > Lesson`. Files: `components/LessonView.tsx`, `components/DiagramSvg.tsx`, `app/api/lesson/route.ts`.

### Topic Check
A short check after each lesson, using the same marking call.
PRD ref: `prd.md > Topic check`. File: `components/TestView.tsx`.

### Before-and-After and Profile
Compares baseline and final scores per topic and overall. The avatar's profile screen shows overall performance across units.
PRD ref: `prd.md > Final test and before-and-after score`, `prd.md > Home and navigation`. Files: `components/ScoreCompare.tsx`, `app/profile/page.tsx`.

## Data Model
No sign-in. A random student ID is made on the first visit and kept in the phone's browser (local storage). All database access goes through Vercel functions, so the database keys never reach the phone.

- `students` — `id` (the random ID), `created_at`.
- `courses` — `id`, `student_id`, `name`, `level`.
- `units` — `id`, `course_id`, `name`, `current_topic` (number), `material_text`, `style`, and `topics` (JSON list). Each topic holds its `title`, `key_parts`, the `baseline` and `final` questions, and `lessons` by style.
- `attempts` — `id`, `unit_id`, `topic_index`, `kind` (baseline, check or final), `score`, `detail` (JSON of answers and marking), `created_at`.

Where data lives: Supabase, except the secret student ID, which lives in the phone's browser. It is updated by the Vercel functions after each AI call or test. When the student comes back, the phone sends its ID and sees everything again. Clearing the browser's data loses the ID (accepted for the hackathon; accounts later fix it).

## File Structure
```
studypal/
├── app/
│   ├── layout.tsx            # page frame, fonts, calm background
│   ├── globals.css           # Tailwind + soft color settings
│   ├── page.tsx              # Home: empty state or two-column units
│   ├── add/page.tsx          # Add course, level, unit, PDF, current topic
│   ├── unit/[id]/page.tsx    # Unit flow: baseline → results → style → lesson → check → final → compare
│   ├── profile/page.tsx      # Avatar screen: overall performance
│   └── api/
│       ├── home/route.ts     # List the student's courses and units
│       ├── units/route.ts    # Create unit, analyze text, write questions
│       ├── mark/route.ts     # Mark a topic's typed answers in one call
│       └── lesson/route.ts   # Write and save a lesson for a topic and style
├── components/               # Navbar, UnitCard, Pomodoro, TestView, TopicProgress,
│                             # Results, LessonView, DiagramSvg, ScoreCompare
├── lib/
│   ├── nvidia.ts             # Calls the Nemotron endpoint
│   ├── prompts.ts            # The prompts for analysis, marking and lessons
│   ├── supabase.ts           # Database connection (server only)
│   ├── student.ts            # Makes and reads the secret student ID
│   └── pdf.ts                # Reads text from a PDF in the browser
├── devpost/                  # Devpost learning workspace (scope, PRD, spec)
├── .env.example              # Setting names only, no secrets
├── package.json
└── README.md                 # How to run, what it does
```

## External Services and Dependencies
- **NVIDIA Nemotron** — `POST https://integrate.api.nvidia.com/v1/chat/completions`, header `Authorization: Bearer <NVIDIA_API_KEY>`, body `{ model, messages, temperature, max_tokens }`, reply text in `choices[0].message.content`. Key from https://build.nvidia.com. Reported free limits: about 1,000 credits, 40 requests a minute, no card (third-party report, verify). Prototyping only. Calls per demo unit of 3 topics: roughly 15, well inside the credits.
- **Supabase** — free plan, project URL and a server-only service key. Docs: https://supabase.com/docs
- **Vercel** — free plan, deploys from GitHub. Docs: https://vercel.com/docs
- **pdf.js** — runs in the browser, no key. Docs: https://mozilla.github.io/pdf.js/

## Important Failure Modes
- **The PDF can't be read (scanned pages, no selectable text)** → a plain message: "I couldn't read text from this file. Try a PDF where you can select the text, or paste the text." Pasting text is accepted as a backup.
- **The AI is slow, out of credits, or hits the rate limit** → a friendly "thinking" state, one retry, then "Study Pal is busy, try again in a minute". Everything already generated is saved, so nothing is lost.
- **The AI returns messy output (not the expected JSON, or a broken drawing)** → one retry. If a drawing still fails, the lesson step shows as a text card.

## What Was Simplified and Why
- **A random device ID** instead of real accounts — accounts add a login flow that doesn't prove the kernel. The fuller version needs sign-in and secure per-student data rules.
- **Extracted text in Supabase** instead of PDF files in a phone folder — a browser can't create a visible folder, and text saves storage.
- **AI-drawn SVG diagrams** instead of generated images — no extra service, and they can carry calm colors and motion.
- **Four tables with topics, questions and lessons inside `units`** instead of a table for each — fewer tables to set up for a small proof.
- **Unit card images are generated artwork** instead of picture search — no extra service.
- **Typed answers are marked in one AI call per topic** — to stay inside the free limits.
- **One demo unit of about three topics** — to keep the demo short and the AI calls low.

- **The publishable key with table policies** instead of the secret key on the server — the learner's Supabase login couldn't open the project's secret key. The key stays only in Vercel; anyone holding it could read Study Pal's data, so switch to the secret key before real users.

- **AI provider as a setting, Groq by default** instead of Nemotron only — NVIDIA's free queue made each answer take 45–60s. Groq's free plan limits tokens per minute, so long notes are trimmed to about 24,000 characters for the AI.

## Decisions and Open Issues
Learner choices:
- Vercel for hosting, Supabase for data, Nemotron for the AI, a switch to paid AI when users grow.
- No sign-in for the hackathon.
- Store extracted PDF text only; the studypal folder on the phone moves to Later (needs a native app).
- AI-drawn lesson images "as long as it makes it easy for the user to understand".

Recommended by the agent, awaiting approval at review: Next.js with TypeScript and Tailwind; pdf.js reading the PDF in the browser; four tables; the secret device ID in local storage.

Learner uncertainty and how it was clarified: whether the app can create a "studypal folder" on the phone. Clarified by explaining that a browser can't make a visible folder, so Study Pal reads the file through the file picker. During the build, the check is that a PDF picked from the phone's storage is read and stored as text.

Still open:
- Quality of AI-drawn diagrams — check early; fall back to text cards if they don't make topics easy to understand.
- The exact Nemotron model name and free limits — check early.
- Pomodoro length: assumed 25 minutes work and 5 minutes break (agent assumption, not a learner decision).
- Whether the baseline shows feedback per answer: assumed no, only at the end (from `prd.md > Open Questions`).
- The project's final name.
