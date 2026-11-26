"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  PlusCircle,
  CheckCircle2,
  ExternalLink,
  Trophy,
  Swords,
  Users,
  Loader2,
  AlertCircle,
  Sparkles,
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
} from "@/components/ui/dialog";
import {
  activateSeasonAction,
  createSeasonAction,
} from "@/app/admin/torneios/engine-actions";
import { useToast } from "@/components/ui/toast-provider";
import type { SeasonWithStats } from "@/lib/services/league";

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function SeasonManagerClient({
  initialSeasons,
}: {
  initialSeasons: SeasonWithStats[];
}) {
  const router = useRouter();
  const toast = useToast();

  const suggestedYear = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (initialSeasons.length === 0) return currentYear;
    const maxYear = Math.max(...initialSeasons.map((s) => s.year));
    const existingYears = new Set(initialSeasons.map((s) => s.year));
    if (!existingYears.has(currentYear)) return currentYear;
    return maxYear + 1;
  }, [initialSeasons]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [yearInput, setYearInput] = React.useState(String(suggestedYear));
  const [nameInput, setNameInput] = React.useState(
    `Temporada ${suggestedYear}`
  );
  const [makeActive, setMakeActive] = React.useState(false);
  const [createLoading, setCreateLoading] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const [activatingId, setActivatingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const handleOpenCreate = (nextOpen: boolean) => {
    setCreateOpen(nextOpen);
    if (nextOpen) {
      setYearInput(String(suggestedYear));
      setNameInput(`Temporada ${suggestedYear}`);
      setMakeActive(initialSeasons.length === 0);
      setCreateError(null);
    }
  };

  const handleYearChange = (val: string) => {
    const prevAutoName = `Temporada ${yearInput}`;
    setYearInput(val);
    if (!nameInput || nameInput === prevAutoName) {
      setNameInput(val ? `Temporada ${val}` : "");
    }
  };

  const handleCreateSeason = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setActionError(null);
    setActionSuccess(null);

    const formData = new FormData();
    formData.set("year", yearInput);
    formData.set("name", nameInput);
    formData.set("is_active", makeActive ? "true" : "false");

    const res = await createSeasonAction(formData);
    setCreateLoading(false);

    if (res.error) {
      setCreateError(res.error);
      toast.error(res.error);
      return;
    }

    setCreateOpen(false);
    const createdMsg = `Temporada "${res.season?.name ?? nameInput}" criada com sucesso!`;
    setActionSuccess(createdMsg);
    toast.success(createdMsg);
    router.refresh();
  };

  const handleActivateSeason = async (season: SeasonWithStats) => {
    if (
      !window.confirm(
        `Definir "${season.name}" como a temporada ativa? O histórico das temporadas anteriores será preservado para consulta e o ranking principal passará a exibir ${season.name}.`
      )
    ) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setActivatingId(season.id);
    const res = await activateSeasonAction(season.id);
    setActivatingId(null);

    if (res.error) {
      setActionError(res.error);
      toast.error(res.error);
      return;
    }

    const msg = `${season.name} agora é a temporada ativa da liga OBA.`;
    setActionSuccess(msg);
    toast.success(msg);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-primary" />
            Gestão de Temporadas Anuais
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Controle os ciclos anuais do ranking oficial da OBA. Ao iniciar um
            novo ano, a temporada anterior permanece salva no histórico público.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => handleOpenCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          Nova Temporada
        </Button>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Lista de Temporadas */}
      {initialSeasons.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <CalendarRange className="h-10 w-10 text-muted-foreground" />
            <h3 className="font-bold text-base text-foreground">
              Nenhuma temporada cadastrada
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Crie a primeira temporada anual para organizar torneios e pontuações.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialSeasons.map((season) => (
            <Card
              key={season.id}
              className={`border-border/60 bg-card/70 ${
                season.is_active ? "border-emerald-500/50 shadow-sm" : ""
              }`}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {season.is_active ? (
                        <Badge className="bg-emerald-600/20 text-emerald-500 border-emerald-500/40 text-[10px] font-bold gap-1">
                          <Sparkles className="h-3 w-3" />
                          Temporada Ativa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground"
                        >
                          Histórico / Inativa
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        Ano {season.year}
                      </Badge>
                    </div>

                    <h2 className="text-lg font-black text-foreground truncate">
                      {season.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Vigência: {formatShortDate(season.starts_at)} até{" "}
                      {formatShortDate(season.ends_at)}
                    </p>
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs">
                  <div className="rounded-lg bg-background/50 border border-border/40 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Swords className="h-3 w-3 text-primary" />
                      Torneios
                    </div>
                    <div className="text-base font-black text-foreground mt-0.5 tabular-nums">
                      {season.tournamentsCount}
                    </div>
                  </div>

                  <div className="rounded-lg bg-background/50 border border-border/40 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Trophy className="h-3 w-3 text-fire-yellow" />
                      Encerrados
                    </div>
                    <div className="text-base font-black text-foreground mt-0.5 tabular-nums">
                      {season.finishedTournamentsCount}
                    </div>
                  </div>

                  <div className="rounded-lg bg-background/50 border border-border/40 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3 text-fire-orange" />
                      Pontuando
                    </div>
                    <div className="text-base font-black text-foreground mt-0.5 tabular-nums">
                      {season.rankedBladersCount}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Link href={`/?season=${season.year}`} target="_blank">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver Ranking
                    </Button>
                  </Link>

                  {!season.is_active && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={activatingId !== null}
                      onClick={() => void handleActivateSeason(season)}
                      className="h-8 bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold text-xs gap-1.5"
                    >
                      {activatingId === season.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Ativar Temporada
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Nova Temporada */}
      <Dialog open={createOpen} onOpenChange={handleOpenCreate}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              Criar Nova Temporada
            </DialogTitle>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreateSeason} className="space-y-4 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="season-year" className="text-xs font-semibold">
                  Ano *
                </Label>
                <Input
                  id="season-year"
                  type="number"
                  min={2020}
                  max={2100}
                  value={yearInput}
                  onChange={(e) => handleYearChange(e.target.value)}
                  required
                  className="h-9 text-xs font-bold text-center"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="season-name" className="text-xs font-semibold">
                  Nome da Temporada *
                </Label>
                <Input
                  id="season-name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ex: Temporada 2027"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/50 p-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={makeActive}
                onChange={(e) => setMakeActive(e.target.checked)}
                className="accent-primary mt-0.5"
              />
              <div>
                <div className="font-bold text-foreground">
                  Definir como temporada ativa no ranking público
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Inicia o ranking do ano zerado mantendo as temporadas
                  anteriores salvas para consulta no seletor histórico.
                </div>
              </div>
            </label>

            <div className="pt-1 flex items-center justify-end gap-2">
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
                Salvar Temporada
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
