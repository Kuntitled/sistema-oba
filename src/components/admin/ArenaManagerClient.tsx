"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Radio,
  PlusCircle,
  Swords,
  Smartphone,
  Wrench,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  Trophy,
  Play,
  Unlock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuickStartMatchDialog } from "@/components/arena/QuickStartMatchDialog";
import {
  createArenaAction,
  deleteArenaAction,
  releaseArenaAction,
  updateArenaStatusAction,
} from "@/app/admin/arena/actions";
import { createClient } from "@/lib/supabase/client";
import { fetchArenasOverview } from "@/lib/services/arena-queries";
import {
  ARENA_STATUS_LABELS,
  MATCH_STAGE_LABELS,
  type Arena,
  type Blader,
  type Tournament,
} from "@/types/domain";

interface ArenaManagerClientProps {
  initialArenas: Arena[];
  tournaments: Tournament[];
  bladers: Blader[];
}

export function ArenaManagerClient({
  initialArenas,
  tournaments,
  bladers,
}: ArenaManagerClientProps) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [arenas, setArenas] = React.useState<Arena[]>(initialArenas);
  const [realtimeStatus, setRealtimeStatus] = React.useState<
    "connecting" | "live" | "error"
  >("connecting");

  const defaultTournamentFilter = React.useMemo(() => {
    const active = tournaments.find(
      (t) => t.status === "ongoing" || t.status === "open"
    );
    if (active && initialArenas.some((a) => a.tournament_id === active.id)) {
      return active.id;
    }
    return "all";
  }, [tournaments, initialArenas]);

  const [selectedTournamentId, setSelectedTournamentId] = React.useState<string>(
    defaultTournamentFilter
  );

  // Create Arena Dialog state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createLoading, setCreateLoading] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [newArenaTournamentId, setNewArenaTournamentId] = React.useState(() => {
    const active = tournaments.find(
      (t) => t.status === "ongoing" || t.status === "open"
    );
    return active?.id ?? tournaments[0]?.id ?? "";
  });

  // Quick-start match dialog state
  const [matchDialogArena, setMatchDialogArena] = React.useState<Arena | null>(
    null
  );
  const [busyArenaId, setBusyArenaId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const refreshArenas = React.useCallback(async () => {
    const res = await fetchArenasOverview(supabase);
    if (!res.schemaMissing) {
      setArenas(res.arenas);
    }
  }, [supabase]);

  React.useEffect(() => {
    const channel = supabase
      .channel("admin-arenas-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arenas" },
        () => {
          void refreshArenas();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          void refreshArenas();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("live");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
        } else {
          setRealtimeStatus("connecting");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, refreshArenas]);

  const filteredArenas = React.useMemo(() => {
    if (selectedTournamentId === "all") return arenas;
    return arenas.filter((a) => a.tournament_id === selectedTournamentId);
  }, [arenas, selectedTournamentId]);

  const handleCreateArena = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const result = await createArenaAction(formData);
    setCreateLoading(false);

    if (result.error) {
      setCreateError(result.error);
      return;
    }

    formElement.reset();
    setCreateOpen(false);
    if (
      selectedTournamentId !== "all" &&
      result.arena?.tournament_id &&
      selectedTournamentId !== result.arena.tournament_id
    ) {
      setSelectedTournamentId(result.arena.tournament_id);
    }
    await refreshArenas();
    router.refresh();
  };

  const handleToggleMaintenance = async (arena: Arena) => {
    setActionError(null);
    setBusyArenaId(arena.id);
    const nextStatus =
      arena.status === "maintenance" ? "available" : "maintenance";
    const res = await updateArenaStatusAction(arena.id, nextStatus);
    setBusyArenaId(null);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await refreshArenas();
  };

  const handleReleaseArena = async (arena: Arena) => {
    setActionError(null);
    setBusyArenaId(arena.id);
    const res = await releaseArenaAction(arena.id, {
      returnPendingIfUnfinished: true,
    });
    setBusyArenaId(null);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await refreshArenas();
  };

  const handleDeleteArena = async (arena: Arena) => {
    if (!confirm(`Deseja excluir a arena "${arena.name}"?`)) return;
    setActionError(null);
    setBusyArenaId(arena.id);
    const res = await deleteArenaAction(arena.id);
    setBusyArenaId(null);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await refreshArenas();
  };

  const statusBadge = (arena: Arena) => {
    if (arena.status === "in_match") {
      return (
        <Badge className="bg-fire-orange text-slate-950 font-bold text-[10px] gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-ping" />
          {ARENA_STATUS_LABELS.in_match}
        </Badge>
      );
    }
    if (arena.status === "maintenance") {
      return (
        <Badge
          variant="outline"
          className="text-[10px] border-amber-500/40 text-amber-500"
        >
          {ARENA_STATUS_LABELS.maintenance}
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-[10px] border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
      >
        {ARENA_STATUS_LABELS.available}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra superior: Filtro + Realtime + Criar Arena */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            aria-label="Filtrar por torneio"
            className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todos os Torneios ({arenas.length} arenas)</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 bg-card/60 text-[11px] font-semibold">
            <span
              className={`h-2 w-2 rounded-full ${
                realtimeStatus === "live"
                  ? "bg-emerald-500 animate-pulse"
                  : realtimeStatus === "error"
                    ? "bg-destructive"
                    : "bg-amber-500"
              }`}
            />
            <span className="text-muted-foreground">
              {realtimeStatus === "live"
                ? "Tempo Real Ativo"
                : realtimeStatus === "error"
                  ? "Reconectando..."
                  : "Conectando..."}
            </span>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5" />
            }
          >
            <PlusCircle className="h-4 w-4" />
            Nova Arena (Beystadium)
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                <Radio className="h-5 w-5 text-emerald-500" />
                Cadastrar Arena Física
              </DialogTitle>
            </DialogHeader>

            {createError && (
              <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {tournaments.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-2">
                <p>Crie um torneio antes de cadastrar as arenas do evento.</p>
                <Link href="/admin/torneios">
                  <Button size="sm" variant="outline" className="text-xs">
                    Ir para Torneios
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreateArena} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="arena-tournament" className="text-xs font-semibold">
                    Torneio *
                  </Label>
                  <select
                    id="arena-tournament"
                    name="tournament_id"
                    value={newArenaTournamentId}
                    onChange={(e) => setNewArenaTournamentId(e.target.value)}
                    required
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.event_date})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="arena-name" className="text-xs font-semibold">
                      Nome da Arena *
                    </Label>
                    <Input
                      id="arena-name"
                      name="name"
                      placeholder="Ex: Arena 1 — Xtreme Stadium"
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="arena-order" className="text-xs font-semibold">
                      Ordem
                    </Label>
                    <Input
                      id="arena-order"
                      name="display_order"
                      type="number"
                      min={1}
                      placeholder="Auto"
                      className="h-9 text-xs text-center"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateOpen(false)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
                  >
                    {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Cadastrar Arena
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Grid de Arenas */}
      {filteredArenas.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <Radio className="h-10 w-10 text-muted-foreground" />
            <h3 className="font-bold text-base text-foreground">
              Nenhuma arena cadastrada para este filtro
            </h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Cadastre os Beystadiums físicos do evento (ex: Arena 1, Arena 2) para operar o placar touch dos juízes em tempo real.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArenas.map((arena) => {
            const match = arena.current_match;
            const isBusy = busyArenaId === arena.id;

            return (
              <Card
                key={arena.id}
                className={`border-border/60 bg-card/70 transition-all ${
                  arena.status === "in_match"
                    ? "border-fire-orange/50 border-glow-fire"
                    : ""
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Topo do card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(arena)}
                        <span className="text-[11px] font-mono text-muted-foreground">
                          #{arena.display_order}
                        </span>
                      </div>
                      <h3 className="font-black text-base text-foreground mt-1.5 truncate">
                        {arena.name}
                      </h3>
                      {arena.tournament && (
                        <p className="text-xs text-muted-foreground truncate">
                          {arena.tournament.name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!match && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isBusy}
                          onClick={() => void handleToggleMaintenance(arena)}
                          title={
                            arena.status === "maintenance"
                              ? "Ativar arena"
                              : "Colocar em manutenção"
                          }
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          {arena.status === "maintenance" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Wrench className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isBusy || match?.status === "in_progress"}
                        onClick={() => void handleDeleteArena(arena)}
                        title="Excluir arena"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Estado da Partida Atual */}
                  {match ? (
                    <div className="p-3.5 rounded-xl border border-border/60 bg-background/60 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold">
                          {MATCH_STAGE_LABELS[match.stage]} • Rodada {match.round}
                          {match.bracket_label ? ` (${match.bracket_label})` : ""}
                        </span>
                        <span className="font-bold">
                          Meta: {match.target_score} pts
                        </span>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                        <div className="text-left min-w-0">
                          <div className="font-black text-sm text-primary truncate">
                            {match.player1?.nickname ?? "Blader 1"}
                          </div>
                        </div>

                        <div className="px-3 py-1 rounded-lg bg-muted/60 font-black text-lg tabular-nums tracking-tight">
                          {match.player1_score} <span className="text-muted-foreground">×</span>{" "}
                          {match.player2_score}
                        </div>

                        <div className="text-right min-w-0">
                          <div className="font-black text-sm text-fire-orange truncate">
                            {match.player2?.nickname ?? "Blader 2"}
                          </div>
                        </div>
                      </div>

                      {match.status === "finished" && (
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40 text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-amber-500">
                            <Trophy className="h-3.5 w-3.5" />
                            Vencedor: {match.winner?.nickname ?? "Definido"}
                          </span>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => void handleReleaseArena(arena)}
                            className="gap-1 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                          >
                            <Unlock className="h-3 w-3" />
                            Liberar Arena
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-dashed border-border/50 bg-background/30 text-xs text-muted-foreground flex items-center justify-between gap-2">
                      <span>
                        {arena.status === "maintenance"
                          ? "Arena em manutenção."
                          : "Beystadium livre para a próxima batalha."}
                      </span>
                      <Swords className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Link href={`/admin/arena/${arena.id}`} className="flex-1 min-w-[160px]">
                      <Button className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shadow-sm">
                        <Smartphone className="h-3.5 w-3.5" />
                        Abrir Placar do Juiz
                      </Button>
                    </Link>

                    {!match && arena.status === "available" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMatchDialogArena(arena)}
                        className="h-9 text-xs font-semibold gap-1.5 border-border/80"
                      >
                        <Play className="h-3.5 w-3.5 text-fire-orange" />
                        Iniciar Partida
                      </Button>
                    )}

                    {match && match.status === "in_progress" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void handleReleaseArena(arena)}
                        className="h-9 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Devolver à Fila
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {matchDialogArena && (
        <QuickStartMatchDialog
          open={Boolean(matchDialogArena)}
          onOpenChange={(open) => {
            if (!open) setMatchDialogArena(null);
          }}
          arenaId={matchDialogArena.id}
          arenaName={matchDialogArena.name}
          tournamentId={matchDialogArena.tournament_id}
          bladers={bladers}
          onStarted={() => {
            void refreshArenas();
          }}
        />
      )}
    </div>
  );
}
