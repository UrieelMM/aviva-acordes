import Dexie, { type EntityTable } from "dexie";

export type SongRecord = {
  id: string;
  title: string;
  tone: string;
  chordPro: string;
  updatedAt: string;
};

export type SetlistRecord = {
  id: string;
  title: string;
  serviceDate: string;
  songIds: string[];
};

class WorshipDb extends Dexie {
  songs!: EntityTable<SongRecord, "id">;
  setlists!: EntityTable<SetlistRecord, "id">;

  constructor() {
    super("alabanza-app");

    this.version(1).stores({
      songs: "id, title, tone, updatedAt",
      setlists: "id, title, serviceDate",
    });
  }
}

export const worshipDb = typeof window === "undefined" ? null : new WorshipDb();

export async function seedDemoSong() {
  if (!worshipDb) {
    return;
  }

  await worshipDb.songs.put({
    id: "hosanna-demo",
    title: "Hosanna",
    tone: "G",
    chordPro: "[G]Abre mis [D]ojos, quie[Em]ro verte\n[C]Quiero verte [D]hoy",
    updatedAt: new Date().toISOString(),
  });
}

export async function getDbSummary() {
  if (!worshipDb) {
    return {
      songs: 0,
      setlists: 0,
    };
  }

  const [songs, setlists] = await Promise.all([worshipDb.songs.count(), worshipDb.setlists.count()]);

  return {
    songs,
    setlists,
  };
}
