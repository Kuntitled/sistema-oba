"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Loader2, CheckCircle2, AlertCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTournamentAction } from "@/app/admin/actions";

export function TournamentForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

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
        // Se for um torneio retroativo/encerrado, vai direto para a tela de lançamento de resultados
        if (result.tournament?.id && status === "finished") {
          router.push(`/admin/torneios/${result.tournament.id}/resultados`);
        } else {
          router.refresh();
        }
      }, 1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5" />
        }
      >
        <PlusCircle className="h-4 w-4" />
        Novo Torneio (Atual ou Retroativo)
      </DialogTrigger>
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
            <span>Torneio criado! Redirecionando para lançar resultados...</span>
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
              placeholder="Ex: OBA Cup #1 — Abertura"
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
                defaultValue="finished"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="finished">🏆 Encerrado (Torneio Retroativo)</option>
                <option value="open">🟢 Inscrições Abertas</option>
                <option value="ongoing">🔥 Em Andamento</option>
                <option value="draft">📝 Rascunho</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="format" className="text-xs font-semibold">
                Formato
              </Label>
              <select
                id="format"
                name="format"
                defaultValue="swiss"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="swiss">Sistema Suíço</option>
                <option value="single_elim">Mata-mata Simples</option>
                <option value="double_elim">Mata-mata Duplo</option>
              </select>
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
  );
}
