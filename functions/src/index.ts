import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const accessToken = defineSecret("WHATSAPP_ACCESS_TOKEN");
const appSecret = defineSecret("WHATSAPP_APP_SECRET");
const webhookVerifyToken = defineSecret("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
const region = "us-central1";
const legacyTemplateName = "setlist_actualizacion";

const defaultConfig = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "1418694124654705",
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "1818506675954955",
  apiVersion: process.env.WHATSAPP_API_VERSION ?? "v26.0",
  templateName: process.env.WHATSAPP_TEMPLATE_NAME ?? "setlist_actualizacion_v2",
  templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "es_MX",
  publicBaseUrl: process.env.WORSHIPNOTES_PUBLIC_URL ?? "https://worshipnotes.avivaecatepec.com",
};

type SetlistData = {
  name?: unknown;
  date?: unknown;
  time?: unknown;
  status?: unknown;
  updatedAt?: unknown;
  deletedAt?: unknown;
  items?: unknown;
};

type SetlistItem = { songId?: unknown };

type NotificationConfig = {
  enabled: boolean;
  notifyOnCreate: boolean;
  notifyOnUpdate: boolean;
  onlyReady: boolean;
  templateName: string;
  templateLanguage: string;
  publicBaseUrl: string;
};

type MemberData = {
  displayName?: unknown;
  phoneE164?: unknown;
  whatsappOptIn?: unknown;
  notificationsEnabled?: unknown;
};

type WhatsAppSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: { code?: number; message?: string; error_data?: { details?: string } };
};

type WhatsAppTemplate = {
  id?: string;
  name?: string;
  status?: string;
  category?: string;
  language?: string;
};

type WhatsAppTemplatesResponse = {
  data?: WhatsAppTemplate[];
  error?: { code?: number; message?: string; error_data?: { details?: string } };
};

type WhatsAppStatus = {
  id?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  timestamp?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};

