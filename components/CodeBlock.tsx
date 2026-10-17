"use client";

import { useState } from "react";

// A code example in a small window, with a Copy button. Scrolls sideways on a phone; lines never wrap.
export default function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Older phones: copy through a hidden text box.
      const box = document.createElement("textarea");
      box.value = code;
      document.body.appendChild(box);
      box.select();
      document.execCommand("copy");
      box.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-[#2c3530] bg-[#1b211e] text-[#e3e8e4] animate-rise">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#232a26] border-b border-[#2c3530]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#c48f72]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#d9bf7a]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#6f9282]" />
        <span className="ml-2 text-xs font-semibold text-[#9aa79f]">{language}</span>
        <button
          onClick={copy}
          className="ml-auto rounded-md px-2.5 py-1 text-xs font-bold bg-[#2f3833] active:scale-95 transition"
          aria-label="Copy code"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}
