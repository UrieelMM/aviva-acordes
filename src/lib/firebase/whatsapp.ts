import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getFirebaseServices } from "@/lib/firebase/client";
import type { WhatsAppDelivery, WhatsAppMember, WhatsAppNotificationSettings } from "@/types/domain";

export const defaultWhatsAppSettings: WhatsAppNotificationSettings = {
  enabled: true,
  notifyOnCreate: true,
  notifyOnUpdate: true,
  onlyReady: true,
  templateName: "setlist_actualizacion",
  templateLanguage: "es_MX",
  publicBaseUrl: "https://worshipnotes.avivaecatepec.com",
  templateStatus: "UNKNOWN",
};

export type WhatsAppMemberInput = Pick<WhatsAppMember, "displayName" | "phoneE164" | "whatsappOptIn" | "notificationsEnabled"> & {
  email?: string;
};

export async function saveWhatsAppMember(input: WhatsAppMemberInput, id?: string) {
  const { db, user } = await getFirebaseServices();
  const memberRef = id ? doc(db, "members", id) : doc(collection(db, "members"));
  const now = serverTimestamp();
  const payload = {
    displayName: input.displayName.trim(),
    email: input.email?.trim().toLowerCase() || null,
    phoneE164: normalizeWhatsAppPhone(input.phoneE164),
    whatsappOptIn: input.whatsappOptIn,
    notificationsEnabled: input.notificationsEnabled,
    updatedAt: now,
    updatedBy: user.uid,
    ...(id ? {} : { createdAt: now, createdBy: user.uid }),
  };
  await setDoc(memberRef, payload, { merge: true });
  return memberRef.id;
}

export async function removeWhatsAppMember(id: string) {
  const { db } = await getFirebaseServices();
  await deleteDoc(doc(db, "members", id));
}

export async function saveWhatsAppSettings(settings: WhatsAppNotificationSettings) {
  const { db, user } = await getFirebaseServices();
  await setDoc(doc(db, "notificationSettings", "whatsapp"), {
    enabled: settings.enabled,
    notifyOnCreate: settings.notifyOnCreate,
    notifyOnUpdate: settings.notifyOnUpdate,
    onlyReady: settings.onlyReady,
    templateName: settings.templateName,
    templateLanguage: settings.templateLanguage,
    publicBaseUrl: settings.publicBaseUrl.replace(/\/$/, ""),
    updatedAt: serverTimestamp(),
    updatedBy: user.uid,
  }, { merge: true });
}

export async function refreshWhatsAppTemplateStatus() {
  const { functions } = await getFirebaseServices();
  const callable = httpsCallable<void, {
    status: WhatsAppNotificationSettings["templateStatus"];
    id?: string;
    name: string;
    language: string;
    category?: string;
    checkedAt: string;
  }>(functions, "refreshWhatsAppTemplateStatus");
  return (await callable()).data;
}

export async function subscribeWhatsAppMembers(
  onValue: (members: WhatsAppMember[]) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { db } = await getFirebaseServices();
  return onSnapshot(collection(db, "members"), (snapshot) => {
    const members = snapshot.docs
      .map((entry) => normalizeMember(entry.id, entry.data()))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
    onValue(members);
  }, (error) => onError(error));
}

export async function subscribeWhatsAppSettings(
  onValue: (settings: WhatsAppNotificationSettings) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { db } = await getFirebaseServices();
  return onSnapshot(doc(db, "notificationSettings", "whatsapp"), (snapshot) => {
    onValue(snapshot.exists() ? normalizeSettings(snapshot.data()) : defaultWhatsAppSettings);
  }, (error) => onError(error));
}

export async function subscribeWhatsAppDeliveries(
  onValue: (deliveries: WhatsAppDelivery[]) => void,
  onError: (error: Error) => void,
): Promise<Unsubscribe> {
  const { db } = await getFirebaseServices();
  const deliveryQuery = query(collection(db, "notificationDeliveries"), orderBy("updatedAt", "desc"), limit(100));
  return onSnapshot(deliveryQuery, (snapshot) => {
    onValue(snapshot.docs.map((entry) => normalizeDelivery(entry.id, entry.data())));
  }, (error) => onError(error));
}

