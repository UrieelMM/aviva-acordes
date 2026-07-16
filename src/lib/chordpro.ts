import type { SongSection } from "@/types/domain";

export type ChordProDiagnostic = {
  line: number;
  severity: "error" | "warning";
  message: string;
};

export type ChordProMetadata = {
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature: string;
};

const directiveAliases: Record<string, string[]> = {
  title: ["title", "t"],
  artist: ["artist"],
  key: ["key"],
  tempo: ["tempo"],
  time: ["time", "time_signature"],
};

export function parseChordProMetadata(source: string): ChordProMetadata {
  const get = (name: keyof typeof directiveAliases) => {
    const aliases = directiveAliases[name].join("|");
    return source.match(new RegExp(`\\{(?:${aliases})\\s*:\\s*([^}]*)\\}`, "i"))?.[1].trim() ?? "";
  };

  return {
    title: get("title") || "Sin título",
    artist: get("artist"),
    key: get("key") || "C",
    tempo: Number(get("tempo")) || 72,
    timeSignature: get("time") || "4/4",
  };
}

export function updateChordProDirective(source: string, directive: string, value: string) {
  const pattern = new RegExp(`\\{${directive}\\s*:[^}]*\\}`, "i");
  const replacement = `{${directive}: ${value}}`;
  if (pattern.test(source)) return source.replace(pattern, replacement);

  const lines = source.split("\n");
  const firstContentLine = lines.findIndex((line) => !line.trim().startsWith("{") && line.trim() !== "");
  const insertAt = firstContentLine < 0 ? lines.length : firstContentLine;
  lines.splice(insertAt, 0, replacement);
  return lines.join("\n");
}

export function validateChordPro(source: string): ChordProDiagnostic[] {
  const diagnostics: ChordProDiagnostic[] = [];
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    const openBrackets = (line.match(/\[/g) ?? []).length;
    const closeBrackets = (line.match(/\]/g) ?? []).length;
    if (openBrackets !== closeBrackets) diagnostics.push({ line: index + 1, severity: "error", message: "El acorde tiene corchetes sin cerrar." });

    const openBraces = (line.match(/\{/g) ?? []).length;
    const closeBraces = (line.match(/\}/g) ?? []).length;
    if (openBraces !== closeBraces) diagnostics.push({ line: index + 1, severity: "error", message: "La directiva tiene llaves sin cerrar." });

    for (const match of line.matchAll(/\[([^\]]*)\]/g)) {
      if (!match[1].trim()) diagnostics.push({ line: index + 1, severity: "warning", message: "Hay un acorde vacío." });
    }
  });

  const metadata = parseChordProMetadata(source);
  if (metadata.title === "Sin título") diagnostics.push({ line: 1, severity: "warning", message: "Agrega una directiva {title: ...}." });
  if (!source.trim()) diagnostics.push({ line: 1, severity: "error", message: "La canción está vacía." });

  return diagnostics;
}

export function extractSections(source: string): SongSection[] {
  const sections: SongSection[] = [];
  const typeMap: Record<string, SongSection["type"]> = {
    verse: "verse",
    chorus: "chorus",
    bridge: "bridge",
    intro: "intro",
    prechorus: "prechorus",
    instrumental: "instrumental",
    outro: "outro",
  };

  for (const [index, match] of [...source.matchAll(/\{start_of_([a-z_]+)(?::\s*([^}]+))?\}/gi)].entries()) {
    const rawType = match[1].replaceAll("_", "");
    const type = typeMap[rawType] ?? "instrumental";
    const defaultLabel = `${type[0].toUpperCase()}${type.slice(1)} ${index + 1}`;
    sections.push({ id: `${type}-${index + 1}`, type, label: match[2]?.trim() || defaultLabel });
  }

  return sections;
}

export function createChordProTemplate() {
  return `{title: Nueva canción}\n{artist: }\n{key: C}\n{tempo: 72}\n{time: 4/4}\n\n{comment: Intro}\n[C]  [F]  [Am]  [G]\n\n{start_of_verse: Verso 1}\n[C]Escribe aquí la primera línea\n{end_of_verse}\n\n{start_of_chorus: Coro}\n[F]Escribe aquí el [G]coro\n{end_of_chorus}`;
}
