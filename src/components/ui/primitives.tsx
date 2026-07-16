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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50",
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

