import Dexie, { type EntityTable } from "dexie";
import { demoSetlists, demoSongs } from "@/data/demo";
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
  syncStatus: "synced" | "pending";
};

export type ChangeHistoryRecord = {
  id: string;
  entity: "song" | "setlist";
  entityId: string;
  action: "create" | "update" | "archive" | "delete";
  changedAt: string;
  userId: string;
  title: string;
  snapshot?: unknown;
};

export type PendingOperation = {
  id: string;
  entity: "song" | "setlist";
  entityId: string;
  action: "upsert" | "delete";
  createdAt: string;
};

export type SongInput = Omit<Song, "id" | "updatedAt" | "status">;
export type SetlistInput = Omit<Setlist, "id">;

class WorshipDb extends Dexie {
  songs!: EntityTable<SongRecord, "id">;
  setlists!: EntityTable<SetlistRecord, "id">;
  pendingOperations!: EntityTable<PendingOperation, "id">;
  history!: EntityTable<ChangeHistoryRecord, "id">;

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

    this.version(3)
      .stores({
        songs: "id, title, artist, originalKey, updatedAt, archivedAt, deletedAt, status, *tags",
        setlists: "id, name, date, status, syncStatus, updatedAt, deletedAt",
        pendingOperations: "id, entity, entityId, action, createdAt",
        history: "id, entity, entityId, changedAt, userId",
      })
      .upgrade(async (transaction) => {
        await transaction.table("setlists").toCollection().modify((setlist) => {
          const now = new Date().toISOString();
          setlist.createdAt ??= setlist.updatedAt ?? now;
          setlist.updatedAt ??= now;
          setlist.syncStatus ??= "pending";
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

    const existingSetlists = await worshipDb.setlists.bulkGet(demoSetlists.map((setlist) => setlist.id));
    const missingSetlists = demoSetlists
      .filter((_, index) => !existingSetlists[index])
      .map((setlist) => ({ ...setlist, createdAt: now, updatedAt: now, syncStatus: "synced" as const }));

    await worshipDb.transaction("rw", worshipDb.songs, worshipDb.setlists, async () => {
      if (missing.length) await worshipDb.songs.bulkPut(missing);
      if (missingSetlists.length) await worshipDb.setlists.bulkPut(missingSetlists);
    });
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

export async function listSetlists() {
  if (!worshipDb) return [];
  const setlists = await worshipDb.setlists.orderBy("date").reverse().toArray();
  return setlists.filter((setlist) => !setlist.deletedAt);
}

export async function getSetlistRecord(id: string) {
  if (!worshipDb) return undefined;
  const setlist = await worshipDb.setlists.get(id);
  return setlist?.deletedAt ? undefined : setlist;
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

export async function saveSetlist(input: SetlistInput, id?: string) {
  if (!worshipDb) throw new Error("IndexedDB no está disponible.");
  const now = new Date().toISOString();
  const setlistId = id ?? createSetlistId(input.name);
  const current = await worshipDb.setlists.get(setlistId);
  const record: SetlistRecord = {
    ...input,
    id: setlistId,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    syncStatus: "pending",
  };

  await worshipDb.transaction("rw", worshipDb.setlists, worshipDb.pendingOperations, async () => {
    await worshipDb.setlists.put(record);
    await queueOperation("setlist", setlistId, "upsert");
  });
  return record;
}

export async function deleteSetlist(id: string) {
  if (!worshipDb) return;
  const now = new Date().toISOString();
  await worshipDb.transaction("rw", worshipDb.setlists, worshipDb.pendingOperations, async () => {
    await worshipDb.setlists.update(id, { deletedAt: now, updatedAt: now, syncStatus: "pending" });
    await queueOperation("setlist", id, "delete");
  });
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
  return `${slugify(title, "cancion")}-${crypto.randomUUID().slice(0, 8)}`;
}

function createSetlistId(name: string) {
  return `${slugify(name, "setlist")}-${crypto.randomUUID().slice(0, 8)}`;
}

function slugify(value: string, fallback: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || fallback;
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

export async function getPendingOperations() {
  if (!worshipDb) return [];
  return worshipDb.pendingOperations.orderBy("createdAt").toArray();
}

export async function getEntityForSync(operation: PendingOperation) {
  if (!worshipDb) return undefined;
  return operation.entity === "song"
    ? worshipDb.songs.get(operation.entityId)
    : worshipDb.setlists.get(operation.entityId);
}

export async function completePendingOperation(operation: PendingOperation) {
  if (!worshipDb) return;
  const current = await worshipDb.pendingOperations.get(operation.id);
  if (!current || current.createdAt !== operation.createdAt) return;

  if (operation.entity === "song") {
    await worshipDb.transaction("rw", worshipDb.songs, worshipDb.pendingOperations, async () => {
      await worshipDb.songs.update(operation.entityId, { status: "synced" });
      await worshipDb.pendingOperations.delete(operation.id);
    });
    return;
  }

  await worshipDb.transaction("rw", worshipDb.setlists, worshipDb.pendingOperations, async () => {
    await worshipDb.setlists.update(operation.entityId, { syncStatus: "synced" });
    await worshipDb.pendingOperations.delete(operation.id);
  });
}

export async function applyRemoteSong(record: SongRecord) {
  if (!worshipDb) return;
  const pending = await worshipDb.pendingOperations.get(`song:${record.id}`);
  if (pending) return;
  await worshipDb.songs.put({ ...record, status: "synced" });
}

export async function applyRemoteSetlist(record: SetlistRecord) {
  if (!worshipDb) return;
  const pending = await worshipDb.pendingOperations.get(`setlist:${record.id}`);
  if (pending) return;
  await worshipDb.setlists.put({ ...record, syncStatus: "synced" });
}

export async function applyRemoteLibrary(songs: SongRecord[], setlists: SetlistRecord[]) {
  const db = worshipDb;
  if (!db) throw new Error("IndexedDB no está disponible.");
  await db.transaction("rw", db.songs, db.setlists, db.pendingOperations, async () => {
    const [localSongs, localSetlists, pending] = await Promise.all([
      db.songs.toArray(), db.setlists.toArray(), db.pendingOperations.toArray(),
    ]);
    const protectedKeys = new Set(pending.map((operation) => `${operation.entity}:${operation.entityId}`));
    const protectedSongs = new Set(localSongs.filter((song) => song.status === "pending" || protectedKeys.has(`song:${song.id}`)).map((song) => song.id));
    const protectedSetlists = new Set(localSetlists.filter((setlist) => setlist.syncStatus === "pending" || protectedKeys.has(`setlist:${setlist.id}`)).map((setlist) => setlist.id));
    const remoteSongIds = new Set(songs.map((song) => song.id));
    const remoteSetlistIds = new Set(setlists.map((setlist) => setlist.id));

    await db.songs.bulkPut(songs.filter((song) => !protectedSongs.has(song.id)));
    await db.setlists.bulkPut(setlists.filter((setlist) => !protectedSetlists.has(setlist.id)));
    await db.songs.bulkDelete(localSongs.filter((song) => !remoteSongIds.has(song.id) && !protectedSongs.has(song.id)).map((song) => song.id));
    await db.setlists.bulkDelete(localSetlists.filter((setlist) => !remoteSetlistIds.has(setlist.id) && !protectedSetlists.has(setlist.id)).map((setlist) => setlist.id));
  });
  return getDbSummary();
}

export async function removeRemoteEntity(entity: PendingOperation["entity"], entityId: string) {
  if (!worshipDb) return;
  if (await worshipDb.pendingOperations.get(`${entity}:${entityId}`)) return;
  if (entity === "song") await worshipDb.songs.delete(entityId);
  else await worshipDb.setlists.delete(entityId);
}

export async function applyRemoteHistory(records: ChangeHistoryRecord[]) {
  if (!worshipDb || !records.length) return;
  await worshipDb.history.bulkPut(records);
}

export async function listRecentHistory(limit = 20) {
  if (!worshipDb) return [];
  return worshipDb.history.orderBy("changedAt").reverse().limit(limit).toArray();
}

export async function removePristineDemoData() {
  if (!worshipDb) return;
  const songIds = demoSongs.map((song) => song.id);
  const setlistIds = demoSetlists.map((setlist) => setlist.id);
  const pending = await worshipDb.pendingOperations.toArray();
  const pendingKeys = new Set(pending.map((operation) => `${operation.entity}:${operation.entityId}`));
  await worshipDb.transaction("rw", worshipDb.songs, worshipDb.setlists, async () => {
    await worshipDb.songs.bulkDelete(songIds.filter((id) => !pendingKeys.has(`song:${id}`)));
    await worshipDb.setlists.bulkDelete(setlistIds.filter((id) => !pendingKeys.has(`setlist:${id}`)));
  });
}
