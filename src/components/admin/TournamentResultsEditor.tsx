"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { saveTournamentResultsAction } from "@/app/admin/actions";
import {
  calculateOfficialTournamentPoints,
  normalizeTournamentCategory,
  OBA_PODIUM_POINTS,
  OBA_SWISS_LEADER_BONUS,
  OBA_SWISS_WIN_POINTS,
  type ObaTournamentCategory,
} from "@/lib/constants";
import {
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  type Blader,
  type Tournament,
} from "@/types/domain";

interface ResultRow {
  blader_id: string;
  final_position: number;
  swiss_wins: number;
  is_swiss_leader: boolean;
  points_earned: number;
}

interface ExistingResultInput {
  blader_id: string;
  final_position: number;
  swiss_wins?: number;
  is_swiss_leader?: boolean;
  points_earned: number;
}

interface TournamentResultsEditorProps {
  tournament: Tournament;
  bladers: Blader[];
  existingResults: ExistingResultInput[];
}

export function TournamentResultsEditor({
  tournament,
  bladers,
  existingResults,
}: TournamentResultsEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const category: ObaTournamentCategory = normalizeTournamentCategory(
    tournament.category
  );
  const isFriendly = category === "amistoso";
  const supportsSwissLeaderBonus =
    !isFriendly && tournament.format !== "swiss_only";

  const computeSuggested = React.useCallback(
    (finalPosition: number, swissWins: number, isSwissLeader: boolean) => {
      return calculateOfficialTournamentPoints({
        category,
        format: tournament.format,
        finalPosition,
        swissWins,
        isSwissLeader,
      }).totalPoints;
    },
    [category, tournament.format]
  );

  const [rows, setRows] = React.useState<ResultRow[]>(() => {
    if (existingResults.length > 0) {
      return existingResults.map((r) => ({
        blader_id: r.blader_id,
        final_position: r.final_position,
        swiss_wins: r.swiss_wins ?? 0,
        is_swiss_leader: !isFriendly && Boolean(r.is_swiss_leader),
        points_earned: isFriendly ? 0 : r.points_earned,
      }));
    }
    return [1, 2, 3].map((pos) => ({
      blader_id: "",
      final_position: pos,
      swiss_wins: 0,
      is_swiss_leader: pos === 1 && supportsSwissLeaderBonus,
      points_earned: OBA_PODIUM_POINTS[category][pos] ?? 0,
    }));
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const addRow = () => {
    const nextPos = rows.length + 1;
    setRows([
      ...rows,
      {
        blader_id: "",
        final_position: nextPos,
        swiss_wins: 0,
        is_swiss_leader: false,
        points_earned: computeSuggested(nextPos, 0, false),
      },
    ]);
  };

  const removeRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    const reindexed = updated.map((r, i) => {
      const pos = i + 1;
      return {
        ...r,
        final_position: pos,
        points_earned: computeSuggested(
          pos,
          r.swiss_wins,
          supportsSwissLeaderBonus && r.is_swiss_leader
        ),
      };
    });
    setRows(reindexed);
  };

  const updateRowField = <K extends keyof ResultRow>(
    index: number,
    field: K,
    value: ResultRow[K]
  ) => {
    const updated = rows.map((row, idx) => {
      if (idx === index) {
        const nextRow: ResultRow = { ...row, [field]: value };
        if (
          field === "final_position" ||
          field === "swiss_wins" ||
          field === "is_swiss_leader"
        ) {
          nextRow.points_earned = computeSuggested(
            nextRow.final_position,
            nextRow.swiss_wins,
            supportsSwissLeaderBonus && nextRow.is_swiss_leader
          );
        }
        return nextRow;
      }

      if (field === "is_swiss_leader" && value === true) {
        const cleared: ResultRow = { ...row, is_swiss_leader: false };
        cleared.points_earned = computeSuggested(
          cleared.final_position,
          cleared.swiss_wins,
          false
        );
        return cleared;
      }

      return row;
    });

    setRows(updated);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].blader_id) {
        setError(
          `A linha da ${rows[i].final_position}ª posição precisa ter um Blader selecionado.`
        );
        return;
      }
    }

    const bladerIds = rows.map((r) => r.blader_id);
    if (new Set(bladerIds).size !== bladerIds.length) {
      setError("O mesmo Blader não pode ser selecionado em mais de uma posição.");
      return;
    }

    setLoading(true);
    const result = await saveTournamentResultsAction(tournament.id, rows);

    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      toast.success(
        isFriendly
          ? "Resultados do amistoso salvos!"
          : "Resultados salvos e ranking recalculado!"
      );
      setTimeout(() => {
        router.push("/admin/torneios");
        router.refresh();
      }, 1400);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            {isFriendly
              ? "Resultados do torneio amistoso salvos com sucesso (sem impacto no ranking oficial)."
              : "Resultados salvos com sucesso! O ranking da temporada foi recalculado."}
          </span>
        </div>
      )}

      {/* Regra Oficial OBA aplicada */}
      <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5">
        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          {isFriendly ? (
            <>
              Modalidade aplicada:{" "}
              <strong className="text-sky-400">
                {TOURNAMENT_CATEGORY_LABELS.amistoso}
              </strong>{" "}
              •{" "}
              <strong className="text-foreground">
                {TOURNAMENT_FORMAT_LABELS[tournament.format]}
              </strong>{" "}
              • As colocações e vitórias no Suíço ficam registradas apenas para histórico do evento (0 pontos, 0 vitórias e 0 pódios no ranking oficial).
            </>
          ) : (
            <>
              Regra aplicada:{" "}
              <strong className="text-foreground">
                {TOURNAMENT_CATEGORY_LABELS[category]}
              </strong>{" "}
              (1º = {OBA_PODIUM_POINTS[category][1]} pts, 2º ={" "}
              {OBA_PODIUM_POINTS[category][2]} pts, 3º ={" "}
              {OBA_PODIUM_POINTS[category][3]} pts) •{" "}
              <strong className="text-foreground">
                {TOURNAMENT_FORMAT_LABELS[tournament.format]}
              </strong>{" "}
              • +{OBA_SWISS_WIN_POINTS} pts por vitória no Suíço
              {supportsSwissLeaderBonus
                ? ` • +${OBA_SWISS_LEADER_BONUS} pts para o Líder da fase Suíça`
                : " (sem bônus de liderança)"}
              .
            </>
          )}
        </p>
      </div>

      {/* Tabela de Linhas */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between gap-2">
            <span>Posições Finais e Pontuação OBA</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="text-xs gap-1 border-border/80"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Colocação
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 pt-0 space-y-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-border/50 bg-background/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <span className="font-black text-sm text-foreground w-8 text-center bg-muted/60 py-1 rounded shrink-0">
                  {row.final_position}º
                </span>

                <select
                  value={row.blader_id}
                  onChange={(e) =>
                    updateRowField(index, "blader_id", e.target.value)
                  }
                  className="flex-1 lg:w-64 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecione o Blader...</option>
                  {bladers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nickname} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Vit. Suíço:
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={15}
                    value={row.swiss_wins}
                    onChange={(e) =>
                      updateRowField(
                        index,
                        "swiss_wins",
                        Math.max(0, parseInt(e.target.value, 10) || 0)
                      )
                    }
                    className="w-16 h-8 text-xs text-center font-bold"
                  />
                </div>

                {supportsSwissLeaderBonus && (
                  <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-border/60 bg-card/60 cursor-pointer text-[11px] font-semibold">
                    <input
                      type="checkbox"
                      checked={row.is_swiss_leader}
                      onChange={(e) =>
                        updateRowField(
                          index,
                          "is_swiss_leader",
                          e.target.checked
                        )
                      }
                      className="accent-primary"
                    />
                    <Crown className="h-3.5 w-3.5 text-fire-yellow" />
                    <span>Líder Suíço (+{OBA_SWISS_LEADER_BONUS})</span>
                  </label>
                )}

                {isFriendly ? (
                  <div className="px-2.5 h-8 rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-400 text-[11px] font-bold flex items-center whitespace-nowrap">
                    0 pts (Amistoso)
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
                      Total Pts:
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.points_earned}
                      onChange={(e) =>
                        updateRowField(
                          index,
                          "points_earned",
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        )
                      }
                      className="w-20 h-8 text-xs text-center font-black text-primary"
                    />
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(index)}
                  disabled={rows.length <= 1}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/torneios")}
          className="text-xs"
        >
          Voltar
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          disabled={loading || success}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 px-5 h-9 shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Gravando e Recalculando...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              {isFriendly ? "Salvar Resultados (Sem Ranking)" : "Salvar Resultados e Atualizar Ranking"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
