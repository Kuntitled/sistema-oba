"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Copy, Check, QrCode, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyBRL, generatePixBrCode } from "@/lib/pix";

interface PixPaymentBoxProps {
  pixKey: string;
  receiverName: string;
  city?: string | null;
  amount: number;
  txid?: string | null;
  description?: string | null;
  compact?: boolean;
}

export function PixPaymentBox({
  pixKey,
  receiverName,
  city,
  amount,
  txid,
  description,
  compact = false,
}: PixPaymentBoxProps) {
  const [copiedPayload, setCopiedPayload] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [qrResult, setQrResult] = React.useState<{
    payload: string;
    dataUrl: string | null;
    error: string | null;
  }>({ payload: "", dataUrl: null, error: null });

  const pixData = React.useMemo(() => {
    try {
      const payload = generatePixBrCode({
        pixKey,
        receiverName,
        city,
        amount,
        txid,
        description,
      });
      return { payload, error: null as string | null };
    } catch (err) {
      return {
        payload: "",
        error:
          err instanceof Error
            ? err.message
            : "Não foi possível gerar o código PIX.",
      };
    }
  }, [pixKey, receiverName, city, amount, txid, description]);

  React.useEffect(() => {
    if (!pixData.payload) return;

    let cancelled = false;
    QRCode.toDataURL(pixData.payload, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrResult({ payload: pixData.payload, dataUrl, error: null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrResult({
            payload: pixData.payload,
            dataUrl: null,
            error: "Falha ao renderizar imagem do QR Code.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pixData.payload]);

  const handleCopy = async (text: string, type: "payload" | "key") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "payload") {
        setCopiedPayload(true);
        setTimeout(() => setCopiedPayload(false), 2000);
      } else {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      }
    } catch {
      // Clipboard indisponível em contextos sem permissão
    }
  };

  if (pixData.error) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-500 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{pixData.error}</span>
      </div>
    );
  }

  const activeQrUrl =
    qrResult.payload === pixData.payload ? qrResult.dataUrl : null;
  const activeQrError =
    qrResult.payload === pixData.payload ? qrResult.error : null;

  return (
    <div className="rounded-xl border border-primary/35 bg-gradient-to-br from-primary/5 via-card to-fire-orange/5 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          <span className="text-xs sm:text-sm font-black text-foreground">
            Pagamento via PIX — OBA
          </span>
        </div>
        <Badge className="bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 tabular-nums">
          {formatCurrencyBRL(amount)}
        </Badge>
      </div>

      <div
        className={`flex flex-col ${compact ? "gap-4" : "sm:flex-row sm:items-center gap-5"}`}
      >
        {/* QR Code */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="rounded-xl bg-white p-2.5 border border-border/60 shadow-sm">
            {activeQrUrl ? (
              <Image
                src={activeQrUrl}
                alt="QR Code PIX OBA"
                width={compact ? 164 : 188}
                height={compact ? 164 : 188}
                unoptimized
                className="rounded-md"
              />
            ) : (
              <div
                style={{
                  width: compact ? 164 : 188,
                  height: compact ? 164 : 188,
                }}
                className="flex items-center justify-center text-[11px] text-slate-500 text-center px-3"
              >
                {activeQrError ?? "Gerando QR Code..."}
              </div>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1.5 font-medium">
            Escaneie com o app do seu banco
          </span>
        </div>

        {/* Dados e Copia e Cola */}
        <div className="flex-1 min-w-0 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border/50 bg-background/60 p-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Recebedor
              </div>
              <div className="font-bold text-foreground truncate">
                {receiverName}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Cidade
              </div>
              <div className="font-bold text-foreground truncate">
                {city || "MANAUS"}
              </div>
            </div>
            <div className="sm:col-span-2 min-w-0 pt-1 border-t border-border/40 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Chave PIX
                </div>
                <div className="font-mono text-[11px] font-semibold text-foreground truncate">
                  {pixKey}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => handleCopy(pixKey, "key")}
                className="shrink-0 gap-1 text-[11px]"
              >
                {copiedKey ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    Copiada
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copiar Chave
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-foreground">
                PIX Copia e Cola (com valor exato)
              </span>
              <Button
                type="button"
                size="xs"
                onClick={() => handleCopy(pixData.payload, "payload")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1 text-[11px]"
              >
                {copiedPayload ? (
                  <>
                    <Check className="h-3 w-3" />
                    Código Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copiar PIX Copia e Cola
                  </>
                )}
              </Button>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/80 p-2.5 font-mono text-[10px] text-muted-foreground break-all select-all leading-relaxed max-h-20 overflow-y-auto">
              {pixData.payload}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
