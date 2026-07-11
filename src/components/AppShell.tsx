import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Icon } from "./Icon";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/auth.functions";

type NavItem = { to: string; label: string; icon: string; roles: AppRole[] };

const nav: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: "dashboard",
    roles: ["admin", "academic_director", "teacher"],
  },
  {
    to: "/calendar",
    label: "School Calendar",
    icon: "calendar_month",
    roles: ["admin", "academic_director", "teacher"],
  },
  { to: "/my-dlls", label: "My Lesson Logs", icon: "history_edu", roles: ["teacher"] },
  { to: "/dll/new", label: "New DLL Entry", icon: "note_add", roles: ["admin", "teacher"] },
  { to: "/teachers", label: "Teachers", icon: "school", roles: ["admin"] },
  {
    to: "/faculty",
    label: "Faculty Directory",
    icon: "badge",
    roles: ["admin", "academic_director"],
  },
  {
    to: "/learners",
    label: "Learners List",
    icon: "groups",
    roles: ["admin", "academic_director"],
  },
  { to: "/dll", label: "DLL Review", icon: "description", roles: ["admin", "academic_director"] },
  {
    to: "/anecdotal",
    label: "Anecdotal Log",
    icon: "sticky_note_2",
    roles: ["admin", "academic_director"],
  },
  { to: "/students/me", label: "My Profile", icon: "group", roles: ["student"] },
  { to: "/school-years", label: "School Years", icon: "date_range", roles: ["admin"] },
  { to: "/schedule", label: "Class Schedule", icon: "calendar_view_week", roles: ["admin"] },
  { to: "/users", label: "User Management", icon: "manage_accounts", roles: ["admin"] },
  { to: "/import-learners", label: "Import Learners", icon: "cloud_upload", roles: ["admin"] },
  {
    to: "/kiosk",
    label: "Attendance Kiosk",
    icon: "face_retouching_natural",
    roles: ["admin", "kiosk"],
  },
  { to: "/face-registration", label: "Face Registration", icon: "face", roles: ["admin"] },
];

const roleBadge: Record<AppRole, { label: string; tone: string }> = {
  admin: { label: "Admin", tone: "bg-status-absent/10 text-status-absent" },
  academic_director: { label: "Director", tone: "bg-status-late/15 text-status-late" },
  teacher: { label: "Teacher", tone: "bg-primary-container/40 text-primary" },
  student: { label: "Student", tone: "bg-status-present/10 text-status-present" },
  kiosk: { label: "Kiosk", tone: "bg-secondary/10 text-secondary" },
};