export function normalizeWhatsAppPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  const normalized = trimmed.startsWith("+")
    ? `+${digits}`
    : digits.length === 10
      ? `+52${digits}`
      : `+${digits}`;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Escribe el teléfono con código de país, por ejemplo +52 55 1234 5678.");
  }
  return normalized;
}

function normalizeMember(id: string, data: DocumentData): WhatsAppMember {
  return {
    id,
    displayName: stringValue(data.displayName, "Integrante sin nombre"),
    email: optionalString(data.email),
    phoneE164: stringValue(data.phoneE164, ""),
    whatsappOptIn: Boolean(data.whatsappOptIn),
    notificationsEnabled: data.notificationsEnabled !== false,
    createdAt: timestampValue(data.createdAt),
    updatedAt: timestampValue(data.updatedAt),
    createdBy: stringValue(data.createdBy, ""),
    updatedBy: stringValue(data.updatedBy, ""),
  };
}

function normalizeSettings(data: DocumentData): WhatsAppNotificationSettings {
  return {
    enabled: data.enabled !== false,
    notifyOnCreate: data.notifyOnCreate !== false,
    notifyOnUpdate: data.notifyOnUpdate !== false,
    onlyReady: data.onlyReady !== false,
    templateName: stringValue(data.templateName, defaultWhatsAppSettings.templateName),
    templateLanguage: stringValue(data.templateLanguage, defaultWhatsAppSettings.templateLanguage),
    publicBaseUrl: stringValue(data.publicBaseUrl, defaultWhatsAppSettings.publicBaseUrl),
    templateStatus: normalizeTemplateStatus(data.templateStatus),
    templateId: optionalString(data.templateId),
    templateCategory: optionalString(data.templateCategory),
    templateStatusCheckedAt: optionalTimestampValue(data.templateStatusCheckedAt),
    templateStatusError: optionalString(data.templateStatusError),
  };
}

function normalizeDelivery(id: string, data: DocumentData): WhatsAppDelivery {
  const validStatuses = new Set(["queued", "sending", "sent", "delivered", "read", "failed"]);
  const status = validStatuses.has(data.status) ? data.status as WhatsAppDelivery["status"] : "queued";
  return {
    id,
    jobId: stringValue(data.jobId, ""),
    setlistId: stringValue(data.setlistId, ""),
    setlistName: stringValue(data.setlistName, "Setlist"),
    action: data.action === "create" ? "create" : "update",
    memberId: stringValue(data.memberId, ""),
    memberName: stringValue(data.memberName, "Integrante"),
    phoneE164: stringValue(data.phoneE164, ""),
    templateName: stringValue(data.templateName, ""),
    templateLanguage: stringValue(data.templateLanguage, ""),
    status,
    messageId: optionalString(data.messageId),
    createdAt: timestampValue(data.createdAt),
    updatedAt: timestampValue(data.updatedAt),
    sentAt: optionalTimestampValue(data.sentAt),
    deliveredAt: optionalTimestampValue(data.deliveredAt),
    readAt: optionalTimestampValue(data.readAt),
    failedAt: optionalTimestampValue(data.failedAt),
    errorCode: optionalString(data.errorCode),
    errorMessage: optionalString(data.errorMessage),
  };
}

function timestampValue(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return typeof value === "string" ? value : new Date(0).toISOString();
}

function optionalTimestampValue(value: unknown) {
  if (!value) return undefined;
  return timestampValue(value);
}

function stringValue(value: unknown, fallback: string) { return typeof value === "string" ? value : fallback; }
function optionalString(value: unknown) { return typeof value === "string" && value ? value : undefined; }
function normalizeTemplateStatus(value: unknown): WhatsAppNotificationSettings["templateStatus"] {
  const statuses = new Set(["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED", "IN_APPEAL", "NOT_FOUND"]);
  return typeof value === "string" && statuses.has(value) ? value as WhatsAppNotificationSettings["templateStatus"] : "UNKNOWN";
}
