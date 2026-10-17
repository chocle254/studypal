// Shows an AI-drawn diagram that the server has already made safe (see lib/svg.ts),
// on a soft background, with a gentle fade-in.
export default function DiagramSvg({ svg }: { svg: string }) {
  return (
    <div
      className="bg-bg px-3 pt-3 animate-rise [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-60"
      // The SVG only contains plain shapes and text; scripts, links and event handlers were stripped on the server.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
