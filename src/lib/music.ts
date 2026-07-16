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
  return transposeRoot(key, semitones, preferFlats);
}

