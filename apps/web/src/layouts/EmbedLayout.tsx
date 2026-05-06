import type { PropsWithChildren, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { appEnv } from "../lib/env";
import { classNames } from "../lib/utils";

type EmbedLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  aside?: ReactNode;
  viewportLayout?: boolean;
  mainClassName?: string;
  asideClassName?: string;
}>;

const embedNavItems = [
  { to: "/embed/overview", label: "Overview" },
  { to: "/embed/ops", label: "Ops" },
  { to: "/embed/advanced", label: "Advanced" },
  { to: "/embed/reports", label: "Reports" }
];

export const EmbedLayout = ({
  title,
  subtitle,
  badge,
  aside,
  viewportLayout = false,
  mainClassName,
  asideClassName,
  children
}: EmbedLayoutProps) => {
  const brandLabel = appEnv.portalEmbed.brandLabel || "GrizCam Portal";

  return (
    <div
      className={classNames(
        "embed-shell min-h-screen overflow-x-hidden bg-neutral-950 px-2 py-2 text-zinc-100 sm:px-3",
        viewportLayout ? "lg:h-[100dvh] lg:overflow-y-hidden" : ""
      )}
    >
      <div className={classNames("min-w-0", viewportLayout ? "flex min-h-screen flex-col gap-2 lg:h-full lg:min-h-0" : "space-y-2")}>
        <header className="embed-topbar shrink-0 rounded-2xl border border-white/10 bg-neutral-900 px-3 py-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-sm font-semibold text-white">{brandLabel}</div>
                <div className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-300">
                  Analytics
                </div>
                {badge ? <div className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">{badge}</div> : null}
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <h1 className="text-lg font-semibold leading-tight text-white">{title}</h1>
                {subtitle ? <p className="max-w-4xl text-xs leading-4 text-zinc-400">{subtitle}</p> : null}
              </div>
            </div>

            <nav className="embed-nav flex shrink-0 flex-wrap gap-1" aria-label="Embed analytics sections">
              {embedNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    classNames(
                      "rounded-2xl border px-3 py-1 text-xs transition",
                      isActive ? "border-white/25 bg-white/15 text-white" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <div className={classNames("embed-content grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_210px]", viewportLayout ? "lg:min-h-0 lg:flex-1" : "")}>
          <main className={classNames("min-w-0", viewportLayout ? "lg:min-h-0" : "space-y-4", mainClassName)}>{children}</main>
          {aside ? <div className={classNames("min-w-0 lg:order-2", viewportLayout ? "lg:min-h-0" : "", asideClassName)}>{aside}</div> : null}
        </div>
      </div>
    </div>
  );
};
