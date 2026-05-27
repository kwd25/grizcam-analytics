import type { ComponentType, PropsWithChildren, ReactNode, SVGProps } from "react";
import { Activity, BarChart3, FileText, LayoutDashboard, MessageSquare, Moon, Sun } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { EmbedLayout } from "../layouts/EmbedLayout";
import { useTheme } from "../hooks/useTheme";
import { classNames } from "../lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  badge?: ReactNode;
  aside?: ReactNode;
  viewportLayout?: boolean;
  mainClassName?: string;
  asideClassName?: string;
}>;

const navItems: Array<{ to: string; label: string; end?: boolean; Icon: IconComponent }> = [
  { to: "/", label: "Query", end: true, Icon: MessageSquare },
  { to: "/overview", label: "Overview", Icon: LayoutDashboard },
  { to: "/ops", label: "Ops", Icon: Activity },
  { to: "/advanced", label: "Advanced", Icon: BarChart3 },
  { to: "/reports", label: "Reports", Icon: FileText }
];

const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
    >
      <Icon width={16} height={16} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
};

export const AppShell = ({ title, subtitle, badge, aside, viewportLayout = false, mainClassName, asideClassName, children }: AppShellProps) => {
  const location = useLocation();

  if (location.pathname.startsWith("/embed")) {
    return (
      <EmbedLayout
        title={title}
        subtitle={subtitle}
        badge={badge}
        aside={aside}
        viewportLayout={viewportLayout}
        mainClassName={mainClassName}
        asideClassName={asideClassName}
      >
        {children}
      </EmbedLayout>
    );
  }

  return (
    <div
      className={classNames(
        "overflow-x-hidden px-3 py-2 text-zinc-100",
        viewportLayout ? "min-h-screen lg:h-[100dvh] lg:overflow-y-hidden" : "min-h-screen"
      )}
    >
      <div className={classNames("mx-auto max-w-[1800px]", viewportLayout ? "flex min-h-screen flex-col gap-2 lg:h-full lg:min-h-0" : "space-y-2")}>
        <header className="shrink-0 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[var(--grz-pitch-black)]">
                  <img src="/brand/grizzly-mark.png" alt="" className="h-8 w-8 object-contain opacity-85 invert" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold leading-none text-white">{title}</h1>
                  <p className="mt-0.5 max-w-3xl text-xs leading-4 text-zinc-400">{subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      classNames(
                        "flex items-center gap-1.5 rounded-2xl border px-3 py-1 text-xs transition",
                        isActive ? "border-white/25 bg-white/15 text-white" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                      )
                    }
                  >
                    <item.Icon width={14} height={14} strokeWidth={1.5} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {badge ? <div className="max-w-full rounded-2xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs leading-5 text-zinc-100">{badge}</div> : null}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className={classNames("grid gap-2 lg:grid-cols-[minmax(0,1fr)_210px]", viewportLayout ? "lg:min-h-0 lg:flex-1" : "")}>
          <main className={classNames("min-w-0", viewportLayout ? "lg:min-h-0" : "space-y-4", mainClassName)}>{children}</main>
          {aside ? <div className={classNames("min-w-0 lg:order-2", viewportLayout ? "lg:min-h-0" : "", asideClassName)}>{aside}</div> : null}
        </div>
      </div>
    </div>
  );
};
