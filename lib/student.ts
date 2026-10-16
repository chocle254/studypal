// The secret student ID. Made once per phone and kept in the browser's local storage.
// There is no sign-in in the hackathon version: this ID is how the app recognizes a returning student.

const KEY = "studypal.student";

export function getStudentId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode or blocked storage: fall back to an ID for this visit only.
    return crypto.randomUUID();
  }
}

export const isUuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
