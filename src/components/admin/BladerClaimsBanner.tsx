"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Link2, Check, X, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { useToast } from "@/components/ui/toast-provider";
import {
  approveBladerClaimAction,
  rejectBladerClaimAction,
} from "@/app/admin/actions";
import type { BladerClaimRequest } from "@/types/domain";

interface BladerClaimsBannerProps {
  claims: BladerClaimRequest[];
}

export function BladerClaimsBanner({ claims }: BladerClaimsBannerProps) {
  const router = useRouter();
  const toast = useToast();
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (claims.length === 0) return null;

  const handleApprove = async (claimId: string, targetNickname?: string) => {
    setProcessingId(claimId);
    setError(null);

    const res = await approveBladerClaimAction(claimId);
    setProcessingId(null);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
      return;
    }

    toast.success(
      targetNickname
        ? `Vínculo aprovado para "${targetNickname}"!`
        : "Vínculo de perfil aprovado!"
    );
    router.refresh();
  };

  const handleReject = async (claimId: string) => {
    setProcessingId(claimId);
    setError(null);

    const res = await rejectBladerClaimAction(claimId);
    setProcessingId(null);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
      return;
    }

    toast.info("Solicitação de vínculo recusada.");
    router.refresh();
  };

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-black text-foreground">
              Solicitações de Vínculo de Conta ({claims.length})
            </h2>
          </div>
          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40 text-[10px]">
            Ação Necessária
          </Badge>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          {claims.map((claim) => {
            const busy = processingId === claim.id;
            return (
              <div
                key={claim.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/80 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BladerAvatar
                    avatarUrl={claim.user_avatar_url}
                    nickname={claim.user_name || claim.user_email || "BX"}
                    sizeClass="h-10 w-10"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-bold text-foreground truncate">
                      {claim.user_name || "Usuário"}{" "}
                      {claim.user_email && (
                        <span className="font-normal text-muted-foreground">
                          ({claim.user_email})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Quer vincular ao perfil{" "}
                      <strong className="text-primary">
                        {claim.blader?.nickname ?? claim.blader_id}
                      </strong>
                      {claim.blader?.name ? ` (${claim.blader.name})` : ""}
                    </div>
                    {claim.currentBlader && (
                      <div className="text-[11px] text-amber-500 font-medium">
                        Mesclagem: o perfil temporário{" "}
                        <strong>{claim.currentBlader.nickname}</strong> será transferido e consolidado neste cadastro histórico.
                      </div>
                    )}
                    {claim.note && (
                      <div className="text-[11px] text-muted-foreground italic">
                        &ldquo;{claim.note}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void handleApprove(claim.id, claim.blader?.nickname)
                    }
                    className="h-8 bg-emerald-600 hover:bg-emerald-600/90 text-white font-semibold text-xs gap-1"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Aprovar Vínculo
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void handleReject(claim.id)}
                    className="h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    Recusar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
