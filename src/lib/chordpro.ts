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

export const MAX_CHORDPRO_SOURCE_LENGTH = 250_000;

const directiveAliases: Record<string, string[]> = {
  title: ["title", "t"],
  artist: ["artist"],
  key: ["key"],
  tempo: ["tempo"],
  time: ["time", "time_signature"],
};

export function getChordProDirectiveValue(source: string, name: keyof typeof directiveAliases) {
  const aliases = directiveAliases[name].join("|");
  return source.match(new RegExp(`\\{(?:${aliases})\\s*:\\s*([^}]*)\\}`, "i"))?.[1].trim() ?? "";
}

export function parseChordProMetadata(source: string): ChordProMetadata {
  return {
    title: getChordProDirectiveValue(source, "title") || "Sin título",
    artist: getChordProDirectiveValue(source, "artist"),
    key: getChordProDirectiveValue(source, "key") || "C",
    tempo: Number(getChordProDirectiveValue(source, "tempo")) || 72,
    timeSignature: getChordProDirectiveValue(source, "time") || "4/4",
  };
}

export function updateChordProDirective(source: string, directive: string, value: string) {
  const aliases = directiveAliases[directive]?.join("|") ?? directive;
  const pattern = new RegExp(`\\{(?:${aliases})\\s*:[^}]*\\}`, "i");
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
  const sectionStack: Array<{ type: string; line: number }> = [];

  if (source.length > MAX_CHORDPRO_SOURCE_LENGTH) {
    diagnostics.push({
      line: 1,
      severity: "error",
      message: `El documento supera el límite de ${Math.round(MAX_CHORDPRO_SOURCE_LENGTH / 1000)} KB.`,
    });
  }

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

    for (const match of line.matchAll(/\{(start|end)_of_([a-z_]+)(?::\s*[^}]*)?\}/gi)) {
      const action = match[1].toLowerCase();
      const type = match[2].toLowerCase();
      if (action === "start") {
        sectionStack.push({ type, line: index + 1 });
        continue;
      }

      const current = sectionStack.at(-1);
      if (!current) {
        diagnostics.push({ line: index + 1, severity: "error", message: `La sección “${type}” se cierra sin haber sido abierta.` });
      } else if (current.type !== type) {
        diagnostics.push({ line: index + 1, severity: "error", message: `Se esperaba cerrar “${current.type}”, no “${type}”.` });
      } else {
        sectionStack.pop();
      }
    }
  });

  sectionStack.forEach((section) => {
    diagnostics.push({ line: section.line, severity: "error", message: `Falta cerrar la sección “${section.type}”.` });
  });

  if (!source.trim()) diagnostics.push({ line: 1, severity: "error", message: "La canción está vacía." });

  const title = getChordProDirectiveValue(source, "title");
  const key = getChordProDirectiveValue(source, "key");
  const tempo = getChordProDirectiveValue(source, "tempo");
  const time = getChordProDirectiveValue(source, "time");

  if (!title) diagnostics.push({ line: findDirectiveLine(lines, ["title", "t"]), severity: "error", message: "Agrega un título para poder guardar la canción." });
  if (key && !/^[A-G](?:#|b)?(?:m|maj|min)?$/i.test(key)) diagnostics.push({ line: findDirectiveLine(lines, ["key"]), severity: "error", message: "Usa una tonalidad como C, F#, Bb o Am." });
  if (tempo && (!/^\d+$/.test(tempo) || Number(tempo) < 20 || Number(tempo) > 300)) diagnostics.push({ line: findDirectiveLine(lines, ["tempo"]), severity: "error", message: "El tempo debe ser un número entero entre 20 y 300 bpm." });
  if (time && !/^\d{1,2}\/(?:1|2|4|8|16|32)$/.test(time)) diagnostics.push({ line: findDirectiveLine(lines, ["time", "time_signature"]), severity: "error", message: "Usa un compás válido como 4/4, 3/4 o 6/8." });

  return diagnostics;
}

function findDirectiveLine(lines: string[], aliases: string[]) {
  const pattern = new RegExp(`\\{(?:${aliases.join("|")})\\s*:`, "i");
  const index = lines.findIndex((line) => pattern.test(line));
  return index < 0 ? 1 : index + 1;
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

export function formatChordProSource(source: string) {
  const lines = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const formatted: string[] = [];
  let consecutiveBlankLines = 0;

  for (const line of lines) {
    const trimmedLine = line.trimEnd();
    if (!trimmedLine) {
      consecutiveBlankLines += 1;
      if (consecutiveBlankLines <= 2) formatted.push("");
      continue;
    }
    consecutiveBlankLines = 0;
    formatted.push(trimmedLine);
  }

  return `${formatted.join("\n").trim()}\n`;
}

export function chordProToPlainLyrics(source: string) {
  const sectionNames: Record<string, string> = {
    verse: "Verso",
    chorus: "Coro",
    prechorus: "Pre-coro",
    bridge: "Puente",
    intro: "Intro",
    instrumental: "Instrumental",
    interlude: "Interludio",
    solo: "Solo",
    tag: "Tag",
    outro: "Outro",
  };

  const output = source.split("\n").flatMap((rawLine) => {
    const line = rawLine.trimEnd();
    const section = line.match(/^\{start_of_([a-z_]+)(?::\s*([^}]+))?\}$/i);
    if (section) {
      const type = section[1].replaceAll("_", "").toLowerCase();
      return ["", (section[2]?.trim() || sectionNames[type] || section[1]).toUpperCase()];
    }
    if (/^\{end_of_[^}]+\}$/i.test(line)) return [];

    const comment = line.match(/^\{comment:\s*([^}]+)\}$/i);
    if (comment) return ["", comment[1].trim().toUpperCase()];
    if (/^\{[^}]+\}$/.test(line)) return [];
    return [line.replace(/\[[^\]]+]/g, "")];
  });

  return `${output.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function sanitizeChordSheetHtml(html: string) {
  return html
    .replace(/<h1\b[^>]*class=(["'])[^"']*\btitle\b[^"']*\1[^>]*>[\s\S]*?<\/h1>/gi, "")
    .replace(/<h2\b[^>]*class=(["'])[^"']*\bsubtitle\b[^"']*\1[^>]*>[\s\S]*?<\/h2>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed|form)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "");
}
