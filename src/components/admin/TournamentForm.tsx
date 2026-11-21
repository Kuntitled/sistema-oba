"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTournamentAction } from "@/app/admin/actions";
import { DEFAULT_SWISS_ROUNDS } from "@/lib/constants";
import type {
  RulesetRow,
  TournamentCategory,
  TournamentFormat,
} from "@/types/domain";

export function TournamentForm({
  rulesets = [],
}: {
  rulesets?: RulesetRow[];
}) {
  const router = useRouter();
  const defaultRulesetId = React.useMemo(() => {
    const livre = rulesets.find((r) => r.name.toLowerCase() === "livre");
    return livre?.id ?? rulesets[0]?.id ?? "";
  }, [rulesets]);

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [category, setCategory] = React.useState<TournamentCategory>("semanal");
  const [format, setFormat] = React.useState<TournamentFormat>("swiss_only");
  const [rulesetId, setRulesetId] = React.useState<string>(defaultRulesetId);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setCategory("semanal");
      setFormat("swiss_only");
      setRulesetId(defaultRulesetId);
      setError(null);
      setSuccess(false);
    }
  };

  const handleCategoryChange = (nextCategory: TournamentCategory) => {
    setCategory(nextCategory);
    setFormat(nextCategory === "oficial" ? "swiss_top_cut" : "swiss_only");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const status = formData.get("status") as string;
    const result = await createTournamentAction(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        if (result.tournament?.id && status === "finished") {
          router.push(`/admin/torneios/${result.tournament.id}/resultados`);
        } else if (
          result.tournament?.id &&
          (status === "ongoing" || status === "open")
        ) {
          router.push(`/admin/torneios/${result.tournament.id}/chaveamento`);
        } else {
          router.refresh();
        }
      }, 900);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
      >
        <PlusCircle className="h-4 w-4" />
        Novo Torneio (Atual ou Retroativo)
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md bg-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <span>Criar Torneio OBA</span>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Torneio criado! Redirecionando...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              Nome da Etapa / Torneio *
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: OBA Semanal #12 — Manaus"
              required
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event_date" className="text-xs font-semibold">
                Data do Torneio *
              </Label>
              <Input
                id="event_date"
                name="event_date"
                type="date"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold">
                Situação do Torneio
              </Label>
              <select
                id="status"
                name="status"
                defaultValue="open"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="open">🟢 Inscrições Abertas (Ao Vivo)</option>
                <option value="ongoing">🔥 Em Andamento (Ao Vivo)</option>
                <option value="finished">🏆 Encerrado (Retroativo)</option>
                <option value="draft">📝 Rascunho</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold">
                Categoria (Peso do Pódio)
              </Label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) =>
                  handleCategoryChange(e.target.value as TournamentCategory)
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="semanal">Semanal (100 / 75 / 50)</option>
                <option value="oficial">Oficial (200 / 150 / 100)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="format" className="text-xs font-semibold">
                Formato OBA
              </Label>
              <select
                id="format"
                name="format"
                value={format}
                onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="swiss_only">Exclusivamente Suíço</option>
                <option value="swiss_top_cut">Suíço + Top Cut (+15 Líder)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="swiss_rounds" className="text-xs font-semibold">
                Rodadas Suíço
              </Label>
              <Input
                id="swiss_rounds"
                name="swiss_rounds"
                type="number"
                min={1}
                max={10}
                defaultValue={DEFAULT_SWISS_ROUNDS}
                className="h-9 text-xs text-center font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="max_players" className="text-xs font-semibold">
                Vagas (Opc.)
              </Label>
              <Input
                id="max_players"
                name="max_players"
                type="number"
                min={2}
                max={128}
                placeholder="Livre"
                className="h-9 text-xs text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-semibold">
                Local
              </Label>
              <Input
                id="location"
                name="location"
                placeholder="Ex: Shopping Amazonas"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {rulesets.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="ruleset_id" className="text-xs font-semibold">
                Formato / Ban-list (Regras)
              </Label>
              <select
                id="ruleset_id"
                name="ruleset_id"
                value={rulesetId}
                onChange={(e) => setRulesetId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Sem formato definido</option>
                {rulesets.map((rs) => (
                  <option key={rs.id} value={rs.id}>
                    {rs.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold">
              Observações / Regulamento (Opcional)
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Informações adicionais sobre esta etapa..."
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || success}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar Torneio
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
