"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveTournamentResultsAction } from "@/app/admin/actions";
import { RANKING_POINTS_BY_POSITION, DEFAULT_RANKING_POINTS } from "@/lib/constants";
import type { Blader, Tournament } from "@/types/domain";

interface ResultRow {
  blader_id: string;
  final_position: number;
  points_earned: number;
}

interface TournamentResultsEditorProps {
  tournament: Tournament;
  bladers: Blader[];
  existingResults: ResultRow[];
}

export function TournamentResultsEditor({
  tournament,
  bladers,
  existingResults,
}: TournamentResultsEditorProps) {
  const router = useRouter();

  // Se já existirem resultados, inicializa com eles; senão, inicializa com as 3 primeiras posições
  const [rows, setRows] = React.useState<ResultRow[]>(() => {
    if (existingResults.length > 0) {
      return existingResults;
    }
    return [
      { blader_id: "", final_position: 1, points_earned: RANKING_POINTS_BY_POSITION[1] },
      { blader_id: "", final_position: 2, points_earned: RANKING_POINTS_BY_POSITION[2] },
      { blader_id: "", final_position: 3, points_earned: RANKING_POINTS_BY_POSITION[3] },
    ];
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Adiciona nova linha de resultado
  const addRow = () => {
    const nextPos = rows.length + 1;
    const defaultPts =
      RANKING_POINTS_BY_POSITION[nextPos] ?? DEFAULT_RANKING_POINTS;
    setRows([
      ...rows,
      {
        blader_id: "",
        final_position: nextPos,
        points_earned: defaultPts,
      },
    ]);
  };

  // Remove linha de resultado
  const removeRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    // Reajusta posições sequenciais
    const reindexed = updated.map((r, i) => ({
      ...r,
      final_position: i + 1,
      points_earned:
        RANKING_POINTS_BY_POSITION[i + 1] ?? DEFAULT_RANKING_POINTS,
    }));
    setRows(reindexed);
  };

  const updateRow = (index: number, field: keyof ResultRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };

    // Se mudou a posição e o usuário ainda não alterou pontos manualmente, sugere pontuação padrão
    if (field === "final_position") {
      const pos = parseInt(value, 10);
      if (!isNaN(pos)) {
        updated[index].points_earned =
          RANKING_POINTS_BY_POSITION[pos] ?? DEFAULT_RANKING_POINTS;
      }
    }

    setRows(updated);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    // Validações
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].blader_id) {
        setError(`A linha da ${rows[i].final_position}ª posição precisa ter um Blader selecionado.`);
        return;
      }
    }

    // Verifica duplicatas de blader
    const bladerIds = rows.map((r) => r.blader_id);
    const hasDuplicates = new Set(bladerIds).size !== bladerIds.length;
    if (hasDuplicates) {
      setError("O mesmo Blader não pode ser selecionado em mais de uma posição.");
      return;
    }

    setLoading(true);

    const result = await saveTournamentResultsAction(tournament.id, rows);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/admin/torneios");
        router.refresh();
      }, 1500);
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
            Resultados salvos com sucesso! O ranking geral da liga foi recalculado.
          </span>
        </div>
      )}

      {/* Regra de Pontuação Rápida */}
      <div className="p-3.5 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5">
        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          Os pontos são sugeridos automaticamente pela tabela oficial (1º = 100pts, 2º = 75pts, 3º = 60pts, 4º = 50pts...). Você pode editar os pontos manualmente se necessário.
        </p>
      </div>

      {/* Tabela de Linhas */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Posições Finais dos Bladers</span>
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
              className="p-3 rounded-lg border border-border/50 bg-background/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            >
              {/* Posição */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="font-black text-sm text-foreground w-8 text-center bg-muted/60 py-1 rounded">
                  {row.final_position}º
                </span>

                {/* Seleção de Blader */}
                <select
                  value={row.blader_id}
                  onChange={(e) =>
                    updateRow(index, "blader_id", e.target.value)
                  }
                  className="flex-1 sm:w-64 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecione o Blader...</option>
                  {bladers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nickname} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pontos + Remover */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Pontos:
                  </Label>
                  <Input
                    type="number"
                    value={row.points_earned}
                    onChange={(e) =>
                      updateRow(
                        index,
                        "points_earned",
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    className="w-20 h-8 text-xs text-center font-bold"
                  />
                </div>

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

      {/* Botões de Ação */}
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
              Salvar Resultados e Atualizar Ranking
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
