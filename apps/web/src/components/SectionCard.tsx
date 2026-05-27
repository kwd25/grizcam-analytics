import type { PropsWithChildren, ReactNode } from "react";

type SectionCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Optional eyebrow index — renders as `01 / TITLE` per design system. */
  index?: number;
  className?: string;
  contentClassName?: string;
}>;

export const SectionCard = ({ title, subtitle, actions, index, className, contentClassName, children }: SectionCardProps) => (
  <section className={`panel flex min-h-0 flex-col rounded-lg p-5 ${className ?? ""}`}>
    <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
      <div className="min-w-0">
        {typeof index === "number" ? (
          <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            <span className="font-mono tabular-nums">{String(index).padStart(2, "0")}</span>
            <span>/</span>
            <span className="font-semibold">{title.toUpperCase()}</span>
          </div>
        ) : null}
        <h2 className="text-base font-semibold tracking-wide text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
    <div className={`min-h-0 flex-1 ${contentClassName ?? ""}`}>{children}</div>
  </section>
);
