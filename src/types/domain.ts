export type ThemeName = "studio" | "worship" | "stage" | "dark";
export type Notation = "english" | "latin";
export type InstrumentView = "general" | "guitar" | "piano" | "bass" | "drums";

export type SongSection = {
  id: string;
  label: string;
  type: "intro" | "verse" | "prechorus" | "chorus" | "bridge" | "instrumental" | "outro";
};

export type SongNote = {
  id: string;
  sectionId?: string;
  instrument: InstrumentView;
  content: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  tempo: number;
  timeSignature: string;
  duration: string;
  tags: string[];
  chordProSource: string;
  sections: SongSection[];
  notes: SongNote[];
  updatedAt: string;
  status: "synced" | "pending";
};

export type SetlistItem = {
  id: string;
  songId: string;
  transposeSemitones: number;
  capo: number;
  note?: string;
};

export type Setlist = {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  leader: string;
  items: SetlistItem[];
  status: "draft" | "ready";
};

