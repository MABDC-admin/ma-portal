import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Icon } from "./Icon";

const nav = [
  { to: "/", label: "Live Attendance", icon: "dashboard" },
  { to: "/teachers", label: "Teachers", icon: "school" },
  { to: "/faculty", label: "Faculty Directory", icon: "badge" },
  { to: "/students/alex-chen", label: "Student Profile", icon: "group" },
  { to: "/students/eleanor-shellstrop/attendance", label: "Attendance Profile", icon: "fact_check" },
  { to: "/dll", label: "DLL Review", icon: "description" },
  { to: "/dll/new", label: "New DLL Entry", icon: "note_add" },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-outline-variant bg-surface md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Icon name="school" filled weight={600} />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold leading-tight text-foreground">AttendCloud</h2>
            <p className="text-xs text-muted-foreground">Horizon Academy</p>
          </div>
        </div>

        <div className="px-4 pb-2">
          <Link
            to="/dll/new"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            <Icon name="add_circle" size={18} />
            <span>New DLL Entry</span>
          </Link>
        </div>

        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition " +
                  (active
                    ? "bg-primary-container/60 text-primary"
                    : "text-tertiary hover:bg-surface-container hover:text-foreground")
                }
              >
                <Icon name={item.icon} size={20} filled={active} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-primary">
              JR
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Dr. Julian Rivers</p>
              <p className="truncate text-xs text-muted-foreground">Academic Director</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:ml-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-outline-variant bg-surface/80 px-6 backdrop-blur-md">
          <div className="relative w-full max-w-md">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
            <input
              placeholder="Search students, teachers, logs…"
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-full p-2 text-tertiary transition hover:bg-surface-container hover:text-foreground" aria-label="Notifications">
              <Icon name="notifications" size={20} />
            </button>
            <button className="rounded-full p-2 text-tertiary transition hover:bg-surface-container hover:text-foreground" aria-label="Help">
              <Icon name="help" size={20} />
            </button>
          </div>
        </header>

        {(title || actions) && (
          <div className="flex flex-col gap-4 border-b border-outline-variant/50 bg-background px-6 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between md:px-10">
            <div>
              {title && (
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
              )}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}

        <main className="px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
  icon,
}: {
  tone: "present" | "late" | "absent" | "excused" | "neutral";
  children: ReactNode;
  icon?: string;
}) {
  const toneMap = {
    present: "bg-status-present/10 text-status-present",
    late: "bg-status-late/15 text-status-late",
    absent: "bg-status-absent/10 text-status-absent",
    excused: "bg-status-excused/10 text-status-excused",
    neutral: "bg-surface-container text-tertiary",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneMap[tone]}`}>
      {icon && <Icon name={icon} size={14} filled />}
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-2xl ${className}`}>{children}</div>
  );
}
