---
doc: prd
status: approved
---

# AI Study Pal (working title) — Product Requirements

An AI study assistant for students that tests what they already know, teaches only the topics they're weak in, in a fun style they choose, and shows a before-and-after score.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## The Core Journey
1. A new student opens the app on their phone and sees an empty home screen with a plus button and the message "no units added yet" (`scope.md > What "Working" Looks Like`).
2. They tap the plus button, enter their course and their level, and go to the next screen.
3. On that screen they add a unit, upload its study material (a PDF or text), and say which topic they're currently at.
4. The AI reads the whole unit, from the first topic up to the topic they're at.
5. The student takes a baseline mock test, one topic at a time: five questions per topic, mostly typed answers with a few options.
6. They see the results: which topics they're strong in, which they're weak in, and their overall understanding of the unit.
7. They pick a teaching style (5-year-old, gossip, nerd).
8. They choose whether to start from topic one or pick custom topics to study.
9. For each weak topic, the AI teaches it in simple steps, with many images and real-life analogies, in the chosen style.
10. After each topic, a short check shows whether the lesson landed.
11. Once they've been through the topics up to the one they were at, they take the final test: the same parts of each topic as the baseline, but with different questions and a different question structure.
12. They see their before-and-after score. That is the proof the teaching worked.

## Screens and Layout
Mobile first. A PC version is planned later.
- **Home screen**: top navbar plus the main area (below).
- **Add course screen**: course and level.
- **Add unit screen**: unit name, upload of study material, and the topic the student is at.
- **Baseline test screen**: one topic at a time.
- **Results screen**.
- **Style and topic choice screen**.
- **Lesson screen**: one topic taught.
- **Topic check screen**.
- **Final test screen**.
- **Before-and-after screen**.
- **Profile screen**: opened from the avatar.

**Top navbar** (`scope.md > The Core Loop`):
- Far left: a burger icon. Tapping it opens a dropdown listing the courses added so far.
- Far right: a pomodoro button and the user's avatar. Tapping the avatar opens their profile details and their overall performance across all units.

**Main area of the home screen:**
- Nothing added yet: a plus button and the text "no units added yet".
- Units added: cards arranged in two columns, each with a good-looking image and the unit name.

**Test screens**: the current topic and its five questions are shown, plus a box showing the rest of the topics, unmarked until they're done.

## Look and Feel
Calm and clean. Soft, less-bright colors to be comfortable for the eyes. Playful for the topics taught in 5-year-old style. Some animation and motion design. No reference apps given.

## Features and Behavior

### Home and navigation
- As a student, I want to see all my units on one screen so that I can open the one I'm studying.
  - [ ] With no units added, the home screen shows a plus button and "no units added yet".
  - [ ] With units added, they show in two columns as cards, each with an image and the unit name.
  - [ ] Tapping the burger icon shows a dropdown of the added courses.
  - [ ] The pomodoro button and the avatar appear on the far right of the navbar.
  - [ ] Tapping the avatar shows profile details and overall performance across the units.

### Pomodoro
- As a student, I want a pomodoro button so that I have a focus timer for a good learning environment.
  - [ ] Tapping the pomodoro button starts a study-block timer the student can see.

### Adding a course and unit
- As a student, I want to add my course, my level, and a unit's study material so that the AI can learn what I'm studying.
  - [ ] Tapping the plus button asks for a course and a level, then moves to the next screen.
  - [ ] The next screen lets the student add a unit, upload the study material, and say which topic they're at.
  - [ ] Uploads are organized under the course and then the unit.
  - [ ] The AI reads the material from the first topic to the topic the student is at.

### Baseline mock test
- As a student, I want a test that shows which topics I know so that I only spend time on what I don't.
  - [ ] The test shows one topic at a time, with five questions for it.
  - [ ] Answers are mostly typed, with some options.
  - [ ] A box shows the remaining topics, unmarked until they're done.
  - [ ] The first five questions cover different parts of the topic.
  - [ ] After the test, a results screen shows strong and weak topics and overall understanding.