export const notifySetlistMembers = onDocumentWritten({
  document: "setlists/{setlistId}",
  region,
  secrets: [accessToken],
  timeoutSeconds: 120,
  memory: "256MiB",
}, async (event) => {
  const change = event.data;
  if (!change?.after.exists) return;

  const setlist = change.after.data() as SetlistData;
  if (setlist.deletedAt) return;

  const action: "create" | "update" = change.before.exists ? "update" : "create";
  const settings = await readNotificationConfig();
  if (!settings.enabled) return;
  if (action === "create" && !settings.notifyOnCreate) return;
  if (action === "update" && !settings.notifyOnUpdate) return;
  if (settings.onlyReady && setlist.status !== "ready") return;

  const setlistId = event.params.setlistId;
  const revision = stringValue(setlist.updatedAt, event.id);
  const jobId = createHash("sha256").update(`${setlistId}:${revision}`).digest("hex").slice(0, 32);
  const runRef = db.collection("notificationRuns").doc(jobId);
  const existingRun = await runRef.get();
  if (existingRun.exists) {
    logger.info("Setlist notification already processed", { jobId, setlistId });
    return;
  }

  const template = await fetchTemplateStatus(settings.templateName, settings.templateLanguage);
  await persistTemplateStatus(template);
  if (template.status !== "APPROVED") {
    await runRef.create({
      setlistId,
      setlistName: stringValue(setlist.name, "Setlist"),
      action,
      revision,
      recipientCount: 0,
      status: template.status === "NOT_FOUND" ? "template_not_found" : "template_not_approved",
      templateStatus: template.status,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    });
    logger.warn("Setlist notification skipped because template is not approved", { setlistId, templateStatus: template.status });
    return;
  }

  const membersSnapshot = await db.collection("members").get();
  const members = membersSnapshot.docs
    .map((entry) => ({ id: entry.id, data: entry.data() as MemberData }))
    .filter(({ data }) => data.whatsappOptIn === true && data.notificationsEnabled !== false && typeof data.phoneE164 === "string");

  await runRef.create({
    setlistId,
    setlistName: stringValue(setlist.name, "Setlist"),
    action,
    revision,
    recipientCount: members.length,
    status: members.length ? "processing" : "no_recipients",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (!members.length) return;

  const songs = await readSongTitles(setlist.items);
  const bodyParameters = [
    formatSetlistDate(setlist.date, setlist.time),
    songs,
  ];
  const buttonUrlSuffix = encodeURIComponent(setlistId);

  let sentCount = 0;
  let failedCount = 0;
  for (const member of members) {
    const memberName = stringValue(member.data.displayName, "Integrante");
    const phoneE164 = normalizePhone(stringValue(member.data.phoneE164, ""));
    const deliveryId = `${jobId}_${member.id}`;
    const deliveryRef = db.collection("notificationDeliveries").doc(deliveryId);
    const shouldSend = await db.runTransaction(async (transaction) => {
      const delivery = await transaction.get(deliveryRef);
      if (delivery.exists) return false;
      transaction.create(deliveryRef, {
        jobId,
        setlistId,
        setlistName: stringValue(setlist.name, "Setlist"),
        action,
        memberId: member.id,
        memberName,
        phoneE164,
        templateName: settings.templateName,
        templateLanguage: settings.templateLanguage,
        status: "sending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!shouldSend) continue;

    try {
      const messageId = await sendWhatsAppTemplate({
        phoneE164,
        templateName: settings.templateName,
        templateLanguage: settings.templateLanguage,
        bodyParameters,
        buttonUrlSuffix,
      });
      sentCount += 1;
      await deliveryRef.update({
        messageId,
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
      logger.error("WhatsApp template send failed", { deliveryId, setlistId, memberId: member.id, error: message });
      await deliveryRef.update({
        status: "failed",
        failedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        errorCode: error instanceof WhatsAppApiError ? error.code : "send_error",
        errorMessage: message.slice(0, 500),
      });
    }
  }

  await runRef.update({
    sentCount,
    failedCount,
    status: failedCount === members.length ? "failed" : failedCount ? "partial" : "completed",
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
});

export const refreshWhatsAppTemplateStatus = onCall({
  region,
  secrets: [accessToken],
  timeoutSeconds: 30,
  memory: "256MiB",
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión para consultar la plantilla.");
  const settings = await readNotificationConfig();
  try {
    const template = await fetchTemplateStatus(settings.templateName, settings.templateLanguage);
    await persistTemplateStatus(template);
    return { ...template, checkedAt: new Date().toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar Meta.";
    await db.collection("notificationSettings").doc("whatsapp").set({
      templateStatus: "UNKNOWN",
      templateStatusError: message.slice(0, 500),
      templateStatusCheckedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    throw new HttpsError("failed-precondition", message);
  }
});

export const whatsappWebhook = onRequest({
  region,
  secrets: [appSecret, webhookVerifyToken],
  timeoutSeconds: 60,
  memory: "256MiB",
}, async (request, response) => {
  if (request.method === "GET") {
    const mode = request.query["hub.mode"];
    const token = request.query["hub.verify_token"];
    const challenge = request.query["hub.challenge"];
    if (mode === "subscribe" && token === webhookVerifyToken.value() && typeof challenge === "string") {
      response.status(200).send(challenge);
      return;
    }
    response.status(403).send("Verification failed");
    return;
  }

  if (request.method !== "POST") {
    response.status(405).send("Method not allowed");
    return;
  }

  if (!verifyWebhookSignature(request.rawBody, request.header("x-hub-signature-256"), appSecret.value())) {
    response.status(401).send("Invalid signature");
    return;
  }

  const statuses = extractStatuses(request.body);
  await Promise.all(statuses.map((status) => updateDeliveryStatus(status)));
  response.status(200).send("EVENT_RECEIVED");
});

async function readNotificationConfig(): Promise<NotificationConfig> {
  const settingsRef = db.collection("notificationSettings").doc("whatsapp");
  const snapshot = await settingsRef.get();
  const data = snapshot.data() ?? {};
  const storedTemplateName = stringValue(data.templateName, defaultConfig.templateName);
  const templateName = storedTemplateName === legacyTemplateName ? defaultConfig.templateName : storedTemplateName;
  if (storedTemplateName !== templateName) {
    await settingsRef.set({
      templateName,
      updatedAt: FieldValue.serverTimestamp(),
      migratedFromTemplateName: storedTemplateName,
    }, { merge: true });
  }
  return {
    enabled: data.enabled !== false,
    notifyOnCreate: data.notifyOnCreate !== false,
    notifyOnUpdate: data.notifyOnUpdate !== false,
    onlyReady: data.onlyReady !== false,
    templateName,
    templateLanguage: stringValue(data.templateLanguage, defaultConfig.templateLanguage),
    publicBaseUrl: stringValue(data.publicBaseUrl, defaultConfig.publicBaseUrl),
  };
}

async function readSongTitles(items: unknown) {
  if (!Array.isArray(items) || !items.length) return "Sin canciones";
  const ids = items
    .map((item) => typeof (item as SetlistItem)?.songId === "string" ? String((item as SetlistItem).songId) : "")
    .filter(Boolean);
  const snapshots = await db.getAll(...ids.map((id) => db.collection("songs").doc(id)));
  const titleById = new Map(snapshots.map((snapshot) => [snapshot.id, stringValue(snapshot.data()?.title, "Canción")]));
  const result = ids.map((id, index) => `${index + 1}. ${titleById.get(id) ?? "Canción no disponible"}`).join(" • ");
  return result.length > 850 ? `${result.slice(0, 847)}...` : result;
}

function formatSetlistDate(date: unknown, time: unknown) {
  const dateValue = stringValue(date, "");
  const timeValue = stringValue(time, "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return timeValue || "Fecha por confirmar";
  const parsed = new Date(`${dateValue}T12:00:00Z`);
  const formatted = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(parsed);
  return timeValue ? `${formatted} · ${timeValue} h` : formatted;
}

async function sendWhatsAppTemplate(input: {
  phoneE164: string;
  templateName: string;
  templateLanguage: string;
  bodyParameters: string[];
  buttonUrlSuffix: string;
}) {
  const response = await fetch(`https://graph.facebook.com/${defaultConfig.apiVersion}/${defaultConfig.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.value()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.phoneE164.replace(/^\+/, ""),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.templateLanguage },
        components: [
          {
            type: "body",
            parameters: input.bodyParameters.map((text) => ({ type: "text", text: sanitizeTemplateTextParameter(text) })),
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: input.buttonUrlSuffix }],
          },
        ],
      },
    }),
  });
  const body = await response.json() as WhatsAppSendResponse;
  if (!response.ok) {
    throw new WhatsAppApiError(
      String(body.error?.code ?? response.status),
      body.error?.error_data?.details ?? body.error?.message ?? "WhatsApp rechazó el mensaje.",
    );
  }
  const messageId = body.messages?.[0]?.id;
  if (!messageId) throw new WhatsAppApiError("missing_message_id", "WhatsApp no devolvió un identificador de mensaje.");
  return messageId;
}

async function fetchTemplateStatus(templateName: string, templateLanguage: string) {
  const url = new URL(`https://graph.facebook.com/${defaultConfig.apiVersion}/${defaultConfig.businessAccountId}/message_templates`);
  url.searchParams.set("name", templateName);
  url.searchParams.set("fields", "id,name,status,category,language");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken.value()}` } });
  const body = await response.json() as WhatsAppTemplatesResponse;
  if (!response.ok) {
    throw new WhatsAppApiError(
      String(body.error?.code ?? response.status),
      body.error?.error_data?.details ?? body.error?.message ?? "Meta rechazó la consulta de la plantilla.",
    );
  }
  const match = body.data?.find((entry) => entry.name === templateName && entry.language === templateLanguage)
    ?? body.data?.find((entry) => entry.name === templateName);
  return {
    id: match?.id,
    name: match?.name ?? templateName,
    language: match?.language ?? templateLanguage,
    category: match?.category,
    status: match?.status ?? "NOT_FOUND",
  };
}

async function persistTemplateStatus(template: Awaited<ReturnType<typeof fetchTemplateStatus>>) {
  await db.collection("notificationSettings").doc("whatsapp").set({
    templateId: template.id ?? FieldValue.delete(),
    templateStatus: template.status,
    templateCategory: template.category ?? FieldValue.delete(),
    templateStatusError: FieldValue.delete(),
    templateStatusCheckedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

function extractStatuses(body: unknown): WhatsAppStatus[] {
  if (!body || typeof body !== "object") return [];
  const entries = "entry" in body && Array.isArray(body.entry) ? body.entry : [];
  return entries.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("changes" in entry) || !Array.isArray(entry.changes)) return [];
    return entry.changes.flatMap((change: unknown) => {
      if (!change || typeof change !== "object" || !("value" in change) || !change.value || typeof change.value !== "object") return [];
      return "statuses" in change.value && Array.isArray(change.value.statuses) ? change.value.statuses as WhatsAppStatus[] : [];
    });
  });
}

async function updateDeliveryStatus(status: WhatsAppStatus) {
  if (!status.id || !status.status) return;
  const snapshot = await db.collection("notificationDeliveries").where("messageId", "==", status.id).limit(5).get();
  if (snapshot.empty) {
    logger.warn("Received WhatsApp status for unknown message", { messageId: status.id, status: status.status });
    return;
  }

  const statusAt = status.timestamp && Number.isFinite(Number(status.timestamp))
    ? Timestamp.fromMillis(Number(status.timestamp) * 1000)
    : FieldValue.serverTimestamp();
  const error = status.errors?.[0];
  const patch: Record<string, unknown> = {
    status: status.status,
    updatedAt: FieldValue.serverTimestamp(),
    [`${status.status}At`]: statusAt,
  };
  if (status.status === "failed") {
    patch.errorCode = String(error?.code ?? "delivery_failed");
    patch.errorMessage = error?.error_data?.details ?? error?.message ?? error?.title ?? "WhatsApp no pudo entregar el mensaje.";
  }
  await Promise.all(snapshot.docs.map((document) => document.ref.update(patch)));
}

function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string) {
  if (!signatureHeader?.startsWith("sha256=") || !secret) return false;
  const received = Buffer.from(signatureHeader.slice(7), "hex");
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function normalizePhone(value: string) {
  const normalized = `+${value.replace(/\D/g, "")}`;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new Error("El teléfono del integrante no tiene un formato internacional válido.");
  return normalized;
}

function sanitizeTemplateTextParameter(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " • ")
    .replace(/ {5,}/g, " ")
    .trim();
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

class WhatsAppApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "WhatsAppApiError";
  }
}
