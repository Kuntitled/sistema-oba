"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
import { updateBladerAction } from "@/app/admin/actions";
import type { BladerRow } from "@/types/domain";

export function EditBladerButton({ blader }: { blader: BladerRow }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [nickname, setNickname] = React.useState(blader.nickname);
  const [name, setName] = React.useState(blader.name);
  const [avatarUrl, setAvatarUrl] = React.useState(blader.avatar_url ?? "");
  const [bio, setBio] = React.useState(blader.bio ?? "");
  const [userId, setUserId] = React.useState(blader.user_id ?? "");
  const [isActive, setIsActive] = React.useState(blader.is_active);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setNickname(blader.nickname);
      setName(blader.name);
      setAvatarUrl(blader.avatar_url ?? "");
      setBio(blader.bio ?? "");
      setUserId(blader.user_id ?? "");
      setIsActive(blader.is_active);
      setError(null);
      setSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.set("nickname", nickname);
    formData.set("name", name);
    formData.set("avatar_url", avatarUrl);
    formData.set("bio", bio);
    formData.set("user_id", userId);
    formData.set("is_active", isActive ? "true" : "false");

    const result = await updateBladerAction(blader.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 700);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => handleOpenChange(true)}
        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
        title="Editar Blader"
        aria-label={`Editar ${blader.nickname}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              Editar Blader — {blader.nickname}
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
              <span>Blader atualizado com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-nickname-${blader.id}`}
                  className="text-xs font-semibold"
                >
                  Apelido / Nickname *
                </Label>
                <Input
                  id={`edit-nickname-${blader.id}`}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-name-${blader.id}`}
                  className="text-xs font-semibold"
                >
                  Nome Completo *
                </Label>
                <Input
                  id={`edit-name-${blader.id}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`edit-avatar-${blader.id}`}
                className="text-xs font-semibold"
              >
                URL da Foto/Avatar
              </Label>
              <Input
                id={`edit-avatar-${blader.id}`}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`edit-bio-${blader.id}`}
                className="text-xs font-semibold"
              >
                Bio / Estilo de Jogo (Opcional)
              </Label>
              <Textarea
                id={`edit-bio-${blader.id}`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor={`edit-userid-${blader.id}`}
                  className="text-xs font-semibold"
                >
                  Vínculo de Conta (Auth User UUID — Opcional)
                </Label>
                {userId && (
                  <button
                    type="button"
                    onClick={() => setUserId("")}
                    className="text-[11px] font-semibold text-destructive hover:underline cursor-pointer"
                  >
                    Desvincular
                  </button>
                )}
              </div>
              <Input
                id={`edit-userid-${blader.id}`}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Cole o UUID da conta do Blader (ex: 550e8400-...)"
                className="h-9 text-xs font-mono"
              />
            </div>

            <label className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/50 p-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-primary"
              />
              <div>
                <div className="font-bold text-foreground">Blader ativo na liga</div>
                <div className="text-[11px] text-muted-foreground">
                  Bladers inativos não aparecem no ranking público ou inscrições.
                </div>
              </div>
            </label>

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
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