### Teaching styles and starting point
- As a student, I want the lesson in a style I like so that learning is fun.
  - [ ] The student can choose 5-year-old, gossip or nerd.
  - [ ] The student can start from topic one or choose custom topics.

### Lesson
- As a student, I want weak topics explained in the simplest way so that I understand them, not just copy them.
  - [ ] A lesson is structured step by step, in easy English, with many images.
  - [ ] Lessons use real-life examples. For instance, a white blood cell is explained as a dog protecting a house from an intruder, and its membrane opening like a blanket to take in the virus and close around it.
  - [ ] The style changes how the topic is explained.
  - [ ] A strong topic shows a nudge ("you are great in this topic, we don't need to spend time on it") and an option to go through it as a quick check, which the AI brushes through.

### Topic check
- As a student, I want a check after each topic so that I know whether the lesson worked.
  - [ ] A short check follows each lesson.
  - [ ] The check shows how the student did on that topic.

### Final test and before-and-after score
- As a student, I want to see my progress so that I know the teaching worked.
  - [ ] The final test comes after the topics up to the student's current topic are done.
  - [ ] The final test covers the same parts of each topic as the baseline, with different questions and a different structure.
  - [ ] The result screen shows the baseline score and the final score side by side.

## States and Boundaries
- **First use**: empty home screen with a plus button and "no units added yet".
- **All topics strong**: a nudge instead of a lesson, plus an option to do a quick check, which the AI brushes through.
- **Between visits**: units, scores and learning patterns are still there when the student comes back, without signing in. Where they're stored is for `4-spec`.
- **Sign-in**: not in the hackathon version. Real accounts are planned later, because each student's learning patterns are saved separately.

## Product Decisions
- Mobile first, with a PC version later — the learner is designing for phones first.
- Badges left out for now; pomodoro replaces time spent on site — to keep the navbar small and add a focus aid for a good learning environment.
- The avatar stays — students should check their account for overall performance across all units.
- No sign-in for the hackathon, accounts later — the AI learns each student's patterns, so real accounts are needed eventually.
- Questions are shown one topic at a time with five questions each — it avoids a long "school paper" and keeps the test feeling designed.
- The final test uses different questions on the same parts of each topic, with a different structure — so the improvement shows understanding, not memory.
- Answers are mostly typed — to test real understanding.
- A per-topic check stays in the proof of concept — checking after each topic keeps Study Pal from feeling like a plain AI chatbot.
- Calm, clean, low-brightness colors with playful motion for 5-year-old topics — comfortable for the eyes.

## What We're Building
- Home screen with navbar (burger, pomodoro, avatar), empty state, and two-column unit cards
- Add course, level, unit, study material, and current topic
- Baseline mock test (five questions per topic) and results
- Teaching style choice (5-year-old, gossip, nerd) and topic choice
- Lessons for weak topics, with the strong-topic nudge and quick check
- Per-topic checks
- Final test and the before-and-after score
- Profile screen showing overall performance

## Deferred From the POC
- Badges and commitment tracking — need data across sessions.
- Sign-in and real accounts — the hackathon version has none.
- Multiple-device sync — comes with accounts.
- PC version — mobile first.
- Audio, video and image uploads — text or PDF is enough for the proof.
- Styles unlocked or blurred by performance — a reward layer.
- Learning-pattern detection — needs history across sessions.
- Exam mode for school exam revision — builds on the same tests.
- "What's missing from this diagram" visual test — bigger than the proof.

## Possible Later Enhancements
- Badges for commitment and performance.
- Exam mode.
- Styles unlocked by mock-test results.
- Convincing, fun messages that nudge students not to cheat.

## Non-Goals
- Not a general chatbot that answers any question — it teaches the student's own unit material.
- No sign-in in the hackathon version — real accounts are planned later.

## Open Questions
- Where the lesson images come from (generated, drawn, or taken from the material). Can wait until `4-spec`.
- What happens when an uploaded file can't be read. Must be decided before `5-build`.
- Whether the student sees feedback after each baseline answer or only at the end. Can wait until the build, assumed: only at the end.
- How long a pomodoro block is. Can wait until the build.
- The project's final name. Can wait.
