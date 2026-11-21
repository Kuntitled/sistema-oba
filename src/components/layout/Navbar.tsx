"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Trophy,
  Swords,
  Users,
  ShieldCheck,
  Menu,
  Flame,
  User,
  LogIn,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { ThemeToggle } from "./ThemeToggle";

export interface NavbarUserInfo {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isJudge: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Ranking", href: "/", icon: <Trophy className="h-4 w-4" /> },
  { label: "Torneios", href: "/torneios", icon: <Swords className="h-4 w-4" /> },
  { label: "Bladers", href: "/bladers", icon: <Users className="h-4 w-4" /> },
];

export function Navbar({ user = null }: { user?: NavbarUserInfo | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-primary/60 shadow-md group-hover:scale-105 transition-transform duration-200">
            <Image
              src="/images/logo.jpg"
              alt="Logo OBA — Organização de Beyblade do Amazonas"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-black tracking-wider text-base sm:text-lg">
              <span className="text-fire-gradient">OBA</span>
              <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 ml-1">
                <Flame className="h-2.5 w-2.5 text-fire-orange animate-pulse" />
                BX AM
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:inline -mt-0.5 font-medium">
              Organização de Beyblade do Amazonas
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-md transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/meu-painel">
                <Button
                  size="sm"
                  variant={pathname.startsWith("/meu-painel") ? "default" : "outline"}
                  className="border-primary/40 hover:border-primary text-xs font-semibold gap-2"
                >
                  <BladerAvatar
                    avatarUrl={user.avatarUrl}
                    nickname={user.nickname}
                    sizeClass="h-5 w-5"
                    textClass="text-[9px] font-black text-primary"
                    borderClass="border border-primary/40"
                  />
                  <span>Meu Painel</span>
                </Button>
              </Link>
              {user.isAdmin && (
                <Link href="/admin">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border/80 hover:border-primary hover:bg-primary/10 text-foreground font-semibold text-xs gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Admin
                  </Button>
                </Link>
              )}
              {!user.isAdmin && user.isJudge && (
                <Link href="/admin/arenas">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-foreground font-semibold text-xs gap-1.5"
                  >
                    <Radio className="h-3.5 w-3.5 text-emerald-500" />
                    Arenas (Juiz)
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <Link href="/auth/login">
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 hover:border-primary hover:bg-primary/10 text-foreground font-semibold text-xs gap-1.5"
              >
                <LogIn className="h-3.5 w-3.5 text-primary" />
                Entrar
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Actions & Menu */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="h-9 w-9 text-foreground touch-manipulation"
            aria-label="Abrir menu de navegação"
            aria-expanded={isOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent
              side="right"
              className="w-72 max-w-[85vw] bg-card border-l border-border/60 p-6 flex flex-col justify-between"
            >
              <div>
                <SheetHeader className="text-left pb-6 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/40">
                      <Image
                        src="/images/logo.jpg"
                        alt="Logo OBA"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <SheetTitle className="text-base font-black tracking-wide">
                        <span className="text-fire-gradient">OBA</span>
                      </SheetTitle>
                      <p className="text-xs text-muted-foreground">
                        Organização de Beyblade do Amazonas
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                <nav className="flex flex-col gap-2 mt-6">
                  {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                          active
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    );
                  })}

                  {user && (
                    <Link
                      href="/meu-painel"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                        isActive("/meu-painel")
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      Meu Painel
                    </Link>
                  )}
                </nav>
              </div>

              {/* Mobile Bottom Footer in Drawer */}
              <div className="pt-6 border-t border-border/40 flex flex-col gap-3">
                {user ? (
                  <>
                    <Link
                      href="/meu-painel"
                      onClick={() => setIsOpen(false)}
                      className="w-full"
                    >
                      <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2">
                        <User className="h-4 w-4" />
                        Meu Painel ({user.nickname})
                      </Button>
                    </Link>
                    {user.isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="w-full"
                      >
                        <Button
                          variant="outline"
                          className="w-full font-semibold gap-2 border-border/80"
                        >
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Área Administrativa
                        </Button>
                      </Link>
                    )}
                    {!user.isAdmin && user.isJudge && (
                      <Link
                        href="/admin/arenas"
                        onClick={() => setIsOpen(false)}
                        className="w-full"
                      >
                        <Button
                          variant="outline"
                          className="w-full font-semibold gap-2 border-emerald-500/40"
                        >
                          <Radio className="h-4 w-4 text-emerald-500" />
                          Arenas (Juiz)
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full"
                  >
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2">
                      <LogIn className="h-4 w-4" />
                      Entrar / Painel do Blader
                    </Button>
                  </Link>
                )}
                <p className="text-[11px] text-center text-muted-foreground">
                  Sistema Oficial OBA • 2026
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
