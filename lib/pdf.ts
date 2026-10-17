// Reads the text out of a PDF right on the phone, using Mozilla's pdf.js.
// The PDF itself never leaves the phone; only the text is sent to Study Pal.

export class UnreadableFileError extends Error {}

const MAX_CHARS = 400_000; // about 250 pages; Study Pal reads it part by part

export async function readPdfText(file: File, onProgress?: (page: number, total: number) => void): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch {
    throw new UnreadableFileError("I couldn't open this file. Is it a PDF?");
  }

  const parts: string[] = [];
  let length = 0;
  for (let i = 1; i <= doc.numPages && length < MAX_CHARS; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Rebuild lines: pdf.js gives text pieces with a flag for line ends.
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line.trim());
        line = "";
      }
    }
    if (line.trim()) lines.push(line.trim());
    const pageText = lines.filter(Boolean).join("\n");
    parts.push(pageText);
    length += pageText.length;
  }

  return cleanText(parts.join("\n\f\n")); // \f marks a page break
}

export function cleanText(text: string): string {
  const cleaned = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CHARS);
  if (cleaned.replace(/\s/g, "").length < 150) {
    throw new UnreadableFileError(
      "I couldn't read text from this file. Try a PDF where you can select the text, or paste the text instead.",
    );
  }
  return cleaned;
}
