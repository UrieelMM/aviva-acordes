import Dexie, { type EntityTable } from "dexie";
import { demoSongs } from "@/data/demo";
import type { Setlist, Song } from "@/types/domain";

export type SongRecord = Song & {
  createdAt: string;
  archivedAt?: string;
  deletedAt?: string;
};

export type SetlistRecord = Setlist & {
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type PendingOperation = {
  id: string;
  entity: "song" | "setlist";
  entityId: string;
  action: "upsert" | "delete";
  createdAt: string;
};

export type SongInput = Omit<Song, "id" | "updatedAt" | "status">;

class WorshipDb extends Dexie {
  songs!: EntityTable<SongRecord, "id">;
  setlists!: EntityTable<SetlistRecord, "id">;
  pendingOperations!: EntityTable<PendingOperation, "id">;

  constructor() {
    super("alabanza-app");

    this.version(1).stores({
      songs: "id, title, tone, updatedAt",
      setlists: "id, title, serviceDate",
    });

    this.version(2)
      .stores({
        songs: "id, title, artist, originalKey, updatedAt, archivedAt, deletedAt, status, *tags",
        setlists: "id, name, date, status, updatedAt, deletedAt",
        pendingOperations: "id, entity, entityId, action, createdAt",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("songs")
          .toCollection()
          .modify((song) => {
            const now = new Date().toISOString();
            song.artist ??= "Sin artista";
            song.originalKey ??= song.tone ?? "C";
            song.tempo ??= 72;
            song.timeSignature ??= "4/4";
            song.duration ??= "0:00";
            song.tags ??= [];
            song.chordProSource ??= song.chordPro ?? `{title: ${song.title ?? "Sin título"}}`;
            song.sections ??= [];
            song.notes ??= [];
            song.createdAt ??= song.updatedAt ?? now;
            song.updatedAt ??= now;
            song.status ??= "pending";
            delete song.tone;
            delete song.chordPro;
          });
      });
  }
}
export const worshipDb = typeof window === "undefined" ? null : new WorshipDb();

let demoSeedPromise: Promise<void> | null = null;

export function ensureDemoSongs() {
  if (!worshipDb) return Promise.resolve();
  if (demoSeedPromise) return demoSeedPromise;

  demoSeedPromise = (async () => {
    const existing = await worshipDb.songs.bulkGet(demoSongs.map((song) => song.id));
    const now = new Date().toISOString();
    const missing = demoSongs
      .filter((_, index) => !existing[index])
      .map((song) => ({ ...song, createdAt: song.updatedAt ?? now }));

    if (missing.length) await worshipDb.songs.bulkPut(missing);
  })();

  return demoSeedPromise;
}

export async function listSongs(options?: { includeArchived?: boolean }) {
  if (!worshipDb) return [];
  const songs = await worshipDb.songs.orderBy("updatedAt").reverse().toArray();
  return songs.filter((song) => !song.deletedAt && (options?.includeArchived || !song.archivedAt));
}

export async function getSongRecord(id: string) {
  if (!worshipDb) return undefined;
  const song = await worshipDb.songs.get(id);
  return song?.deletedAt ? undefined : song;
}

export async function saveSong(input: SongInput, id?: string) {
  if (!worshipDb) throw new Error("IndexedDB no está disponible.");
  const now = new Date().toISOString();
  const songId = id ?? createSongId(input.title);
  const current = await worshipDb.songs.get(songId);
  const record: SongRecord = {
    ...input,
    id: songId,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    status: "pending",
    archivedAt: current?.archivedAt,
  };

  await worshipDb.transaction("rw", worshipDb.songs, worshipDb.pendingOperations, async () => {
    await worshipDb.songs.put(record);
    await queueOperation("song", songId, "upsert");
  });

  return record;
}

export async function duplicateSong(id: string) {
  const source = await getSongRecord(id);
  if (!source) throw new Error("No se encontró la canción.");
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, status: _status, archivedAt: _archivedAt, deletedAt: _deletedAt, ...input } = source;
  void _id;
  void _createdAt;
  void _updatedAt;
  void _status;
  void _archivedAt;
  void _deletedAt;
  return saveSong({ ...input, title: `${source.title} (copia)`, chordProSource: replaceDirective(source.chordProSource, "title", `${source.title} (copia)`) });
}

export async function archiveSong(id: string, archived = true) {
  if (!worshipDb) return;
  const now = new Date().toISOString();
  await worshipDb.transaction("rw", worshipDb.songs, worshipDb.pendingOperations, async () => {
    await worshipDb.songs.update(id, { archivedAt: archived ? now : undefined, updatedAt: now, status: "pending" });
    await queueOperation("song", id, "upsert");
  });
}

export async function deleteSong(id: string) {
  if (!worshipDb) return;
  const now = new Date().toISOString();
  await worshipDb.transaction("rw", worshipDb.songs, worshipDb.pendingOperations, async () => {
    await worshipDb.songs.update(id, { deletedAt: now, updatedAt: now, status: "pending" });
    await queueOperation("song", id, "delete");
  });
}

async function queueOperation(entity: PendingOperation["entity"], entityId: string, action: PendingOperation["action"]) {
  if (!worshipDb) return;
  await worshipDb.pendingOperations.put({
    id: `${entity}:${entityId}`,
    entity,
    entityId,
    action,
    createdAt: new Date().toISOString(),
  });
}

function createSongId(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "cancion";
  return `${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

function replaceDirective(source: string, directive: string, value: string) {
  const pattern = new RegExp(`\\{${directive}:[^}]*\\}`, "i");
  const replacement = `{${directive}: ${value}}`;
  return pattern.test(source) ? source.replace(pattern, replacement) : `${replacement}\n${source}`;
}

export async function getDbSummary() {
  if (!worshipDb) return { songs: 0, setlists: 0, pending: 0 };
  const [songs, setlists, pending] = await Promise.all([
    worshipDb.songs.filter((song) => !song.deletedAt).count(),
    worshipDb.setlists.filter((setlist) => !setlist.deletedAt).count(),
    worshipDb.pendingOperations.count(),
  ]);
  return { songs, setlists, pending };
}
