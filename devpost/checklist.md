---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn (recommended default; the learner can switch to fast anytime)

How checks work in this build: the code is built and checked in Claude's workspace with a stand-in AI (no network to NVIDIA from there). Each slice is then pushed to the learner's GitHub repo, Vercel deploys it, and the learner tries it on their phone at the Vercel link with the real Nemotron AI. Live checks of the deployed link use its `/api/health` page.

## Slices

- [x] **1. The app opens on your phone and talks to the database and the AI**
  Becomes usable: The Vercel link opens Study Pal on a phone: calm home screen, navbar with burger, pomodoro button and avatar, and the empty state with a plus button and "no units added yet". A health page confirms Supabase and Nemotron both answer.
  Why now: Sets up the project and proves the three outside services (Vercel, Supabase, Nemotron) work together before anything depends on them. The model name and free limits are unverified, so we find out on day one.
  PRD ref: `prd.md > Home and navigation`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Home and Navbar`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > External Services and Dependencies`
  Build: Scaffold Next.js with TypeScript and Tailwind per the file structure; calm palette from Look and Feel; navbar and empty home; the secret student ID in local storage; Supabase tables (`students`, `courses`, `units`, `attempts`); `lib/supabase.ts`, `lib/nvidia.ts` with a stand-in AI when no key is set; `GET /api/home`; `GET /api/health` that pings Supabase and Nemotron; `.env.example`; README.
  Verify (mechanical): `npm run build` passes; the app runs locally and a phone-sized screenshot shows the empty home; `/api/home` returns an empty list for a new ID; after deploy, the live `/api/health` reports Supabase ok and Nemotron ok.
  Learner check: Open the Vercel link on your phone. You should see the navbar (burger on the left, pomodoro and avatar on the right) and a plus button with "no units added yet". Say whether the colors and feel match what you pictured.
  Commit: `Scaffold Study Pal with home screen, database and AI health check`

