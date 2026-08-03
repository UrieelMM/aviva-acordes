export type ChordTextImportOptions = {
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  timeSignature?: string;
  sourceUrl?: string;
};

export type ChordTextImportResult = {
  source: string;
  detectedSections: number;
  mergedChordLines: number;
  standaloneChordLines: number;
};

type ChordPosition = { chord: string; index: number };

const sectionDefinitions: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /^(?:intro|introducci[oó]n)$/i, type: "intro" },
  { pattern: /^(?:primera parte|segunda parte|verso|verse|estrofa)(?:\s+\d+)?$/i, type: "verse" },
  { pattern: /^(?:pre[- ]?(?:coro|estribillo)|prechorus)(?:\s+\d+)?$/i, type: "prechorus" },
  { pattern: /^(?:coro|chorus|estribillo)(?:\s+(?:final|\d+))?$/i, type: "chorus" },
  { pattern: /^(?:puente|bridge)(?:\s+\d+)?$/i, type: "bridge" },
  { pattern: /^(?:solo|instrumental|interludio|interlude)(?:\s+\d+)?$/i, type: "instrumental" },
  { pattern: /^(?:outro|final|cierre)$/i, type: "outro" },
];

const latinRoots: Record<string, string> = {
  DO: "C",
  RE: "D",
  MI: "E",
  FA: "F",
  SOL: "G",
  LA: "A",
  SI: "B",
};

export function convertChordTextToChordPro(rawText: string, options: ChordTextImportOptions): ChordTextImportResult {
  const lines = rawText.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const body: string[] = [];
  let openSection: string | null = null;
  let detectedSections = 0;
  let mergedChordLines = 0;
  let standaloneChordLines = 0;
  let firstChord = "";

  const closeSection = () => {
    if (!openSection) return;
    body.push(`{end_of_${openSection}}`, "");
    openSection = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      if (body.at(-1) !== "") body.push("");
      continue;
    }

    if (isPageNoise(trimmed)) continue;

    const section = detectSection(trimmed);
    if (section) {
      closeSection();
      openSection = section.type;
      detectedSections += 1;
      body.push(`{start_of_${section.type}: ${escapeDirective(section.label)}}`);
      continue;
    }

    if (containsInlineChord(trimmed)) {
      body.push(trimmed);
      continue;
    }

    const chordPositions = getChordPositions(line);
    if (chordPositions) {
      firstChord ||= chordPositions[0]?.chord ?? "";
      const nextLine = lines[index + 1]?.trimEnd();
      const nextTrimmed = nextLine?.trim() ?? "";
      const nextIsText = Boolean(nextTrimmed)
        && !isPageNoise(nextTrimmed)
        && !detectSection(nextTrimmed)
        && !getChordPositions(nextLine ?? "")
        && !containsInlineChord(nextTrimmed);

      if (nextIsText) {
        body.push(mergeChordsWithLyrics(chordPositions, nextLine ?? ""));
        mergedChordLines += 1;
        index += 1;
      } else {
        body.push(chordPositions.map(({ chord }) => `[${chord}]`).join("  "));
        standaloneChordLines += 1;
      }
      continue;
    }

    body.push(trimmed);
  }

  closeSection();

  const inferredKey = normalizeKey(options.key) || chordRoot(firstChord) || "C";
  const headers = [
    `{title: ${escapeDirective(options.title.trim() || "Nueva canción")}}`,
    `{artist: ${escapeDirective(options.artist?.trim() || "")}}`,
    `{key: ${inferredKey}}`,
    `{tempo: ${validTempo(options.tempo)}}`,
    `{time: ${validTime(options.timeSignature)}}`,
  ];
  if (options.sourceUrl?.trim()) headers.push(`{x_source_url: ${escapeDirective(options.sourceUrl.trim())}}`);

  const compactBody = compactBlankLines(body);
  return {
    source: `${headers.join("\n")}\n\n${compactBody.join("\n").trim()}\n`,
    detectedSections,
    mergedChordLines,
    standaloneChordLines,
  };
}