const COLLAPSE_KEY = "appshell:sidebar-collapsed";

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
  const { profile, logout, hasAnyRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // hydrate persisted collapse state after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const visibleNav = nav.filter((item) => hasAnyRole(item.roles));
  const role = profile?.role ?? "student";
  const badge = roleBadge[role];
  const displayName = profile?.full_name || profile?.email || "User";
  const userInitials = initials(displayName);

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[240px]";
  const mainOffset = collapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-md md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen ${sidebarWidth} flex-col border-r border-secondary/30 bg-surface/90 backdrop-blur-xl transition-[width,transform] duration-300 ease-in-out md:translate-x-0 md:flex shadow-[2px_0_20px_-5px_rgba(0,240,255,0.15)] ${mobileMenuOpen ? "translate-x-0 flex w-[240px]" : "-translate-x-full hidden md:flex"}`}
      >
        <div
          className={`flex items-center gap-3 px-5 py-5 ${collapsed ? "md:justify-center md:px-2" : ""}`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Icon name="school" filled weight={600} />
          </div>
          {(!collapsed || mobileMenuOpen) && (
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold leading-tight text-foreground truncate">
                AttendCloud
              </h2>
              <p className="text-xs text-muted-foreground truncate">Horizon Academy</p>
            </div>
          )}
        </div>

        {hasAnyRole(["admin", "teacher"]) && (
          <div className={`px-4 pb-2 ${collapsed ? "md:px-2" : ""}`}>
            <Link
              to="/dll/new"
              onClick={() => setMobileMenuOpen(false)}
              title={collapsed ? "New DLL Entry" : undefined}
              className={`flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_15px_rgba(255,51,102,0.4)] transition hover:shadow-[0_0_25px_rgba(255,51,102,0.6)] ${collapsed ? "md:px-0" : ""}`}
            >
              <Icon name="add_circle" size={18} />
              {(!collapsed || mobileMenuOpen) && (
                <span className={collapsed ? "md:hidden" : ""}>New DLL Entry</span>
              )}
            </Link>
          </div>
        )}

        <nav
          className={`mt-2 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 ${collapsed ? "md:px-2" : ""}`}
        >
          {visibleNav.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                title={collapsed ? item.label : undefined}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition " +
                  (collapsed ? "md:justify-center md:px-2 " : "") +
                  (active
                    ? "bg-primary-container/60 text-primary"
                    : "text-tertiary hover:bg-surface-container hover:text-foreground")
                }
              >
                <Icon name={item.icon} size={20} filled={active} />
                {(!collapsed || mobileMenuOpen) && (
                  <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex items-center justify-center gap-2 border-t border-outline-variant/60 py-2 text-xs font-medium text-tertiary transition hover:bg-surface-container hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={18} />
          {!collapsed && <span>Collapse</span>}
        </button>

        <div className={`border-t border-outline-variant/60 p-4 ${collapsed ? "md:p-2" : ""}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "md:justify-center" : ""}`}>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-primary"
              title={collapsed ? displayName : undefined}
            >
              {userInitials}
            </div>
            {(!collapsed || mobileMenuOpen) && (
              <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <span
                  className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badge.tone}`}
                >
                  {badge.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col min-w-0 ${mainOffset} h-screen overflow-y-auto transition-[margin] duration-300 ease-in-out`}
      >
        <header className="sticky top-0 z-20 shrink-0 flex h-16 items-center gap-2 sm:gap-4 border-b border-secondary/30 bg-surface/80 px-4 md:px-6 backdrop-blur-xl shadow-[0_2px_20px_-5px_rgba(0,240,255,0.1)]">
          <button
            className="md:hidden p-2 -ml-2 rounded-lg text-tertiary hover:bg-surface-container shrink-0 transition"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={24} />
          </button>

          <button
            className="hidden md:flex p-2 -ml-2 rounded-lg text-tertiary hover:bg-surface-container shrink-0 transition"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name="menu" size={22} />
          </button>

          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <button
              className="rounded-full p-2 text-tertiary transition hover:bg-surface-container hover:text-foreground"
              aria-label="Notifications"
            >
              <Icon name="notifications" size={20} />
            </button>
            <button
              className="rounded-full p-2 text-tertiary transition hover:bg-surface-container hover:text-foreground"
              aria-label="Help"
            >
              <Icon name="help" size={20} />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-primary transition hover:brightness-95"
                aria-label="Account menu"
              >
                {userInitials}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-11 z-40 w-56 rounded-2xl border border-outline-variant bg-surface p-2 shadow-xl">
                    <div className="border-b border-outline-variant/50 px-3 py-2">
                      <p className="truncate text-sm font-semibold">{displayName}</p>
                      <p className="truncate text-xs text-tertiary">{profile?.email}</p>
                    </div>
                    <button
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-status-absent transition hover:bg-surface-container"
                    >
                      <Icon name="logout" size={18} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {(title || actions) && (
          <div className="flex flex-col gap-4 border-b border-outline-variant/50 bg-background px-4 pb-4 pt-6 sm:flex-row sm:items-end sm:justify-between sm:px-6 md:px-10 md:pb-6 md:pt-8">
            <div>
              {title && (
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {title}
                </h1>
              )}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 relative z-10">{actions}</div>}
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 md:px-10 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .map((n) => n[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
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
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneMap[tone]}`}
    >
      {icon && <Icon name={icon} size={14} filled />}
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass-card rounded-2xl ${className}`}>{children}</div>;
}
