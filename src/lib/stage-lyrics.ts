import type { SongSection } from "@/types/domain";

export type SingerSection = { label: string; type: string; sourceIndex: number; lines: string[] };
export type StageJumpSection = SongSection & { origin: "directive" | "comment" | "saved"; sourceType?: string };

const labels: Record<string, string> = { verse: "Verso", chorus: "Coro", bridge: "Puente", prechorus: "Pre-coro", intro: "Intro", outro: "Final", instrumental: "Instrumental" };
const sectionTypes: Record<string, SongSection["type"]> = {
  verse: "verse", chorus: "chorus", bridge: "bridge", prechorus: "prechorus",
  intro: "intro", outro: "outro", instrumental: "instrumental", solo: "instrumental",
};

function getCommentSectionType(comment: string): SongSection["type"] | undefined {
  const normalized = comment.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/^verso\b/.test(normalized)) return "verse";
  if (/^coro\b/.test(normalized)) return "chorus";
  if (/^puente\b/.test(normalized)) return "bridge";
  if (/^pre[- ]?coro\b/.test(normalized)) return "prechorus";
  if (/^intro\b/.test(normalized)) return "intro";
  if (/^(final|outro)\b/.test(normalized)) return "outro";
}

export function getStageJumpSections(source: string, savedSections: SongSection[]): StageJumpSection[] {
  const sections: StageJumpSection[] = [];
  const counts = new Map<string, number>();
  const directives = /\{start_of_([a-z_]+)(?::\s*([^}]*))?\}|\{comment:\s*([^}]+)\}/gi;
  for (const match of source.matchAll(directives)) {
    const sourceType = match[1]?.toLowerCase();
    const typeName = sourceType?.replaceAll("_", "");
    const comment = match[3]?.trim();
    const type = typeName ? sectionTypes[typeName] ?? "instrumental" : comment ? getCommentSectionType(comment) : undefined;
    if (!type) continue;
    const number = (counts.get(type) ?? 0) + 1;
    counts.set(type, number);
    sections.push({ id: `stage-${type}-${sections.length}`, type, label: comment || match[2]?.trim() || `${labels[type]} ${number}`, origin: sourceType ? "directive" : "comment", sourceType });
  }
  return sections.length ? sections : savedSections.map((section) => ({ ...section, origin: "saved" }));
}

export function addStageSectionLabels(source: string, sections: StageJumpSection[]): string {
  const directives = sections.filter((section) => section.origin === "directive");
  let index = 0;
  return source.replace(/\{start_of_([a-z_]+)(?::\s*([^}]*))?\}/gi, (match, rawType: string, label: string | undefined) => {
    const section = directives[index++];
    if (!section || section.sourceType !== rawType.toLowerCase() || label?.trim()) return match;
    return `{start_of_${rawType}: ${section.label}}`;
  });
}

export function getSingerSections(source: string): SingerSection[] {
  const sections: SingerSection[] = [];
  const counts = new Map<string, number>();
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
      const sectionType = sectionTypes[type] ?? "instrumental";
      const number = (counts.get(sectionType) ?? 0) + 1;
      counts.set(sectionType, number);
      current = { label: start[2]?.trim() || `${labels[sectionType] || sectionType} ${number}`, type, sourceIndex: sourceIndex++, lines: [] };
      continue;
    }
    if (/^\{end_of_[^}]+\}$/i.test(raw)) { flush(); current = { label: "Interludio", type: "instrumental", sourceIndex: -1, lines: [] }; continue; }
    const comment = raw.match(/^\{comment:\s*([^}]+)\}$/i);
    if (comment) {
      flush();
      const label = comment[1].trim();
      const type = getCommentSectionType(label);
      if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
      current = { label, type: type ?? "instrumental", sourceIndex: sourceIndex++, lines: [] };
      continue;
    }
    if (/^\{[^}]+\}$/.test(raw)) continue;
    const line = raw.replace(/\[[^\]]*\]/g, "").trimEnd();
    if (line.trim() || current.lines.some((entry) => entry.trim())) current.lines.push(line);
  }
  flush();
  return sections;
}