function detectSection(value: string) {
  const bracketed = value.match(/^\[([^\]]+)]$/)?.[1]?.trim();
  const parenthesized = value.match(/^\(([^)]+)\)$/)?.[1]?.trim();
  const plain = value.replace(/:$/, "").trim();
  const label = bracketed ?? parenthesized ?? plain;
  for (const definition of sectionDefinitions) {
    if (definition.pattern.test(label)) return { type: definition.type, label };
  }
  return null;
}

function getChordPositions(value: string): ChordPosition[] | null {
  const normalized = value.trimStart();
  const tokens = [...normalized.matchAll(/\S+/g)];
  if (!tokens.length) return null;

  const chords: ChordPosition[] = [];
  let meaningfulTokens = 0;
  for (const match of tokens) {
    const raw = match[0];
    const withoutSeparators = raw.replace(/^[|,]+|[|,:;]+$/g, "");
    const token = /^\([^()]+\)$/.test(withoutSeparators) ? withoutSeparators.slice(1, -1) : withoutSeparators;
    if (!token || /^(?:-|–|—|x\d+|\d+x)$/i.test(token)) continue;
    meaningfulTokens += 1;
    const chord = normalizeChord(token);
    if (!chord) return null;
    chords.push({ chord, index: match.index ?? 0 });
  }
  return meaningfulTokens > 0 && chords.length === meaningfulTokens ? chords : null;
}

function normalizeChord(value: string) {
  const match = value.match(/^(DO|RE|MI|FA|SOL|LA|SI|[A-G])([#b]?)([^/]*)?(?:\/(DO|RE|MI|FA|SOL|LA|SI|[A-G])([#b]?))?$/i);
  if (!match) return "";
  const root = normalizeRoot(match[1]);
  const accidental = match[2] ?? "";
  const suffix = match[3] ?? "";
  if (suffix && !isChordSuffix(suffix)) return "";
  const bass = match[4] ? `/${normalizeRoot(match[4])}${match[5] ?? ""}` : "";
  return `${root}${accidental}${suffix}${bass}`;
}

function isChordSuffix(value: string) {
  if (!/^[a-zA-Z0-9+#()°øΔ-]+$/.test(value)) return false;
  const withoutMusicalTerms = value.replace(/maj|min|dim|aug|sus|add|omit|alt|dom|no|m/gi, "");
  return !/[a-z]/i.test(withoutMusicalTerms);
}

function normalizeRoot(value: string) {
  return latinRoots[value.toUpperCase()] ?? value.toUpperCase();
}

function mergeChordsWithLyrics(chords: ChordPosition[], lyricLine: string) {
  let lyrics = lyricLine.trimStart();
  const positions = new Map<number, string[]>();
  chords.forEach(({ chord, index }) => {
    const target = Math.min(index, lyrics.length);
    positions.set(target, [...(positions.get(target) ?? []), chord]);
  });
  [...positions.entries()].sort(([a], [b]) => b - a).forEach(([index, chordGroup]) => {
    lyrics = `${lyrics.slice(0, index)}${chordGroup.map((chord) => `[${chord}]`).join("")}${lyrics.slice(index)}`;
  });
  return lyrics;
}

function containsInlineChord(value: string) {
  return /\[[A-G](?:#|b)?[^\]]*]/i.test(value);
}

function isPageNoise(value: string) {
  return /^(?:tono|tom|capo|cejilla|afinaci[oó]n|contin[uú]a despu[eé]s del anuncio|eliminar anuncios)\s*:?/i.test(value)
    || /^https?:\/\//i.test(value);
}

function compactBlankLines(lines: string[]) {
  return lines.filter((line, index) => line !== "" || (index > 0 && lines[index - 1] !== ""));
}

function escapeDirective(value: string) {
  return value.replace(/[{}\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeKey(value?: string) {
  if (!value) return "";
  const chord = normalizeChord(value.trim());
  return chord && /^[A-G](?:#|b)?(?:m|maj|min)?$/i.test(chord) ? chord : "";
}

function chordRoot(chord: string) {
  return chord.match(/^[A-G](?:#|b)?m?/i)?.[0] ?? "";
}

function validTempo(value?: number) {
  return Number.isInteger(value) && Number(value) >= 20 && Number(value) <= 300 ? Number(value) : 72;
}

function validTime(value?: string) {
  return value && /^\d{1,2}\/(?:1|2|4|8|16|32)$/.test(value) ? value : "4/4";
}
