import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Swords,
  Radio,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* ─── Sidebar Desktop / Topbar Mobile ────────────────── */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/50 bg-card/60 backdrop-blur-md flex flex-col justify-between shrink-0">
        <div>
          {/* Header da Sidebar */}
          <div className="p-4 sm:p-6 flex items-center justify-between md:justify-start gap-3 border-b border-border/40">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 rounded-full overflow-hidden border border-primary/50 shadow-sm">
                <Image
                  src="/images/logo.jpg"
                  alt="Logo OBA"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <span className="font-black text-sm tracking-wide text-foreground">
                  ADMIN <span className="text-fire-gradient">OBA</span>
                </span>
                <span className="block text-[10px] text-muted-foreground font-medium">
                  Painel de Gestão
                </span>
              </div>
            </Link>

            <div className="flex md:hidden items-center gap-1.5">
              <ThemeToggle />
              <Link
                href="/"
                title="Ver Vitrine Pública"
                aria-label="Ver Vitrine Pública"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  title="Sair do Painel"
                  aria-label="Sair do Painel"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>

          {/* Navegação */}
          <nav className="p-3 sm:p-4 flex flex-row md:flex-col gap-1 overflow-x-auto">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/admin/bladers"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Users className="h-4 w-4 text-fire-orange" />
              <span>Bladers</span>
            </Link>

            <Link
              href="/admin/torneios"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Swords className="h-4 w-4 text-fire-yellow" />
              <span>Torneios</span>
            </Link>

            <Link
              href="/admin/arenas"
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Radio className="h-4 w-4 text-emerald-500" />
              <span>Arenas ao Vivo</span>
            </Link>
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-border/40 hidden md:flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              Tema
            </span>
            <ThemeToggle />
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Ver Vitrine Pública</span>
          </Link>

          <form action={logoutAction} className="pt-2">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair do Painel</span>
            </Button>
          </form>
        </div>
      </aside>

      {/* ─── Conteúdo Principal ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
