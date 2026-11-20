import Link from "next/link";
import {
  Users,
  Swords,
  Trophy,
  Flame,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBladers, getTournaments, getRanking } from "@/lib/services/league";
import { TOURNAMENT_STATUS_LABELS } from "@/types/domain";

 // Sempre fresco no admin

export default async function AdminDashboardPage() {
  const [bladers, tournaments, ranking] = await Promise.all([
    getBladers(),
    getTournaments(),
    getRanking(),
  ]);

  const ongoingCount = tournaments.filter(
    (t) => t.status === "ongoing" || t.status === "open"
  ).length;
  const finishedCount = tournaments.filter((t) => t.status === "finished").length;
  const leader = ranking[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Dashboard de Gestão OBA
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Visão geral da liga e atalhos rápidos de administração.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/arenas">
            <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10">
              <Radio className="h-3.5 w-3.5" />
              Arenas ao Vivo
            </Button>
          </Link>
          <Link href="/admin/bladers">
            <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5 border-border/80">
              <Users className="h-3.5 w-3.5 text-fire-orange" />
              Novo Blader
            </Button>
          </Link>
          <Link href="/admin/torneios">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5">
              <Swords className="h-3.5 w-3.5" />
              Novo Torneio
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">Total de Bladers</span>
              <Users className="h-4 w-4 text-fire-orange" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {bladers.length}
            </div>
            <span className="text-[11px] text-muted-foreground">Cadastrados na liga</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">Torneios Ativos</span>
              <Flame className="h-4 w-4 text-fire-yellow" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-fire-orange">
              {ongoingCount}
            </div>
            <span className="text-[11px] text-muted-foreground">Em andamento ou abertos</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">Encerrados</span>
              <Swords className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {finishedCount}
            </div>
            <span className="text-[11px] text-muted-foreground">Com resultados lançados</span>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">Líder Atual</span>
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-foreground truncate">
              {leader ? leader.blader?.nickname : "—"}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {leader ? `${leader.total_points} pontos` : "Aguardando torneios"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Torneios Recentes e Bladers Recentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Torneios */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              Torneios
            </CardTitle>
            <Link
              href="/admin/torneios"
              className="text-xs text-primary font-semibold hover:underline"
            >
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            {tournaments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Nenhum torneio criado ainda.
              </p>
            ) : (
              tournaments.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border border-border/40 bg-background/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{t.name}</div>
                    <div className="text-muted-foreground text-[11px]">{t.event_date}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {TOURNAMENT_STATUS_LABELS[t.status]}
                    </Badge>
                    <Link href={`/admin/torneios/${t.id}/resultados`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-primary font-semibold text-[11px]">
                        Resultados
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Bladers */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-fire-orange" />
              Bladers Cadastrados
            </CardTitle>
            <Link
              href="/admin/bladers"
              className="text-xs text-primary font-semibold hover:underline"
            >
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            {bladers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Nenhum Blader cadastrado ainda.
              </p>
            ) : (
              bladers.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-lg border border-border/40 bg-background/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{b.nickname}</div>
                    <div className="text-muted-foreground text-[11px]">{b.name}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-primary">
                      {b.ranking?.total_points ?? 0} pts
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
