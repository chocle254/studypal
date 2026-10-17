// Shapes of the data Study Pal keeps. See devpost/spec.md > Data Model.

export type QuestionType = "typed" | "choice";

export interface Question {
  id: string;
  part: string; // which key part of the topic this question covers
  type: QuestionType;
  prompt: string;
  options?: string[]; // only for "choice"
  answer: string; // the reference answer used for marking
}

export type Style = "five" | "gossip" | "nerd";

export interface LessonStep {
  title: string;
  text: string;
  svg?: string; // a simple AI-drawn diagram; falls back to a text card if missing or broken
}

export interface Lesson {
  style: Style;
  intro: string;
  steps: LessonStep[];
  check: Question[]; // the short topic check after the lesson
}

export interface Topic {
  part: number; // which part of the PDF (= which round) this topic came from
  title: string;
  key_parts: string[];
  notes: string; // core facts from the material, used for questions and lessons
  baseline: Question[];
  final: Question[];
  lessons?: Partial<Record<Style, Lesson>>;
}

export interface Unit {
  id: string;
  course_id: string;
  student_id: string;
  name: string;
  current_topic: number; // index of the topic the student is at
  material_text: string;
  style: Style | null;
  topics: Topic[];
  parts_read: number; // how many parts of the PDF the AI has read so far
  reached_current: boolean; // the topic the student said they're at has been found; stop reading further
  created_at: string;
}

export interface Course {
  id: string;
  student_id: string;
  name: string;
  level: string;
  created_at: string;
}

export type AttemptKind = "baseline" | "check" | "final" | "quick";

export interface Attempt {
  id: string;
  unit_id: string;
  topic_index: number;
  kind: AttemptKind;
  score: number; // 0..1
  detail: unknown;
  created_at: string;
}

export interface HomeUnit {
  id: string;
  name: string;
  topics: number;
}

export interface HomeCourse {
  id: string;
  name: string;
  level: string;
  units: HomeUnit[];
}

// What the phone is allowed to see of a unit: no model answers.
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
}

export interface PublicTopic {
  part: number;
  title: string;
  key_parts: string[];
  ready: boolean; // its questions have been written
}

export interface PublicUnit {
  id: string;
  name: string;
  course: string;
  level: string;
  current_topic: number;
  style: Style | null;
  topics: PublicTopic[];
  parts_read: number;
  parts_total: number;
  can_read_more: boolean;
  pages_read: string | null; // e.g. "1–15 of 80"
  progress: TopicProgress[]; // one per topic
}

// How a student did on each topic, by kind of test (latest attempt of each kind).
export interface TopicProgress {
  baseline?: number; // 0..1
  check?: number;
  final?: number;
}

export interface TestTopic {
  topic: number; // index in the unit's topics
  title: string;
  questions: PublicQuestion[];
}

export interface MarkedAnswer {
  id: string;
  score: number;
  feedback: string;
}
