import { Bell, LayoutDashboard, Search, Users, Calculator, Kanban, BellRing, BarChart3, Settings, Table2, BookOpen, ChevronLeft, ChevronRight, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import { initials } from "../lib/format";
import { logoutApi } from "../lib/auth";

const mainNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/plans", label: "Plans", icon: BookOpen },
  { to: "/quotations", label: "Quotation & Calculator", icon: Calculator },
  { to: "/leads", label: "Leads / Pipeline", icon: Kanban },
  { to: "/reminders", label: "Reminders & Messages", icon: BellRing },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const mobileNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/plans", label: "Plans", icon: BookOpen },
  { to: "/quotations", label: "Quotation", icon: Calculator },
  { to: "/leads", label: "Leads", icon: Kanban },
  { to: "/reminders", label: "Reminders", icon: BellRing },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  isCollapsed,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  isCollapsed?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-xl transition-all group relative ${
          isCollapsed ? "justify-center py-2.5 px-2" : "gap-2.5 px-3 py-2 text-[13px] font-medium"
        } ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
      {!isCollapsed && <span className="truncate">{label}</span>}
      {isCollapsed && <span className="sr-only">{label}</span>}
    </NavLink>
  );
}

export function AppShell() {
  const { agent, notifications, clients, leads, reset, refreshAgentData } = useStore();
  const [q, setQ] = useState("");
  const [bell, setBell] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Ensure agent records are loaded on app mount
  useEffect(() => {
    if (clients.length === 0) {
      refreshAgentData();
    }
  }, []);

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const navigate = useNavigate();
  const loc = useLocation();

  // Close dropdown on navigation
  useEffect(() => {
    setProfileOpen(false);
  }, [loc.pathname]);

  const hits = q.trim()
    ? [
        ...clients
          .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
          .map((c) => ({ to: `/clients/${c.id}`, label: c.name, sub: c.phone })),
        ...leads
          .filter((l) => `${l.name} ${l.phone}`.toLowerCase().includes(q.toLowerCase()))
          .map((l) => ({ to: "/leads", label: l.name, sub: l.phone })),
      ].slice(0, 8)
    : [];

  return (
    <div className="min-h-svh bg-background lg:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden transition-all duration-300 ease-in-out bg-sidebar text-sidebar-foreground lg:flex lg:flex-col ${
          isCollapsed ? "w-16" : "w-56"
        }`}
      >
        {isCollapsed ? (
          /* Closed/Collapsed Header: Big logo on top with transparent background, then name underneath */
          <div className="flex flex-col items-center py-4 px-2 border-b border-sidebar-border/40">
            <Link to="/" className="flex flex-col items-center group/logo hover:opacity-95 transition-opacity" title="Perfect Agent">
              <img
                src="/Perfect_Agent_Logo_with_Gold_Tick-removebg-preview.png"
                alt="Perfect Agent Logo"
                className="h-11 w-11 object-contain drop-shadow-sm transition-transform group-hover/logo:scale-105"
              />
              {/* <div className="mt-1 flex flex-col items-center text-center select-none leading-none">
                <span className="text-[10px] font-bold tracking-tight text-sidebar-foreground">Perfect</span>
                <span className="text-[9px] font-extrabold tracking-wider text-gold uppercase mt-0.5">Agent</span>
              </div> */}
            </Link>
          </div>
        ) : (
          /* Open/Expanded Header: Big transparent logo first, then Perfect Agent name under that */
          <div className="flex flex-col items-center pt-5 pb-4 px-3 border-b border-sidebar-border/40">
            <Link to="/" className="flex flex-col items-center group/logo hover:opacity-95 transition-opacity" title="Perfect Agent">
              <img
                src="/Perfect_Agent_Logo_with_Gold_Tick-removebg-preview.png"
                alt="Perfect Agent Logo"
                className="h-20 w-20 object-contain drop-shadow-md transition-transform group-hover/logo:scale-105"
              />
              {/* <div className="mt-2.5 flex flex-col items-center text-center">
                <span className="text-base font-bold tracking-tight text-sidebar-foreground leading-tight">
                  Perfect Agent
                </span>
                <span className="text-[10px] font-semibold text-gold tracking-wider uppercase mt-0.5">
                  LIC Agent Workspace
                </span>
              </div> */}
            </Link>
          </div>
        )}

        <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto overflow-x-hidden">
          {mainNav.map((n) => (
            <NavItem key={n.to} {...n} isCollapsed={isCollapsed} />
          ))}
          <div className="pt-3 pb-1">
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                Admin
              </p>
            ) : (
              <div className="mx-2 my-1 border-t border-sidebar-border/40" />
            )}
          </div>
          <NavItem to="/admin" label="Rate & Commission Tables" icon={Table2} isCollapsed={isCollapsed} />
        </nav>

        {/* Bottom Toggle Button matching theme */}
        <div className="p-2 border-t border-sidebar-border/40">
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="flex h-9 w-full items-center justify-center rounded-xl bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-gold hover:bg-sidebar-accent border border-sidebar-border/60 transition-all group shadow-2xs"
            >
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 text-gold" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="flex h-9 w-full items-center justify-between px-3 rounded-xl bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-gold hover:bg-sidebar-accent border border-sidebar-border/60 transition-all group shadow-2xs"
            >
              <span className="text-xs font-medium">Collapse</span>
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-gold" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-sidebar text-sidebar-foreground flex flex-col lg:hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border/40">
          <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 min-w-0">
            <img
              src="/Perfect_Agent_Logo_with_Gold_Tick-removebg-preview.png"
              alt="Perfect Agent Logo"
              className="h-10 w-10 object-contain shrink-0"
            />
            <div>
              <p className="font-semibold leading-tight text-sidebar-foreground truncate text-sm">Perfect Agent</p>
              <p className="text-[11px] text-gold truncate">LIC Agent Workspace</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto">
          {mainNav.map((n) => (
            <div key={n.to} onClick={() => setMobileOpen(false)}>
              <NavItem {...n} isCollapsed={false} />
            </div>
          ))}
          <p className="px-3 pb-1 pt-6 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
            Admin
          </p>
          <div onClick={() => setMobileOpen(false)}>
            <NavItem to="/admin" label="Rate & Commission Tables" icon={Table2} isCollapsed={false} />
          </div>
        </nav>
        <div className="p-3 border-t border-sidebar-border/40">
          <button
            type="button"
            onClick={async () => {
              setMobileOpen(false);
              reset();
              await logoutApi();
              navigate("/login");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div
        className={`flex min-h-svh min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:ml-16" : "lg:ml-56"
        }`}
      >
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:px-6">
          {/* Mobile Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted shrink-0"
            title="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-2 lg:hidden shrink-0">
            <img
              src="/Perfect_Agent_Logo_with_Gold_Tick-removebg-preview.png"
              alt="Perfect Agent Logo"
              className="h-8 w-8 object-contain"
            />
          </Link>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search clients, leads, phone numbers..."
              className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
            />
            {hits.length > 0 && (
              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-card">
                {hits.map((h) => (
                  <button
                    key={h.to + h.label}
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      navigate(h.to);
                      setQ("");
                    }}
                  >
                    <span>{h.label}</span>
                    <span className="text-xs text-muted-foreground num">{h.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setBell((v) => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
            >
              <Bell className="h-4 w-4" />
            </button>
            {bell && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-card">
                {notifications.map((n) => (
                  <div key={n.id} className="border-b border-border px-3 py-2 last:border-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              id="profile-menu-btn"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 hover:bg-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              {agent.avatar ? (
                <img
                  src={agent.avatar}
                  alt={agent.name || "Agent"}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-border/50 shrink-0"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shrink-0">
                  {agent.name ? initials(agent.name) : "…"}
                </span>
              )}
              <span className="hidden text-sm font-medium sm:block max-w-[120px] truncate">
                {agent.name || "Agent"}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
                {/* Agent Header */}
                <div className="border-b border-border/70 px-4 py-3 bg-muted/20">
                  <p className="text-sm font-semibold truncate text-foreground">{agent.name || "Agent"}</p>
                  {agent.code && (
                    <p className="text-xs text-muted-foreground truncate">Code: {agent.code}</p>
                  )}
                  {agent.branch && (
                    <p className="text-xs text-muted-foreground truncate">Branch: {agent.branch}</p>
                  )}
                </div>

                <div className="p-1">
                  {/* Settings Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/settings");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/90 hover:bg-muted/70 hover:text-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </button>

                  <div className="my-1 border-t border-border/70" />

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false);
                      reset();
                      await logoutApi();
                      navigate("/login");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main key={loc.pathname} className="min-w-0 flex-1 px-4 pb-24 pt-6 lg:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card lg:hidden">
        {mobileNav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? "text-primary" : "text-muted-foreground"}`
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