- [x] **2. You can add a unit and the AI breaks it into topics**
  Becomes usable: Tap plus, enter course and level, add a unit name, pick a PDF from the phone and say which topic you're at. The phone reads the text, the AI splits it into topics and writes the baseline and final questions, and the unit appears on the home screen as a card in two columns.
  Why now: Every later step needs a unit with topics and questions. It also proves the risky parts: reading a PDF on a phone and getting usable structured output from Nemotron.
  PRD ref: `prd.md > Adding a course and unit`, `prd.md > Home and navigation`, `prd.md > The Core Journey` (steps 2–4)
  Spec ref: `spec.md > Add Course and Unit`, `spec.md > Unit Analysis (AI)`, `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: `app/add/page.tsx` with course, level, unit, PDF picker (pdf.js in the browser), current topic, and a paste-text fallback; `POST /api/units` that asks the AI for topics with key parts plus baseline and final questions as JSON, retries once on bad output, and saves to Supabase; unit cards with generated artwork in two columns.
  Verify (mechanical): Build passes; with the stand-in AI, adding a sample unit from a small test PDF saves topics and questions in Supabase and the home screen shows its card; an unreadable file shows the plain message; live, a real unit is analyzed by Nemotron.
  Learner check: On your phone, tap plus, add a course and unit, pick a short PDF of yours, and choose the topic you're at. You should see the unit card on the home screen. Open it and check the topics look right for that material.
  Commit: `Add course and unit with PDF reading and AI topic analysis`

- [x] **3. You take the baseline test and see your strong and weak topics**
  Becomes usable: Opening a unit starts the baseline test for the current round (up to 4 topics): one topic at a time, five questions, mostly typed, with a progress box of the other topics. Answers are marked by the AI, and the results screen shows strong and weak topics and overall understanding.
  Why now: This is the first half of the kernel, testing first. It's where early feedback shapes the rest of the build.
  PRD ref: `prd.md > Baseline mock test`, `prd.md > The Core Journey` (steps 5–6)
  Spec ref: `spec.md > Baseline and Final Tests`, `spec.md > Results, Style and Topic Choice`, `spec.md > Data Model`
  Build: `app/unit/[id]/page.tsx` flow; `TestView` and `TopicProgress`; `POST /api/mark` marking a topic's five answers in one AI call and saving an attempt; `Results` with strong and weak topics.
  Verify (mechanical): Build passes; with the stand-in AI, answering all topics saves baseline attempts and the results screen lists strong and weak topics; live, typed answers are marked by Nemotron.
  Learner check: Open your unit and take the test. Answer some questions well and some badly on purpose. The results should show the topics you answered badly as weak.
  Commit: `Add baseline test with AI marking and results`

- [x] **4. A weak topic is taught in your chosen style**
  Becomes usable: After results, choose 5-year-old, gossip or nerd and where to start (topic one or custom topics). Weak topics are taught step by step in easy English with a real-life example and a simple drawing per step. A strong topic shows the nudge and an optional quick check.
  Why now: The second half of the kernel, teaching only the gaps. It's the riskiest output (AI drawings), so it comes right after testing.
  PRD ref: `prd.md > Teaching styles and starting point`, `prd.md > Lesson`
  Spec ref: `spec.md > Results, Style and Topic Choice`, `spec.md > Lesson`, `spec.md > Important Failure Modes`
  Build: Style and topic choice; `POST /api/lesson` that writes a lesson as steps with SVG, saved by topic and style; `LessonView` and `DiagramSvg` with soft motion and a text-card fallback; strong-topic nudge with quick check.
  Verify (mechanical): Build passes; with the stand-in AI, a lesson renders its steps and drawings and is saved so a second visit makes no new AI call; a broken drawing shows as a text card; live, Nemotron writes a lesson.
  Learner check: Pick the 5-year-old style and open a weak topic. Read the lesson. Does it explain the topic simply, and do the drawings help you understand it?
  Commit: `Add teaching styles and AI lessons with drawings`

- [x] **5. Topic checks, the final test, and your before-and-after score**
  Becomes usable: Each lesson ends with a short topic check. When all topics up to your current one are done, the final test runs (same parts, different questions), and the before-and-after screen compares baseline and final scores per topic and overall.
  Why now: Closes the kernel and gives the demo its "oh, that's cool" moment.
  PRD ref: `prd.md > Topic check`, `prd.md > Final test and before-and-after score`, `prd.md > The Core Journey` (steps 10–12)
  Spec ref: `spec.md > Topic Check`, `spec.md > Baseline and Final Tests`, `spec.md > Before-and-After and Profile`
  Build: Topic check after each lesson using `/api/mark`; final test from the saved final questions; `ScoreCompare` screen.
  Verify (mechanical): Build passes; with the stand-in AI, a full run (baseline, lesson, check, final) shows both scores side by side from saved attempts; live, the full journey works on the deployed link.
  Learner check: Finish your unit: do the lessons and checks, then the final test. The last screen should show your before and after scores. Does the improvement feel believable?
  Commit: `Add topic checks, final test and before-and-after score`

- [x] **6. Courses menu, pomodoro timer, and your profile**
  Becomes usable: The burger opens a dropdown of your courses, the pomodoro button runs a 25/5 focus timer, and the avatar opens a profile showing overall performance across your units.
  Why now: Rounds out the navbar the PRD describes. None of it is needed to prove the kernel, so it comes last.
  PRD ref: `prd.md > Home and navigation`, `prd.md > Pomodoro`
  Spec ref: `spec.md > Home and Navbar`, `spec.md > Pomodoro`, `spec.md > Before-and-After and Profile`
  Build: Courses dropdown; `Pomodoro` panel; `app/profile/page.tsx` from saved attempts.
  Verify (mechanical): Build passes; screenshots show the dropdown listing courses, the timer counting down, and the profile with scores.
  Learner check: Tap the burger, the pomodoro button and your avatar. Each should do what you described in the PRD.
  Commit: `Add courses menu, pomodoro timer and profile`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3 (baseline test and results on your phone). Feedback: questions were good but didn't walk through the whole topic → the 5 questions are now a structured tour (core idea, how it works, why it matters, apply it, a common mix-up), covering every key part; the bare percentage felt cold → results now give a gentle verdict ("Great understanding" … "A fresh start"), then where learning starts (from topic one if under 40%, otherwise only the weak topics), leading into the teaching-style choice.
- [x] Final kick-the-tires exploration and feedback completed — learner tried the finished app on their phone (full round, Ask about this, Go deeper, Fix this topic + retake, courses menu, profile, timer) and reported "it looks great"; no changes requested. Database constraint for `retake` attempts supplied as a one-time SQL step.

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship (no outstanding fixes; `npm run build` passes; full round verified end to end with the stand-in AI, live with Groq on the learner's phone)

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse (rendered at phone width in light and dark with scripts off; paths and anchors checked against commit 407d872)

Activity and evidence:
Route and stops: LessonView `fetchLesson` → `app/api/lesson/route.ts` `POST` (`sourceFor`, `lessonPrompt`, `askJson`, `updateUnit`) → `cleanDiagram` / `Diagram` / `LessonText` (offered as a phone + GitHub walkthrough)
Edit outcome:
Reflection:
Activity mode:

## Revisions

- Slice 6: the burger dropdown lists courses and their units with "+ Add a unit" and "My progress"; the profile (`/profile`, also the avatar) shows overall before-and-after across finished topics (best of final or retake), topics learned, final tests, today's focus sessions, and per-unit progress. New `GET /api/profile`.
- Added after the learner asked what happens when a student fails or needs more: "Fix this topic" on the before-and-after for any topic under 70% (a second-pass lesson aimed at the final-test mistakes, explained a different way, ending in a 5-question retake with new questions; "Try it another way" if still weak; the screen shows the retake score and the round's score after fixes), "Ask about this" on every lesson step (the student's own question answered from their material, in their style), and "Go deeper" at the end of a lesson (3–4 harder sections, saved). New attempt kind `retake` (database constraint updated). Multiple materials per unit and exam-style research were discussed and deferred.
- Slice 5 settled with the learner: the final test runs per round (not per unit), unlocks only after every lesson in the path has its check done (no skipping, so before-and-after stays honest), covers all of the round's topics including strong ones, and "Read the next part" unlocks after the round's before-and-after. The pomodoro timer (25/5, chime, keeps time across pages) was pulled forward from slice 6 at the learner's request; the courses menu and profile remain in slice 6. Also fixed: a quick brush-through lesson could be served in place of a full lesson.
- Lesson polish after the learner's second slice-4 check (lessons were deep enough now): steps and points show as real numbered or bullet lists (also when the AI squeezes them into one paragraph), and code topics get short code examples in a copyable code window. Lesson version 3.
- Lessons rebuilt after the learner's slice-4 check: AI-drawn SVG pictures were meaningless, so diagrams are now structured data the app draws itself (flowchart, cycle, side-by-side comparison, a thing and its parts), used only when they help; lessons were too shallow, so they now teach the whole topic in 6–9 sections (what it is, why it matters, how it works, parts/types, a worked real-life example, common mistakes, summary) from the student's own material for that topic, not just the tested ideas; and a finished lesson leads straight to the next topic in the learning path. Older lessons are rewritten automatically (lesson version 2).

- Long PDFs are read part by part: about 15 pages (22,000 characters) per part, each part becoming one round of up to 5 topics (related sections grouped so nothing is dropped). The first part is read when the unit is added; "Read the next part" reads the next one. Rounds are now defined by part (replacing fixed groups of 4). New `units.parts_read` and `units.reached_current` columns. A wrong unit can be deleted. Learner's request after a book-length PDF was only read for its first ~15 pages; most of their PDFs are 80+ pages.

- Units now run in rounds of up to 4 topics (test → teach → test, then the next round); only the current round's questions are prepared. Slices 3–5 apply per round, and slice 5's before-and-after covers the finished round. Learner's request after a long unit (8 topics) hit Groq's per-minute limit on the last two topics. AI calls now wait and retry when the provider says to slow down (HTTP 429).

- AI provider is now a setting (AI_BASE_URL, AI_API_KEY, AI_MODEL), with Groq's `openai/gpt-oss-20b` as the default and Nemotron as the fallback — NVIDIA's free endpoint queued for 45–60s even on tiny answers (timing check: lightning model, thinking on or off), so adding a unit timed out. The learner chose to switch to Groq, which they already use on another project. Long notes are trimmed to ~24,000 characters for Groq's per-minute token limit.
- Adding a unit is now two steps: topics first, then questions one topic at a time (`POST /api/units/<id>/questions`), with a waiting screen that shows facts from the student's notes and topic-by-topic progress — the learner asked for something to keep students busy while it reads, and smaller AI jobs time out less. Extra taps are ignored while working.

- Added `supabase/schema.sql`, `lib/types.ts`, `lib/standin.ts` and a local JSON stand-in database (used only when Supabase settings are missing) — needed to build and verify offline, since this workspace cannot reach NVIDIA or Supabase directly.
- The server uses Supabase's publishable key (kept only in Vercel) with table policies allowing it to read and write, not the secret key — the learner couldn't reach the secret key from their Supabase login; agreed as a hackathon-only simplification, to switch back before real users.
- Slice 1 verified live: health page on studypal-murex.vercel.app shows database mode supabase ok and AI mode nemotron ok with `nvidia/nemotron-3.5-lightning-30b-a3b`. Health page also lists visible setting names and usable models, and times out the AI check after 25s, after the first live check hung.
