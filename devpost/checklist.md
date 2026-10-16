---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn (recommended default; the learner can switch to fast anytime)

How checks work in this build: the code is built and checked in Claude's workspace with a stand-in AI (no network to NVIDIA from there). Each slice is then pushed to the learner's GitHub repo, Vercel deploys it, and the learner tries it on their phone at the Vercel link with the real Nemotron AI. Live checks of the deployed link use its `/api/health` page.

## Slices

- [ ] **1. The app opens on your phone and talks to the database and the AI**
  Becomes usable: The Vercel link opens Study Pal on a phone: calm home screen, navbar with burger, pomodoro button and avatar, and the empty state with a plus button and "no units added yet". A health page confirms Supabase and Nemotron both answer.
  Why now: Sets up the project and proves the three outside services (Vercel, Supabase, Nemotron) work together before anything depends on them. The model name and free limits are unverified, so we find out on day one.
  PRD ref: `prd.md > Home and navigation`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Home and Navbar`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > External Services and Dependencies`
  Build: Scaffold Next.js with TypeScript and Tailwind per the file structure; calm palette from Look and Feel; navbar and empty home; the secret student ID in local storage; Supabase tables (`students`, `courses`, `units`, `attempts`); `lib/supabase.ts`, `lib/nvidia.ts` with a stand-in AI when no key is set; `GET /api/home`; `GET /api/health` that pings Supabase and Nemotron; `.env.example`; README.
  Verify (mechanical): `npm run build` passes; the app runs locally and a phone-sized screenshot shows the empty home; `/api/home` returns an empty list for a new ID; after deploy, the live `/api/health` reports Supabase ok and Nemotron ok.
  Learner check: Open the Vercel link on your phone. You should see the navbar (burger on the left, pomodoro and avatar on the right) and a plus button with "no units added yet". Say whether the colors and feel match what you pictured.
  Commit: `Scaffold Study Pal with home screen, database and AI health check`

