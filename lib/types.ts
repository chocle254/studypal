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
  title: string;
  key_parts: string[];
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
