import type { Notation } from "@/types/domain";

const sharpNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const flatNotes = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const noteIndex: Record<string, number> = {
  C: 0, "B#": 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4,
  "E#": 5, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10,
  Bb: 10, B: 11, Cb: 11,
};
const latinNotes: Record<string, string> = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };

function transposeRoot(root: string, semitones: number, flats: boolean) {
  const index = noteIndex[root];
  if (index === undefined) return root;
  const notes = flats ? flatNotes : sharpNotes;
  return notes[(index + semitones + 120) % 12];
}

function formatRoot(root: string, notation: Notation) {
  if (notation === "english") return root;
  return `${latinNotes[root[0]] ?? root[0]}${root.slice(1)}`;
}

export function transformChord(chord: string, semitones: number, notation: Notation, preferFlats = false) {
  return chord
    .split("/")
    .map((part) => {
      const match = part.match(/^([A-G](?:#|b)?)(.*)$/);
      if (!match) return part;
      return `${formatRoot(transposeRoot(match[1], semitones, preferFlats), notation)}${match[2]}`;
    })
    .join("/");
}

export function transformChordPro(source: string, semitones: number, notation: Notation, preferFlats = false) {
  return source.replace(/\[([^\]]+)\]/g, (_, chord: string) =>
    `[${transformChord(chord, semitones, notation, preferFlats)}]`,
  );
}

export function transposeKey(key: string, semitones: number, preferFlats = false) {
  const match = key.trim().match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) return key;
  return `${transposeRoot(match[1], semitones, preferFlats)}${match[2]}`;
}

/** Human-readable movement for every place where a song can be transposed. */
export function formatTransposeInterval(semitones: number) {
  if (semitones === 0) return "Tono original · 0 semitonos";

  const amount = Math.abs(semitones);
  const direction = semitones > 0 ? "Subiste" : "Bajaste";
  const semitoneLabel = `${amount} semitono${amount === 1 ? "" : "s"}`;
  const wholeTones = Math.floor(amount / 2);
  const remainingSemitone = amount % 2;
  const parts: string[] = [];

  if (wholeTones) parts.push(`${wholeTones} tono${wholeTones === 1 ? "" : "s"}`);
  if (remainingSemitone && wholeTones) parts.push("1 semitono");

  return `${direction} ${semitoneLabel}${parts.length ? ` (${parts.join(" + ")})` : ""}`;
}

export function formatSignedSemitones(semitones: number) {
  return semitones > 0 ? `+${semitones}` : String(semitones);
}
