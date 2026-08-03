import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand text-white shadow-[0_10px_24px_-12px_var(--app-primary)] hover:bg-brand-hover",
        variant === "secondary" && "border border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted",
        variant === "ghost" && "text-app-secondary hover:bg-app-surface-muted hover:text-app-text",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        size === "sm" && "min-h-9 rounded-lg px-3 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "icon" && "size-11 shrink-0 p-0",
        className,
      )}
      {...props}
    />
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  icon,
  size = "md",
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const titleId = `modal-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      tabIndex={-1}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          "w-full rounded-2xl border border-app-border bg-app-surface p-6 shadow-2xl",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-md",
          size === "lg" && "max-w-lg",
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {icon ? <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">{icon}</span> : null}
            <h2 id={titleId} className={cx("font-display text-xl font-bold", icon ? "mt-5" : "")}>{title}</h2>
            {description ? <div className="mt-2 text-sm leading-6 text-app-secondary">{description}</div> : null}
          </div>
          <button onClick={onClose} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-app-secondary hover:bg-app-surface-muted" aria-label="Cerrar">
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  icon,
}: {
  title: string;
  description?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Modal
      title={title}
      description={description}
      onClose={onCancel}
      icon={icon}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("app-card rounded-2xl", className)}>{children}</section>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "brand" | "success" | "warning" | "neutral" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        tone === "brand" && "bg-brand-soft text-brand-ink",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-700",
        tone === "neutral" && "bg-app-surface-muted text-app-secondary",
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, action, backHref }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; backHref?: string }) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link href={backHref} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-app-secondary hover:text-brand">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        ) : null}
        {eyebrow ? <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-brand">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-bold tracking-[-0.035em] text-app-text sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-app-secondary sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
