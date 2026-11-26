"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PixPaymentBox } from "@/components/tournament/PixPaymentBox";
import { useToast } from "@/components/ui/toast-provider";
import { updateLeagueSettingsAction } from "@/app/admin/registrations-actions";
import { sanitizePixText } from "@/lib/pix";
import type { LeagueSettingsRow } from "@/types/domain";

interface LeagueSettingsClientProps {
  initialSettings: LeagueSettingsRow | null;
}

export function LeagueSettingsClient({
  initialSettings,
}: LeagueSettingsClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [pixKey, setPixKey] = React.useState(initialSettings?.pix_key ?? "");
  const [receiverName, setReceiverName] = React.useState(
    initialSettings?.pix_receiver_name ?? ""
  );
  const [city, setCity] = React.useState(
    initialSettings?.pix_city ?? "MANAUS"
  );
  const [previewAmount, setPreviewAmount] = React.useState("15.00");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const normalizedReceiverPreview = sanitizePixText(receiverName, 25);
  const normalizedCityPreview = sanitizePixText(city || "MANAUS", 15) || "MANAUS";
  const parsedAmount = Number(previewAmount.replace(",", "."));
  const validAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 15;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const fd = new FormData();
    fd.set("pix_key", pixKey.trim());
    fd.set("pix_receiver_name", receiverName.trim());
    fd.set("pix_city", city.trim() || "MANAUS");

    const res = await updateLeagueSettingsAction(fd);
    setSaving(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
      return;
    }

    if (res.settings) {
      setPixKey(res.settings.pix_key ?? "");
      setReceiverName(res.settings.pix_receiver_name ?? "");
      setCity(res.settings.pix_city ?? "MANAUS");
    }

    setSuccess(true);
    toast.success("Configurações PIX salvas com sucesso!");
    router.refresh();
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <Card className="lg:col-span-6 border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            Dados PIX da Liga OBA
          </CardTitle>
          <CardDescription className="text-xs">
            Esses dados são usados automaticamente para gerar o QR Code e o Copia e Cola nos torneios com taxa de inscrição.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Configurações PIX salvas com sucesso!</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="pix_key" className="text-xs font-semibold">
                Chave PIX *
              </Label>
              <Input
                id="pix_key"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Ex: email@dominio.com, +5592999999999, CNPJ ou chave aleatória"
                maxLength={77}
                required
                className="h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Para telefone, use formato internacional com DDI, ex: <code>+5592999999999</code>.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="pix_receiver_name"
                  className="text-xs font-semibold"
                >
                  Nome do Recebedor *
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {normalizedReceiverPreview.length}/25 (padrão EMV)
                </span>
              </div>
              <Input
                id="pix_receiver_name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Ex: OBA BEYBLADE AMAZONAS"
                maxLength={40}
                required
                className="h-9 text-xs"
              />
              {normalizedReceiverPreview && (
                <p className="text-[11px] text-muted-foreground">
                  No código PIX sairá como:{" "}
                  <code className="text-foreground font-semibold">
                    {normalizedReceiverPreview}
                  </code>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="pix_city" className="text-xs font-semibold">
                  Cidade *
                </Label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {normalizedCityPreview.length}/15 (padrão EMV)
                </span>
              </div>
              <Input
                id="pix_city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="MANAUS"
                maxLength={25}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="rounded-lg border border-border/50 bg-background/50 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                Os acentos e caracteres especiais do recebedor e cidade são removidos automaticamente para garantir leitura em todos os aplicativos bancários brasileiros.
              </span>
            </div>

            <div className="pt-1 flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar Configurações PIX
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-6 border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black text-foreground">
                Pré-visualização do QR Code PIX
              </CardTitle>
              <CardDescription className="text-xs">
                Teste a leitura diretamente no app do seu banco antes de abrir inscrições.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1.5">
              <Label
                htmlFor="pix-preview-amount"
                className="text-[11px] font-semibold text-muted-foreground"
              >
                Valor teste (R$):
              </Label>
              <Input
                id="pix-preview-amount"
                type="text"
                value={previewAmount}
                onChange={(e) => setPreviewAmount(e.target.value)}
                className="h-8 w-20 text-xs text-center font-bold tabular-nums"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {pixKey.trim() && receiverName.trim() ? (
            <PixPaymentBox
              pixKey={pixKey}
              receiverName={receiverName}
              city={city}
              amount={validAmount}
              txid="OBATESTE01"
              description="OBA TESTE"
              compact
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-8 text-center text-xs text-muted-foreground">
              Preencha a chave PIX e o nome do recebedor ao lado para visualizar o QR Code e o Copia e Cola em tempo real.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
