import {
  collection,
  doc,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import {
  applyRemoteHistory,
  applyRemoteLibrary,
  applyRemoteSetlist,
  applyRemoteSong,
  completePendingOperation,
  getDbSummary,
  getEntityForSync,
  getPendingOperations,
  removePristineDemoData,
  removeRemoteEntity,
  type ChangeHistoryRecord,
  type PendingOperation,
  type SetlistRecord,
  type SongRecord,
} from "@/lib/indexed-db";
import { getFirebaseServices, isFirebaseConfigured } from "@/lib/firebase/client";

export type CloudSyncState = {
  phase: "disabled" | "signed-out" | "connecting" | "syncing" | "synced" | "offline" | "error";
  pending: number;
  refreshing: boolean;
  userId?: string;
  lastSyncedAt?: string;
  error?: string;
};

let state: CloudSyncState = {
  phase: isFirebaseConfigured ? "connecting" : "disabled",
  pending: 0,
  refreshing: false,
};
const subscribers = new Set<() => void>();
let stopEngine: (() => void) | null = null;
let startingPromise: Promise<void> | null = null;
let refreshPromise: Promise<{ songs: number; setlists: number; pending: number }> | null = null;
let engineGeneration = 0;

export function getCloudSyncSnapshot() {
  return state;
}

export function subscribeCloudSync(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function updateState(patch: Partial<CloudSyncState>) {
  state = { ...state, ...patch };
  subscribers.forEach((callback) => callback());
}

export function startFirebaseSync() {
  if (!isFirebaseConfigured || stopEngine) return Promise.resolve();
  if (startingPromise) return startingPromise;
  const generation = ++engineGeneration;
  const currentPromise = initializeFirebaseSync(generation);
  startingPromise = currentPromise.finally(() => {
    if (startingPromise === currentPromise || engineGeneration === generation) startingPromise = null;
  });
  return startingPromise;
}

export function stopFirebaseSync() {
  engineGeneration += 1;
  startingPromise = null;
  stopEngine?.();
  stopEngine = null;
  updateState({
    phase: isFirebaseConfigured ? "signed-out" : "disabled",
    userId: undefined,
    lastSyncedAt: undefined,
    refreshing: false,
    error: undefined,
  });
}

export function refreshFirebaseSync() {
  if (refreshPromise) return refreshPromise;
  const currentPromise = pullLatestLibrary().finally(() => {
    if (refreshPromise === currentPromise) refreshPromise = null;
  });
  refreshPromise = currentPromise;
  return currentPromise;
}

async function pullLatestLibrary() {
  if (!isFirebaseConfigured) throw new Error("Firebase no está configurado.");
  if (!navigator.onLine) {
    updateState({ phase: "offline" });
    throw new Error("Conéctate a internet para actualizar la biblioteca.");
  }
  await startFirebaseSync();
  const generation = engineGeneration;
  const { db, user } = await getFirebaseServices();
  updateState({ phase: "syncing", refreshing: true, error: undefined });
  try {
    const [remoteSongs, remoteSetlists] = await Promise.all([
      getDocsFromServer(collection(db, "songs")),
      getDocsFromServer(collection(db, "setlists")),
    ]);
    if (generation !== engineGeneration || !user || state.userId !== user.uid) throw new Error("La sesión cambió durante la sincronización.");
    const summary = await applyRemoteLibrary(
      remoteSongs.docs.map((entry) => normalizeSong(entry.id, entry.data())),
      remoteSetlists.docs.map((entry) => normalizeSetlist(entry.id, entry.data())),
    );
    updateState({ phase: summary.pending ? "syncing" : "synced", pending: summary.pending, refreshing: false, lastSyncedAt: new Date().toISOString(), error: undefined });
    return summary;
  } catch (error) {
    if (generation === engineGeneration) updateState({ phase: navigator.onLine ? "error" : "offline", refreshing: false, error: getErrorMessage(error) });
    throw error;
  }
}

async function initializeFirebaseSync(generation: number) {
  updateState({ phase: navigator.onLine ? "connecting" : "offline", error: undefined });

  try {
    const { db, user } = await getFirebaseServices();
    await removePristineDemoData();
    if (generation !== engineGeneration) return;
    updateState({ userId: user.uid });

    let flushing = false;
    let initialSnapshots = 0;
    const unsubscribes: Unsubscribe[] = [];

    const snapshotReady = () => {
      if (generation !== engineGeneration) return;
      initialSnapshots += 1;
      if (initialSnapshots >= 3 && state.phase !== "error" && state.phase !== "offline") {
        updateState({ phase: state.pending ? "syncing" : "synced", lastSyncedAt: new Date().toISOString() });
      }
    };

    const fail = (error: unknown) => {
      if (generation !== engineGeneration) return;
      updateState({ phase: "error", error: getErrorMessage(error) });
    };

    const flush = async () => {
      if (generation !== engineGeneration) return;
      if (flushing) return;
      if (!navigator.onLine) {
        const summary = await getDbSummary();
        updateState({ phase: "offline", pending: summary.pending });
        return;
      }

      flushing = true;
      try {
        const operations = await getPendingOperations();
        updateState({ phase: operations.length ? "syncing" : state.phase, pending: operations.length, error: undefined });
        for (const operation of operations) {
          if (generation !== engineGeneration) return;
          const record = await getEntityForSync(operation);
          if (!record) {
            await completePendingOperation(operation);
            continue;
          }

          const collectionName = operation.entity === "song" ? "songs" : "setlists";
          const payload = toRemotePayload(record, user.uid);
          await setDoc(doc(db, collectionName, operation.entityId), payload);
          await writeHistory(db, operation, record, user.uid);
          await completePendingOperation(operation);
        }
        const summary = await getDbSummary();
        updateState({ phase: "synced", pending: summary.pending, lastSyncedAt: new Date().toISOString(), error: undefined });
      } catch (error) {
        fail(error);
      } finally {
        flushing = false;
      }
    };

    unsubscribes.push(
      onSnapshot(
        collection(db, "songs"),
        (snapshot) => {
          void Promise.all(snapshot.docChanges().map((change) => change.type === "removed"
            ? removeRemoteEntity("song", change.doc.id)
            : applyRemoteSong(normalizeSong(change.doc.id, change.doc.data())))).then(snapshotReady).catch(fail);
        },
        fail,
      ),
      onSnapshot(
        collection(db, "setlists"),
        (snapshot) => {
          void Promise.all(snapshot.docChanges().map((change) => change.type === "removed"
            ? removeRemoteEntity("setlist", change.doc.id)
            : applyRemoteSetlist(normalizeSetlist(change.doc.id, change.doc.data())))).then(snapshotReady).catch(fail);
        },
        fail,
      ),
      onSnapshot(
        query(collection(db, "history"), orderBy("changedAt", "desc"), limit(100)),
        (snapshot) => {
          const records = snapshot.docs.map((entry) => normalizeHistory(entry.id, entry.data()));
          void applyRemoteHistory(records).then(snapshotReady).catch(fail);
        },
        fail,
      ),
    );

    const online = () => { void flush(); };
    const offline = () => { void getDbSummary().then((summary) => updateState({ phase: "offline", pending: summary.pending })); };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    const timer = window.setInterval(() => { void flush(); }, 4_000);
    void flush();

    stopEngine = () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.clearInterval(timer);
      stopEngine = null;
    };
  } catch (error) {
    if (generation !== engineGeneration) return;
    updateState({ phase: "error", error: getErrorMessage(error) });
  }
}

function toRemotePayload(record: SongRecord | SetlistRecord, userId: string) {
  const localOnlyKeys = new Set(["status", "syncStatus"]);
  const cleaned = removeUndefined(record, localOnlyKeys) as Record<string, unknown>;
  return {
    ...cleaned,
    updatedBy: userId,
    schemaVersion: 1,
    serverUpdatedAt: serverTimestamp(),
  };
}

async function writeHistory(
  db: Awaited<ReturnType<typeof getFirebaseServices>>["db"],
  operation: PendingOperation,
  record: SongRecord | SetlistRecord,
  userId: string,
) {
  const isSong = operation.entity === "song";
  const action: ChangeHistoryRecord["action"] = operation.action === "delete"
    ? "delete"
    : isSong && "archivedAt" in record && record.archivedAt
      ? "archive"
      : record.createdAt === record.updatedAt
        ? "create"
        : "update";
  const changedAt = record.updatedAt;
  const historyId = `${operation.entity}_${operation.entityId}_${changedAt.replace(/[^0-9]/g, "")}_${userId}`;
  await setDoc(doc(db, "history", historyId), {
    entity: operation.entity,
    entityId: operation.entityId,
    action,
    changedAt,
    serverChangedAt: serverTimestamp(),
    userId,
    title: "title" in record ? record.title : record.name,
    snapshot: removeUndefined(record, new Set(["status", "syncStatus"])),
    schemaVersion: 1,
  });
}

function normalizeSong(id: string, data: DocumentData): SongRecord {
  return {
    id,
    title: stringValue(data.title, "Sin título"),
    artist: stringValue(data.artist, "Sin artista"),
    originalKey: stringValue(data.originalKey, "C"),
    tempo: numberValue(data.tempo, 72),
    timeSignature: stringValue(data.timeSignature, "4/4"),
    duration: stringValue(data.duration, "0:00"),
    tags: stringArray(data.tags),
    chordProSource: stringValue(data.chordProSource, `{title: ${stringValue(data.title, "Sin título")}}`),
    sections: Array.isArray(data.sections) ? data.sections : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    createdAt: stringValue(data.createdAt, stringValue(data.updatedAt, new Date().toISOString())),
    updatedAt: stringValue(data.updatedAt, new Date().toISOString()),
    archivedAt: optionalString(data.archivedAt),
    deletedAt: optionalString(data.deletedAt),
    status: "synced",
  };
}

function normalizeSetlist(id: string, data: DocumentData): SetlistRecord {
  return {
    id,
    name: stringValue(data.name, "Setlist sin nombre"),
    date: stringValue(data.date, ""),
    time: stringValue(data.time, ""),
    venue: stringValue(data.venue, ""),
    leader: stringValue(data.leader, ""),
    items: Array.isArray(data.items) ? data.items : [],
    status: data.status === "ready" ? "ready" : "draft",
    createdAt: stringValue(data.createdAt, stringValue(data.updatedAt, new Date().toISOString())),
    updatedAt: stringValue(data.updatedAt, new Date().toISOString()),
    deletedAt: optionalString(data.deletedAt),
    syncStatus: "synced",
  };
}

function normalizeHistory(id: string, data: DocumentData): ChangeHistoryRecord {
  return {
    id,
    entity: data.entity === "setlist" ? "setlist" : "song",
    entityId: stringValue(data.entityId, ""),
    action: data.action === "create" || data.action === "archive" || data.action === "delete" ? data.action : "update",
    changedAt: stringValue(data.changedAt, new Date().toISOString()),
    userId: stringValue(data.userId, "desconocido"),
    title: stringValue(data.title, "Sin título"),
    snapshot: data.snapshot,
  };
}

function removeUndefined(value: unknown, excludedKeys = new Set<string>()): unknown {
  if (Array.isArray(value)) return value.map((entry) => removeUndefined(entry, excludedKeys));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key, entry]) => !excludedKeys.has(key) && entry !== undefined)
    .map(([key, entry]) => [key, removeUndefined(entry, excludedKeys)]));
}

function stringValue(value: unknown, fallback: string) { return typeof value === "string" ? value : fallback; }
function optionalString(value: unknown) { return typeof value === "string" ? value : undefined; }
function numberValue(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []; }
function getErrorMessage(error: unknown) { return error instanceof Error ? error.message : "No se pudo sincronizar con Firebase."; }
