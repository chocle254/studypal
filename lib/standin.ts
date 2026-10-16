// The stand-in AI. Used ONLY when no NVIDIA_API_KEY is set (local building and checks).
// It gives simple, predictable answers so each step can be verified offline.
// It is labelled everywhere it appears and is never used on the live app once the key is set.

import type { AskOptions } from "./nvidia";

export async function standIn(opts: AskOptions): Promise<string> {
  switch (opts.task) {
    case "ping":
      return "OK";
    default:
      return "{}";
  }
}
