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
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBladerAction } from "@/app/admin/actions";

export function BladerForm() {
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

    const formData = new FormData(e.currentTarget);
    const result = await createBladerAction(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        router.refresh();
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
        Cadastrar Blader
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border/80">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground">
            Novo Blader na Liga OBA
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
            <span>Blader cadastrado com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nickname" className="text-xs font-semibold">
                Apelido / Nickname *
              </Label>
              <Input
                id="nickname"
                name="nickname"
                placeholder="Ex: RyuBX"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">
                Nome Completo *
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Ryu Costa"
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs font-semibold">
                Cidade (Amazonas)
              </Label>
              <Input
                id="city"
                name="city"
                defaultValue="Manaus"
                placeholder="Ex: Manaus, Parintins..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatar_url" className="text-xs font-semibold">
                URL da Foto/Avatar
              </Label>
              <Input
                id="avatar_url"
                name="avatar_url"
                placeholder="https://..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-semibold">
              Bio / Estilo de Jogo (Opcional)
            </Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Ex: Especialista em combos de ataque e Xtreme Finish."
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
              Salvar Blader
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
