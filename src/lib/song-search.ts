import { chordProToPlainLyrics } from "@/lib/chordpro";
import type { SongRecord } from "@/lib/indexed-db";

export type SongSearchHit = { song: SongRecord; context: string; score: number };

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/\s+/g, " ").trim();
}

export function searchSongs(songs: SongRecord[], query: string): SongSearchHit[] {
  const term = normalizeSearch(query);
  if (!term) return songs.map((song) => ({ song, context: "", score: 0 }));
  const tokens = term.split(" ");
  return songs.flatMap((song) => {
    const title = normalizeSearch(song.title);
    const artist = normalizeSearch(song.artist);
    const tags = normalizeSearch(song.tags.join(" "));
    const sections = song.sections.map((section) => section.label);
    const lyrics = chordProToPlainLyrics(song.chordProSource);
    const normalizedLyrics = normalizeSearch(lyrics);
    const haystack = [title, artist, tags, normalizeSearch(sections.join(" ")), normalizedLyrics].join(" ");
    if (!tokens.every((token) => haystack.includes(token))) return [];

    let score = 1;
    let context = "";
    if (title.includes(term)) score = 100;
    else if (artist.includes(term)) score = 80;
    else {
      const matchingSection = sections.find((section) => normalizeSearch(section).includes(term));
      if (matchingSection) { score = 60; context = `Sección: ${matchingSection}`; }
      else if (tags.includes(term)) score = 50;
      else if (normalizedLyrics.includes(term)) score = 40;
    }
    if (!context && score <= 40) {
      const line = lyrics.split("\n").find((entry) => tokens.every((token) => normalizeSearch(entry).includes(token)))
        ?? lyrics.split("\n").find((entry) => tokens.some((token) => normalizeSearch(entry).includes(token)));
      if (line) context = `Letra: ${line.trim().slice(0, 110)}`;
    }
    return [{ song, context, score }];
  }).sort((a, b) => b.score - a.score || b.song.updatedAt.localeCompare(a.song.updatedAt));
}
