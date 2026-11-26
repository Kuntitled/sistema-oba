"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Swords,
  Radio,
  CalendarRange,
  Layers,
  ShieldBan,
  Settings,
  User,
  Loader2,
} from "lucide-react";

interface AdminSidebarNavProps {
  isAdmin: boolean;
}

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon:
    | "dashboard"
    | "bladers"
    | "torneios"
    | "arenas"
    | "temporadas"
    | "pecas"
    | "formatos"
    | "config"
    | "user";
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", exact: true, icon: "dashboard" },
  { href: "/admin/bladers", label: "Bladers", icon: "bladers" },
  { href: "/admin/torneios", label: "Torneios", icon: "torneios" },
  { href: "/admin/arenas", label: "Arenas ao Vivo", icon: "arenas" },
  { href: "/admin/temporadas", label: "Temporadas", icon: "temporadas" },
  { href: "/admin/pecas", label: "Peças", icon: "pecas" },
  { href: "/admin/formatos", label: "Formatos", icon: "formatos" },
  {
    href: "/admin/configuracoes",
    label: "Configurações & Admins",
    icon: "config",
  },
];

const JUDGE_NAV_ITEMS: NavItem[] = [
  { href: "/admin/arenas", label: "Arenas ao Vivo", icon: "arenas" },
  { href: "/meu-painel", label: "Meu Painel", icon: "user" },
];

function renderNavIcon(icon: NavItem["icon"]) {
  switch (icon) {
    case "dashboard":
      return <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />;
    case "bladers":
      return <Users className="h-4 w-4 text-fire-orange shrink-0" />;
    case "torneios":
      return <Swords className="h-4 w-4 text-fire-yellow shrink-0" />;
    case "arenas":
      return <Radio className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "temporadas":
      return <CalendarRange className="h-4 w-4 text-primary shrink-0" />;
    case "pecas":
      return <Layers className="h-4 w-4 text-primary shrink-0" />;
    case "formatos":
      return <ShieldBan className="h-4 w-4 text-fire-orange shrink-0" />;
    case "config":
      return <Settings className="h-4 w-4 text-primary shrink-0" />;
    case "user":
      return <User className="h-4 w-4 text-primary shrink-0" />;
  }
}

export function AdminSidebarNav({ isAdmin }: AdminSidebarNavProps) {
  const pathname = usePathname();
  const [clickedState, setClickedState] = React.useState<{
    href: string;
    fromPath: string;
  } | null>(null);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const items = isAdmin ? ADMIN_NAV_ITEMS : JUDGE_NAV_ITEMS;

  return (
    <nav className="p-3 sm:p-4 flex flex-row md:flex-col gap-1 overflow-x-auto">
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        const isPending =
          clickedState !== null &&
          clickedState.href === item.href &&
          clickedState.fromPath === pathname &&
          !isActive;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (isActive) return;
              setClickedState({ href: item.href, fromPath: pathname });
              if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
              }
              timerRef.current = window.setTimeout(() => {
                setClickedState(null);
              }, 8000);
            }}
            className={`flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] shrink-0 ${
              isActive
                ? "bg-primary/15 text-primary border border-primary/30 shadow-xs"
                : "text-foreground border border-transparent hover:bg-muted"
            }`}
          >
            <span className="flex items-center gap-2.5">
              {renderNavIcon(item.icon)}
              <span>{item.label}</span>
            </span>
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
