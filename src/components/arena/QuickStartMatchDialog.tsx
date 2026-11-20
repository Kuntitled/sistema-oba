"use client";

import * as React from "react";
import { Swords, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createAndAssignMatchAction } from "@/app/admin/arena/actions";
import { POINTS_TO_WIN_MATCH } from "@/lib/constants";
import {
  MATCH_STAGE_LABELS,
  type Blader,
  type MatchStage,
} from "@/types/domain";

interface QuickStartMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arenaId: string;
  arenaName: string;
  tournamentId: string;
  bladers: Blader[];
  onStarted?: (matchId: string) => void;
}

export function QuickStartMatchDialog({
  open,
  onOpenChange,
  arenaId,
  arenaName,
  tournamentId,
  bladers,
  onStarted,
}: QuickStartMatchDialogProps) {
  const [player1Id, setPlayer1Id] = React.useState("");
  const [player2Id, setPlayer2Id] = React.useState("");
  const [stage, setStage] = React.useState<MatchStage>("swiss");
  const [round, setRound] = React.useState(1);
  const [targetScore, setTargetScore] = React.useState(POINTS_TO_WIN_MATCH);
  const [bracketLabel, setBracketLabel] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!player1Id || !player2Id) {
      setError("Selecione os dois Bladers para iniciar a partida.");
      return;
    }

    if (player1Id === player2Id) {
      setError("Os dois competidores precisam ser Bladers diferentes.");
      return;
    }

    setLoading(true);
    const result = await createAndAssignMatchAction({
      tournamentId,
      arenaId,
      player1Id,
      player2Id,
      stage,
      round,
      targetScore,
      bracketLabel: bracketLabel.trim() || null,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPlayer1Id("");
    setPlayer2Id("");
    setBracketLabel("");
    onOpenChange(false);
    if (result.matchId) {
      onStarted?.(result.matchId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Iniciar Partida — {arenaName}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {bladers.length < 2 ? (
          <div className="p-4 rounded-lg border border-border/60 bg-muted/30 text-xs text-muted-foreground">
            Cadastre pelo menos 2 Bladers ativos para iniciar uma partida.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="quick-p1" className="text-xs font-semibold text-primary">
                Blader 1 (Lado Roxo) *
              </Label>
              <select
                id="quick-p1"
                value={player1Id}
                onChange={(e) => setPlayer1Id(e.target.value)}
                required
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione o Blader 1...</option>
                {bladers.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.id === player2Id}>
                    {b.nickname} ({b.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-p2" className="text-xs font-semibold text-fire-orange">
                Blader 2 (Lado Fogo) *
              </Label>
              <select
                id="quick-p2"
                value={player2Id}
                onChange={(e) => setPlayer2Id(e.target.value)}
                required
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione o Blader 2...</option>
                {bladers.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.id === player1Id}>
                    {b.nickname} ({b.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="quick-stage" className="text-xs font-semibold">
                  Etapa
                </Label>
                <select
                  id="quick-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value as MatchStage)}
                  className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="swiss">{MATCH_STAGE_LABELS.swiss}</option>
                  <option value="top_cut">{MATCH_STAGE_LABELS.top_cut}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quick-round" className="text-xs font-semibold">
                  Rodada
                </Label>
                <Input
                  id="quick-round"
                  type="number"
                  min={1}
                  value={round}
                  onChange={(e) =>
                    setRound(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="h-9 text-xs text-center font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quick-target" className="text-xs font-semibold">
                  Meta (pts)
                </Label>
                <Input
                  id="quick-target"
                  type="number"
                  min={1}
                  max={10}
                  value={targetScore}
                  onChange={(e) =>
                    setTargetScore(
                      Math.max(1, parseInt(e.target.value, 10) || POINTS_TO_WIN_MATCH)
                    )
                  }
                  className="h-9 text-xs text-center font-bold"
                />
              </div>
            </div>

            {stage === "top_cut" && (
              <div className="space-y-1.5">
                <Label htmlFor="quick-label" className="text-xs font-semibold">
                  Fase da Chave (Opcional)
                </Label>
                <Input
                  id="quick-label"
                  value={bracketLabel}
                  onChange={(e) => setBracketLabel(e.target.value)}
                  placeholder="Ex: Quartas 1, Semifinal 1, Grande Final"
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Enviar para Arena
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
