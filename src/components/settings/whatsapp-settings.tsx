"use client";

import {
  AlertCircle,
  CheckCheck,
  Clock3,
  Eye,
  LoaderCircle,
  MessageCircleMore,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/components/providers/firebase-auth-provider";
import { Badge, Button, Card, ConfirmModal, Modal, cx } from "@/components/ui/primitives";
import { dayjs } from "@/lib/dayjs";
import {
  defaultWhatsAppSettings,
  normalizeWhatsAppPhone,
  removeWhatsAppMember,
  refreshWhatsAppTemplateStatus,
  saveWhatsAppMember,
  saveWhatsAppSettings,
  subscribeWhatsAppDeliveries,
  subscribeWhatsAppMembers,
  subscribeWhatsAppSettings,
} from "@/lib/firebase/whatsapp";
import type { WhatsAppDelivery, WhatsAppMember, WhatsAppNotificationSettings } from "@/types/domain";

type MemberForm = {
  displayName: string;
  email: string;
  phoneE164: string;
  whatsappOptIn: boolean;
  notificationsEnabled: boolean;
};

const emptyMember: MemberForm = {
  displayName: "",
  email: "",
  phoneE164: "+52 ",
  whatsappOptIn: false,
  notificationsEnabled: true,
};

export function WhatsAppSettings() {
  const auth = useFirebaseAuth();
  const [members, setMembers] = useState<WhatsAppMember[]>([]);
  const [deliveries, setDeliveries] = useState<WhatsAppDelivery[]>([]);
  const [settings, setSettings] = useState<WhatsAppNotificationSettings>(defaultWhatsAppSettings);
  const [loading, setLoading] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [editingMember, setEditingMember] = useState<WhatsAppMember | null | undefined>(undefined);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMember);
  const [memberBusy, setMemberBusy] = useState(false);
  const [deletingMember, setDeletingMember] = useState<WhatsAppMember | null>(null);

  useEffect(() => {
    if (!auth.user) return;

    let active = true;
    const unsubscribes: Array<() => void> = [];
    const fail = (error: Error) => {
      if (!active) return;
      setLoading(false);
      toast.error("No se pudo cargar WhatsApp", { description: error.message });
    };

    void Promise.all([
      subscribeWhatsAppMembers((value) => { if (active) setMembers(value); }, fail),
      subscribeWhatsAppSettings((value) => { if (active) setSettings(value); }, fail),
      subscribeWhatsAppDeliveries((value) => { if (active) setDeliveries(value); }, fail),
    ]).then((subscriptions) => {
      if (!active) subscriptions.forEach((unsubscribe) => unsubscribe());
      else {
        unsubscribes.push(...subscriptions);
        setLoading(false);
      }
    }).catch(fail);

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [auth.user]);

  const activeRecipients = useMemo(
    () => members.filter((member) => member.whatsappOptIn && member.notificationsEnabled).length,
    [members],
  );

  const openNewMember = () => {
    setEditingMember(null);
    setMemberForm(emptyMember);
  };

  const openMember = (member: WhatsAppMember) => {
    setEditingMember(member);
    setMemberForm({
      displayName: member.displayName,
      email: member.email ?? "",
      phoneE164: member.phoneE164,
      whatsappOptIn: member.whatsappOptIn,
      notificationsEnabled: member.notificationsEnabled,
    });
  };

  const handleMemberSave = async () => {
    if (!memberForm.displayName.trim()) {
      toast.error("Escribe el nombre del integrante");
      return;
    }
    try {
      normalizeWhatsAppPhone(memberForm.phoneE164);
    } catch (error) {
      toast.error("Teléfono inválido", { description: error instanceof Error ? error.message : undefined });
      return;
    }

    setMemberBusy(true);
    try {
      await saveWhatsAppMember(memberForm, editingMember?.id);
      toast.success(editingMember ? "Integrante actualizado" : "Integrante registrado");
      setEditingMember(undefined);
    } catch (error) {
      toast.error("No se pudo guardar el integrante", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setMemberBusy(false);
    }
  };

  const handleMemberDelete = async () => {
    if (!deletingMember) return;
    setMemberBusy(true);
    try {
      await removeWhatsAppMember(deletingMember.id);
      toast.success("Integrante eliminado");
      setDeletingMember(null);
    } catch (error) {
      toast.error("No se pudo eliminar el integrante", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setMemberBusy(false);
    }
  };

  const updateSettings = async (patch: Partial<WhatsAppNotificationSettings>) => {
    const previous = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSettingsBusy(true);
    try {
      await saveWhatsAppSettings(next);
      toast.success("Automatización actualizada");
    } catch (error) {
      setSettings(previous);
      toast.error("No se pudo guardar la automatización", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleTemplateRefresh = async () => {
    setTemplateBusy(true);
    try {
      const result = await refreshWhatsAppTemplateStatus();
      toast.success(result.status === "APPROVED" ? "Plantilla aprobada" : `Estado de plantilla: ${templateStatusLabel(result.status)}`);
    } catch (error) {
      toast.error("No se pudo consultar la plantilla", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setTemplateBusy(false);
    }
  };

  if (!auth.configured) return null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-600">WhatsApp</p>
          <h2 className="mt-2 font-display text-2xl font-bold">Avisos del equipo</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-app-secondary">Administra quién recibe los setlists y revisa la entrega de cada mensaje.</p>
        </div>
        <Button onClick={openNewMember}><Plus className="size-4" /> Registrar integrante</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-app-border p-5 sm:flex-row sm:items-center">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><UsersRound className="size-5" /></span>
              <div className="min-w-0 flex-1"><h3 className="font-display text-xl font-bold">Integrantes</h3><p className="mt-1 text-xs text-app-secondary">{activeRecipients} de {members.length} recibirán el próximo aviso.</p></div>
              {loading ? <LoaderCircle className="size-5 animate-spin text-brand" /> : null}
            </div>
            {members.length ? (
              <div className="divide-y divide-app-border">
                {members.map((member) => (
                  <div key={member.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-brand"><UserRound className="size-4.5" /></span>
                      <div className="min-w-0"><p className="truncate text-sm font-bold">{member.displayName}</p><p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-app-secondary"><span>{member.phoneE164}</span>{member.email ? <span>· {member.email}</span> : null}</p></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge tone={member.whatsappOptIn ? "success" : "warning"}>{member.whatsappOptIn ? "Consentimiento" : "Sin consentimiento"}</Badge>
                      <Badge tone={member.notificationsEnabled ? "brand" : "neutral"}>{member.notificationsEnabled ? "Avisos activos" : "Pausado"}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => openMember(member)} aria-label={`Editar ${member.displayName}`}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingMember(member)} aria-label={`Eliminar ${member.displayName}`} className="text-app-danger"><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center"><Phone className="mx-auto size-9 text-app-secondary" /><h3 className="mt-4 font-bold">Aún no hay integrantes</h3><p className="mt-1 text-sm text-app-secondary">Registra el primer teléfono para activar los avisos automáticos.</p></div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-app-border p-5"><span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink"><MessageCircleMore className="size-5" /></span><div><h3 className="font-display text-xl font-bold">Registro de envíos</h3><p className="mt-1 text-xs text-app-secondary">Últimos 100 mensajes procesados por WhatsApp.</p></div></div>
            {deliveries.length ? <div className="divide-y divide-app-border">{deliveries.map((delivery) => <DeliveryRow key={delivery.id} delivery={delivery} />)}</div> : <div className="p-8 text-center text-sm text-app-secondary">Los envíos aparecerán aquí al crear o actualizar un setlist.</div>}
          </Card>
        </div>

        <aside>
          <Card className="sticky top-24 overflow-hidden">
            <div className={cx("p-5 text-white", settings.enabled ? "bg-emerald-600" : "bg-slate-600")}><MessageCircleMore className="size-6" /><h3 className="mt-5 font-display text-xl font-bold">Automatización</h3><p className="mt-2 text-sm leading-6 text-white/80">Plantilla {settings.templateName} · {settings.templateLanguage}</p><div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/15 p-3"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-white/65">Estado en Meta</p><p className="mt-1 text-sm font-bold">{templateStatusLabel(settings.templateStatus)}</p></div><button type="button" onClick={() => void handleTemplateRefresh()} disabled={templateBusy} className="flex size-9 items-center justify-center rounded-lg bg-white/15 transition hover:bg-white/25 disabled:opacity-50" aria-label="Verificar plantilla en Meta">{templateBusy ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}</button></div>{settings.templateStatusCheckedAt ? <p className="mt-2 text-[11px] text-white/65">Verificada {dayjs(settings.templateStatusCheckedAt).fromNow()}</p> : null}{settings.templateStatusError ? <p className="mt-2 text-xs text-red-100">{settings.templateStatusError}</p> : null}<div className="mt-5 flex items-center justify-between rounded-xl bg-white/15 p-3"><span className="text-sm font-bold">Envíos automáticos</span><Switch enabled={settings.enabled} disabled={settingsBusy} onChange={(enabled) => void updateSettings({ enabled })} /></div></div>
            <div className="divide-y divide-app-border">
              <AutomationRow title="Al crear" description="Avisa cuando se sincroniza un setlist nuevo" enabled={settings.notifyOnCreate} disabled={settingsBusy} onChange={(notifyOnCreate) => void updateSettings({ notifyOnCreate })} />
              <AutomationRow title="Al actualizar" description="Avisa después de cada guardado posterior" enabled={settings.notifyOnUpdate} disabled={settingsBusy} onChange={(notifyOnUpdate) => void updateSettings({ notifyOnUpdate })} />
              <AutomationRow title="Sólo setlists listos" description="Los borradores no generan mensajes" enabled={settings.onlyReady} disabled={settingsBusy} onChange={(onlyReady) => void updateSettings({ onlyReady })} />
            </div>
            <div className="space-y-3 border-t border-app-border p-5 text-xs leading-5 text-app-secondary"><p><strong className="text-app-text">{activeRecipients}</strong> destinatarios activos</p><p>Los teléfonos sin consentimiento permanecen registrados, pero el backend los excluye de todos los envíos.</p></div>
          </Card>
        </aside>
      </div>

      {editingMember !== undefined ? (
        <Modal
          title={editingMember ? "Editar integrante" : "Registrar integrante"}
          description="El teléfono se guarda en formato internacional y sólo recibirá mensajes si registras su consentimiento."
          icon={<Phone className="size-5" />}
          size="lg"
          onClose={() => { if (!memberBusy) setEditingMember(undefined); }}
          footer={<><Button variant="secondary" onClick={() => setEditingMember(undefined)} disabled={memberBusy}>Cancelar</Button><Button onClick={() => void handleMemberSave()} disabled={memberBusy}>{memberBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}{memberBusy ? "Guardando" : "Guardar integrante"}</Button></>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre"><input value={memberForm.displayName} onChange={(event) => setMemberForm((value) => ({ ...value, displayName: event.target.value }))} placeholder="Nombre del integrante" /></Field>
            <Field label="Teléfono de WhatsApp"><input value={memberForm.phoneE164} onChange={(event) => setMemberForm((value) => ({ ...value, phoneE164: event.target.value }))} placeholder="+52 55 1234 5678" inputMode="tel" /></Field>
          </div>
          <div className="mt-4"><Field label="Correo opcional"><input value={memberForm.email} onChange={(event) => setMemberForm((value) => ({ ...value, email: event.target.value }))} placeholder="integrante@ejemplo.com" type="email" /></Field></div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-app-border p-4"><input type="checkbox" className="mt-1 size-4 accent-emerald-600" checked={memberForm.whatsappOptIn} onChange={(event) => setMemberForm((value) => ({ ...value, whatsappOptIn: event.target.checked }))} /><span><strong className="block text-sm">Consentimiento para WhatsApp</strong><span className="mt-1 block text-xs leading-5 text-app-secondary">Confirmo que esta persona autorizó recibir avisos de WorshipNotes en este número.</span></span></label>
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-app-border p-4"><input type="checkbox" className="mt-1 size-4 accent-brand" checked={memberForm.notificationsEnabled} onChange={(event) => setMemberForm((value) => ({ ...value, notificationsEnabled: event.target.checked }))} /><span><strong className="block text-sm">Avisos activos</strong><span className="mt-1 block text-xs leading-5 text-app-secondary">Permite pausar temporalmente a un integrante sin borrarlo.</span></span></label>
        </Modal>
      ) : null}

      {deletingMember ? <ConfirmModal title={`¿Eliminar a ${deletingMember.displayName}?`} description="Dejará de recibir avisos y desaparecerá del directorio. Los registros históricos se conservarán." danger confirmLabel={memberBusy ? "Eliminando" : "Eliminar"} onCancel={() => { if (!memberBusy) setDeletingMember(null); }} onConfirm={() => void handleMemberDelete()} /> : null}
    </section>
  );
}

function DeliveryRow({ delivery }: { delivery: WhatsAppDelivery }) {
  const status = deliveryStatus(delivery);
  const StatusIcon = status.icon;
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <span className={cx("flex size-10 items-center justify-center rounded-xl", status.className)}><StatusIcon className="size-4.5" /></span>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold">{delivery.memberName}</p><Badge tone={status.tone}>{status.label}</Badge></div><p className="mt-1 truncate text-xs text-app-secondary">{delivery.setlistName} · {delivery.action === "create" ? "creación" : "actualización"} · {delivery.phoneE164}</p>{delivery.errorMessage ? <p className="mt-1 text-xs text-app-danger">{delivery.errorMessage}</p> : null}</div>
      <time className="text-xs font-semibold text-app-secondary" dateTime={delivery.updatedAt}>{dayjs(delivery.updatedAt).format("D MMM YYYY · HH:mm")}</time>
    </div>
  );
}

function deliveryStatus(delivery: WhatsAppDelivery): { label: string; tone: "neutral" | "warning" | "brand" | "success"; className: string; icon: typeof Send } {
  if (delivery.status === "read") return { label: "Leído", tone: "success", className: "bg-emerald-50 text-emerald-700", icon: Eye };
  if (delivery.status === "delivered") return { label: "Entregado", tone: "success", className: "bg-emerald-50 text-emerald-700", icon: CheckCheck };
  if (delivery.status === "sent") return { label: "Enviado", tone: "brand", className: "bg-brand-soft text-brand-ink", icon: Send };
  if (delivery.status === "failed") return { label: "Fallido", tone: "warning", className: "bg-red-50 text-red-700", icon: AlertCircle };
  return { label: delivery.status === "sending" ? "Enviando" : "En cola", tone: "neutral", className: "bg-app-surface-muted text-app-secondary", icon: Clock3 };
}

function AutomationRow({ title, description, enabled, disabled, onChange }: { title: string; description: string; enabled: boolean; disabled: boolean; onChange: (enabled: boolean) => void }) {
  return <div className="flex items-center gap-3 p-5"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-app-secondary">{description}</p></div><Switch enabled={enabled} disabled={disabled} onChange={onChange} /></div>;
}

function Switch({ enabled, disabled, onChange }: { enabled: boolean; disabled?: boolean; onChange: (enabled: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={enabled} disabled={disabled} onClick={() => onChange(!enabled)} className={cx("relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50", enabled ? "bg-brand" : "bg-slate-300")}><span className={cx("absolute top-1 size-5 rounded-full bg-white shadow-sm transition", enabled ? "left-6" : "left-1")} /></button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-app-secondary">{label}</span><span className="flex min-h-11 rounded-xl border border-app-border bg-app-surface-muted px-3 [&_input]:w-full [&_input]:bg-transparent [&_input]:text-sm [&_input]:outline-none">{children}</span></label>;
}

function templateStatusLabel(status: WhatsAppNotificationSettings["templateStatus"]) {
  const labels: Record<WhatsAppNotificationSettings["templateStatus"], string> = {
    APPROVED: "Aprobada",
    PENDING: "En revisión",
    REJECTED: "Rechazada",
    PAUSED: "Pausada",
    DISABLED: "Deshabilitada",
    IN_APPEAL: "En apelación",
    NOT_FOUND: "No encontrada",
    UNKNOWN: "Sin verificar",
  };
  return labels[status];
}
