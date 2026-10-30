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

export type WhatsAppMember = {
  id: string;
  displayName: string;
  email?: string;
  phoneE164: string;
  whatsappOptIn: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type WhatsAppNotificationSettings = {
  enabled: boolean;
  notifyOnCreate: boolean;
  notifyOnUpdate: boolean;
  onlyReady: boolean;
  templateName: string;
  templateLanguage: string;
  publicBaseUrl: string;
  templateStatus: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" | "IN_APPEAL" | "NOT_FOUND" | "UNKNOWN";
  templateId?: string;
  templateCategory?: string;
  templateStatusCheckedAt?: string;
  templateStatusError?: string;
};

export type WhatsAppDeliveryStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed";

export type WhatsAppDelivery = {
  id: string;
  jobId: string;
  setlistId: string;
  setlistName: string;
  action: "create" | "update";
  memberId: string;
  memberName: string;
  phoneE164: string;
  templateName: string;
  templateLanguage: string;
  status: WhatsAppDeliveryStatus;
  messageId?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  errorCode?: string;
  errorMessage?: string;
};