- [ ] **2. You can add a unit and the AI breaks it into topics**
  Becomes usable: Tap plus, enter course and level, add a unit name, pick a PDF from the phone and say which topic you're at. The phone reads the text, the AI splits it into topics and writes the baseline and final questions, and the unit appears on the home screen as a card in two columns.
  Why now: Every later step needs a unit with topics and questions. It also proves the risky parts: reading a PDF on a phone and getting usable structured output from Nemotron.
  PRD ref: `prd.md > Adding a course and unit`, `prd.md > Home and navigation`, `prd.md > The Core Journey` (steps 2–4)
  Spec ref: `spec.md > Add Course and Unit`, `spec.md > Unit Analysis (AI)`, `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: `app/add/page.tsx` with course, level, unit, PDF picker (pdf.js in the browser), current topic, and a paste-text fallback; `POST /api/units` that asks the AI for topics with key parts plus baseline and final questions as JSON, retries once on bad output, and saves to Supabase; unit cards with generated artwork in two columns.
  Verify (mechanical): Build passes; with the stand-in AI, adding a sample unit from a small test PDF saves topics and questions in Supabase and the home screen shows its card; an unreadable file shows the plain message; live, a real unit is analyzed by Nemotron.
  Learner check: On your phone, tap plus, add a course and unit, pick a short PDF of yours, and choose the topic you're at. You should see the unit card on the home screen. Open it and check the topics look right for that material.
  Commit: `Add course and unit with PDF reading and AI topic analysis`

- [ ] **3. You take the baseline test and see your strong and weak topics**
  Becomes usable: Opening a unit starts the baseline test: one topic at a time, five questions, mostly typed, with a progress box of the other topics. Answers are marked by the AI, and the results screen shows strong and weak topics and overall understanding.
  Why now: This is the first half of the kernel, testing first. It's where early feedback shapes the rest of the build.
  PRD ref: `prd.md > Baseline mock test`, `prd.md > The Core Journey` (steps 5–6)
  Spec ref: `spec.md > Baseline and Final Tests`, `spec.md > Results, Style and Topic Choice`, `spec.md > Data Model`
  Build: `app/unit/[id]/page.tsx` flow; `TestView` and `TopicProgress`; `POST /api/mark` marking a topic's five answers in one AI call and saving an attempt; `Results` with strong and weak topics.
  Verify (mechanical): Build passes; with the stand-in AI, answering all topics saves baseline attempts and the results screen lists strong and weak topics; live, typed answers are marked by Nemotron.
  Learner check: Open your unit and take the test. Answer some questions well and some badly on purpose. The results should show the topics you answered badly as weak.
  Commit: `Add baseline test with AI marking and results`

- [ ] **4. A weak topic is taught in your chosen style**
  Becomes usable: After results, choose 5-year-old, gossip or nerd and where to start (topic one or custom topics). Weak topics are taught step by step in easy English with a real-life example and a simple drawing per step. A strong topic shows the nudge and an optional quick check.
  Why now: The second half of the kernel, teaching only the gaps. It's the riskiest output (AI drawings), so it comes right after testing.
  PRD ref: `prd.md > Teaching styles and starting point`, `prd.md > Lesson`
  Spec ref: `spec.md > Results, Style and Topic Choice`, `spec.md > Lesson`, `spec.md > Important Failure Modes`
  Build: Style and topic choice; `POST /api/lesson` that writes a lesson as steps with SVG, saved by topic and style; `LessonView` and `DiagramSvg` with soft motion and a text-card fallback; strong-topic nudge with quick check.
  Verify (mechanical): Build passes; with the stand-in AI, a lesson renders its steps and drawings and is saved so a second visit makes no new AI call; a broken drawing shows as a text card; live, Nemotron writes a lesson.
  Learner check: Pick the 5-year-old style and open a weak topic. Read the lesson. Does it explain the topic simply, and do the drawings help you understand it?
  Commit: `Add teaching styles and AI lessons with drawings`

- [ ] **5. Topic checks, the final test, and your before-and-after score**
  Becomes usable: Each lesson ends with a short topic check. When all topics up to your current one are done, the final test runs (same parts, different questions), and the before-and-after screen compares baseline and final scores per topic and overall.
  Why now: Closes the kernel and gives the demo its "oh, that's cool" moment.
  PRD ref: `prd.md > Topic check`, `prd.md > Final test and before-and-after score`, `prd.md > The Core Journey` (steps 10–12)
  Spec ref: `spec.md > Topic Check`, `spec.md > Baseline and Final Tests`, `spec.md > Before-and-After and Profile`
  Build: Topic check after each lesson using `/api/mark`; final test from the saved final questions; `ScoreCompare` screen.
  Verify (mechanical): Build passes; with the stand-in AI, a full run (baseline, lesson, check, final) shows both scores side by side from saved attempts; live, the full journey works on the deployed link.
  Learner check: Finish your unit: do the lessons and checks, then the final test. The last screen should show your before and after scores. Does the improvement feel believable?
  Commit: `Add topic checks, final test and before-and-after score`

- [ ] **6. Courses menu, pomodoro timer, and your profile**
  Becomes usable: The burger opens a dropdown of your courses, the pomodoro button runs a 25/5 focus timer, and the avatar opens a profile showing overall performance across your units.
  Why now: Rounds out the navbar the PRD describes. None of it is needed to prove the kernel, so it comes last.
  PRD ref: `prd.md > Home and navigation`, `prd.md > Pomodoro`
  Spec ref: `spec.md > Home and Navbar`, `spec.md > Pomodoro`, `spec.md > Before-and-After and Profile`
  Build: Courses dropdown; `Pomodoro` panel; `app/profile/page.tsx` from saved attempts.
  Verify (mechanical): Build passes; screenshots show the dropdown listing courses, the timer counting down, and the profile with scores.
  Learner check: Tap the burger, the pomodoro button and your avatar. Each should do what you described in the PRD.
  Commit: `Add courses menu, pomodoro timer and profile`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 3 (baseline test and results on your phone)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- Added `supabase/schema.sql`, `lib/types.ts`, `lib/standin.ts` and a local JSON stand-in database (used only when Supabase settings are missing) — needed to build and verify offline, since this workspace cannot reach NVIDIA or Supabase directly.
- Slice 1 status: built, verified locally, committed and pushed; live check waits on the Vercel settings being active (first deploy showed stand-in AI and local database).
