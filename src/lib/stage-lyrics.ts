export type SingerSection = { label: string; type: string; sourceIndex: number; lines: string[] };

const labels: Record<string, string> = { verse: "Verso", chorus: "Coro", bridge: "Puente", prechorus: "Pre-coro", intro: "Intro", outro: "Final", instrumental: "Instrumental" };

export function getSingerSections(source: string): SingerSection[] {
  const sections: SingerSection[] = [];
  let current: SingerSection = { label: "Inicio", type: "intro", sourceIndex: -1, lines: [] };
  let sourceIndex = 0;
  const flush = () => {
    const lines = [...current.lines];
    while (lines.length && !lines.at(-1)?.trim()) lines.pop();
    if (lines.some((line) => line.trim())) sections.push({ ...current, lines });
  };
  for (const raw of source.replaceAll("\r\n", "\n").split("\n")) {
    const start = raw.match(/^\{start_of_([a-z_]+)(?::\s*([^}]+))?\}$/i);
    if (start) {
      flush();
      const type = start[1].replaceAll("_", "").toLowerCase();
      current = { label: start[2]?.trim() || labels[type] || type, type, sourceIndex: sourceIndex++, lines: [] };
      continue;
    }
    if (/^\{end_of_[^}]+\}$/i.test(raw)) { flush(); current = { label: "Interludio", type: "instrumental", sourceIndex: -1, lines: [] }; continue; }
    const comment = raw.match(/^\{comment:\s*([^}]+)\}$/i);
    if (comment) { flush(); current = { label: comment[1].trim(), type: "instrumental", sourceIndex: -1, lines: [] }; continue; }
    if (/^\{[^}]+\}$/.test(raw)) continue;
    const line = raw.replace(/\[[^\]]*\]/g, "").trimEnd();
    if (line.trim() || current.lines.some((entry) => entry.trim())) current.lines.push(line);
  }
  flush();
  return sections;
}
