"use client";

import * as React from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  Share2,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast-provider";
import {
  buildPodiumCardFilename,
  buildPodiumShareCaption,
  canvasToPngBlob,
  loadBladerAvatarImage,
  loadObaLogoImage,
  PODIUM_CARD_ASPECT_ORDER,
  PODIUM_CARD_PRESETS,
  renderPodiumCardToCanvas,
  type PodiumCardAspect,
} from "@/lib/podium-card-canvas";
import type { TournamentPodiumCardData } from "@/lib/services/podium-card";

export interface TournamentPodiumCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
}

function emptySubscribe() {
  return () => {};
}

function getCanNativeShare(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  );
}

function TournamentPodiumCardModalBody({
  tournamentId,
  tournamentName,
}: Pick<TournamentPodiumCardModalProps, "tournamentId" | "tournamentName">) {
  const toast = useToast();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const logoRef = React.useRef<HTMLImageElement | null>(null);
  const avatarsRef = React.useRef<Map<string, HTMLImageElement | null>>(
    new Map()
  );

  const [aspect, setAspect] = React.useState<PodiumCardAspect>("feed");
  const [showSwissLeader, setShowSwissLeader] = React.useState(true);
  const [showDepositCombo, setShowDepositCombo] = React.useState(false);
  const [showPoints, setShowPoints] = React.useState(true);

  const [loadingData, setLoadingData] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [podiumData, setPodiumData] =
    React.useState<TournamentPodiumCardData | null>(null);

  const [busyAction, setBusyAction] = React.useState<
    "download" | "copy-image" | "copy-caption" | "share" | null
  >(null);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const canNativeShare = React.useSyncExternalStore(
    emptySubscribe,
    getCanNativeShare,
    () => false
  );

  const currentPreset = PODIUM_CARD_PRESETS[aspect];

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/torneios/${tournamentId}/podium-card`, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as
          | TournamentPodiumCardData
          | { error?: string };
        if (!res.ok) {
          throw new Error(
            "error" in json && json.error
              ? json.error
              : "Não foi possível carregar o pódio do torneio."
          );
        }
        return json as TournamentPodiumCardData;
      })
      .then((data) => {
        if (cancelled) return;
        setPodiumData(data);
        setLoadingData(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar dados do pódio."
        );
        setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !podiumData) return;

    let cancelled = false;

    const drawPoster = (
      logo: HTMLImageElement | null,
      avatars: Map<string, HTMLImageElement | null>
    ) => {
      if (cancelled || !canvasRef.current) return;
      renderPodiumCardToCanvas(canvasRef.current, {
        aspect,
        data: podiumData,
        showSwissLeader,
        showDepositCombo,
        showPoints,
        logoImage: logo,
        avatarsByBladerId: avatars,
      });
    };

    drawPoster(logoRef.current, avatarsRef.current);

    const avatarTargets: Array<{ bladerId: string; avatarUrl: string | null }> =
      [
        ...podiumData.podium.map((p) => ({
          bladerId: p.bladerId,
          avatarUrl: p.avatarUrl,
        })),
        ...(podiumData.swissLeader
          ? [
              {
                bladerId: podiumData.swissLeader.bladerId,
                avatarUrl: podiumData.swissLeader.avatarUrl,
              },
            ]
          : []),
      ];

    const uniqueTargets = Array.from(
      new Map(avatarTargets.map((t) => [t.bladerId, t])).values()
    );

    void Promise.all([
      loadObaLogoImage(),
      Promise.all(
        uniqueTargets.map(async (t) => {
          const img = await loadBladerAvatarImage(t.bladerId, t.avatarUrl);
          return [t.bladerId, img] as const;
        })
      ),
      typeof document !== "undefined" && document.fonts?.ready
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve(),
    ]).then(([loadedLogo, loadedAvatars]) => {
      if (cancelled) return;
      if (loadedLogo) logoRef.current = loadedLogo;
      const map = new Map<string, HTMLImageElement | null>(avatarsRef.current);
      for (const [id, img] of loadedAvatars) {
        if (img) map.set(id, img);
      }
      avatarsRef.current = map;
      drawPoster(logoRef.current, map);
    });

    return () => {
      cancelled = true;
    };
  }, [aspect, podiumData, showSwissLeader, showDepositCombo, showPoints]);

  const showTempFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    if (type === "success") toast.success(text);
    else toast.error(text);
    window.setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 3400);
  };

  const shareCaption = React.useMemo(() => {
    if (!podiumData) return "";
    return buildPodiumShareCaption(podiumData, showDepositCombo);
  }, [podiumData, showDepositCombo]);

  const hasDepositCombos = React.useMemo(() => {
    if (!podiumData) return false;
    return (
      podiumData.podium.some((p) =>
        p.initialCombos.some((c) => c.slotNumber === 4)
      ) ||
      Boolean(
        podiumData.swissLeader?.initialCombos.some((c) => c.slotNumber === 4)
      )
    );
  }, [podiumData]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !podiumData) return;
    setBusyAction("download");
    setFeedback(null);
    try {
      const blob = await canvasToPngBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildPodiumCardFilename(
        podiumData.tournament.name,
        aspect
      );
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      showTempFeedback("success", "Card do Pódio PNG baixado com sucesso!");
    } catch (err) {
      showTempFeedback(
        "error",
        err instanceof Error
          ? err.message
          : "Não foi possível baixar o card PNG."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !podiumData) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof window.ClipboardItem === "undefined"
    ) {
      showTempFeedback(
        "error",
        "Seu navegador não permite copiar imagens diretamente. Use Baixar PNG."
      );
      return;
    }

    setBusyAction("copy-image");
    setFeedback(null);
    try {
      const blob = await canvasToPngBlob(canvas);
      await navigator.clipboard.write([
        new window.ClipboardItem({ "image/png": blob }),
      ]);
      showTempFeedback(
        "success",
        "Imagem do pódio copiada! Cole no WhatsApp, Discord ou Instagram."
      );
    } catch {
      showTempFeedback(
        "error",
        "Não foi possível copiar a imagem. Use Baixar PNG."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyCaption = async () => {
    if (!shareCaption || typeof navigator === "undefined" || !navigator.clipboard) {
      showTempFeedback(
        "error",
        "Área de transferência indisponível neste navegador."
      );
      return;
    }
    setBusyAction("copy-caption");
    setFeedback(null);
    try {
      await navigator.clipboard.writeText(shareCaption);
      showTempFeedback("success", "Legenda do pódio copiada!");
    } catch {
      showTempFeedback("error", "Não foi possível copiar a legenda.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !podiumData || !canNativeShare) return;
    setBusyAction("share");
    setFeedback(null);
    try {
      const blob = await canvasToPngBlob(canvas);
      const file = new File(
        [blob],
        buildPodiumCardFilename(podiumData.tournament.name, aspect),
        { type: "image/png" }
      );
      if (!navigator.canShare({ files: [file] })) {
        showTempFeedback(
          "error",
          "Compartilhamento direto indisponível neste dispositivo. Use Baixar PNG."
        );
        return;
      }
      await navigator.share({
        title: `Pódio — ${podiumData.tournament.name}`,
        text: shareCaption,
        files: [file],
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      showTempFeedback(
        "error",
        "Não foi possível abrir o compartilhamento. Use Baixar PNG."
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (loadingData) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span>Carregando pódio, fotos e combos iniciais de {tournamentName}...</span>
      </div>
    );
  }

  if (loadError || !podiumData) {
    return (
      <div className="py-10 px-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{loadError ?? "Dados do pódio indisponíveis."}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
      <div className="space-y-4">
        {/* Proporção */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Proporção para Redes
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {currentPreset.width}×{currentPreset.height}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PODIUM_CARD_ASPECT_ORDER.map((presetKey) => {
              const preset = PODIUM_CARD_PRESETS[presetKey];
              const isSelected = aspect === presetKey;
              return (
                <Button
                  key={presetKey}
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setAspect(presetKey)}
                  className="h-auto py-2 px-2 flex flex-col items-center gap-0.5 text-[11px] font-bold"
                >
                  <span>{preset.ratioLabel}</span>
                  <span className="text-[9px] font-normal opacity-80 truncate max-w-full">
                    {presetKey === "feed"
                      ? "Feed"
                      : presetKey === "square"
                        ? "Quadrado"
                        : "Story"}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Opções */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Elementos do Pódio
          </div>

          {podiumData.swissLeader && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showSwissLeader}
                onChange={(e) => setShowSwissLeader(e.target.checked)}
                className="accent-primary"
              />
              <span className="font-semibold">
                Menção Honrosa: Líder do Suíço
              </span>
            </label>
          )}

          {hasDepositCombos && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={showDepositCombo}
                onChange={(e) => setShowDepositCombo(e.target.checked)}
                className="accent-primary"
              />
              <span className="font-semibold">
                Incluir slot #4 (Depósito de peças)
              </span>
            </label>
          )}

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
              className="accent-primary"
            />
            <span className="font-semibold">Exibir pontuação e vitórias</span>
          </label>
        </div>

        {/* Exportação */}
        <div className="space-y-2">
          <Button
            type="button"
            disabled={busyAction !== null}
            onClick={() => void handleDownload()}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2 h-9"
          >
            <Download className="h-4 w-4" />
            {busyAction === "download"
              ? "Gerando PNG..."
              : `Baixar Card PNG (${currentPreset.ratioLabel})`}
          </Button>

          <div
            className={`grid gap-2 ${canNativeShare ? "grid-cols-2" : "grid-cols-1"}`}
          >
            <Button
              type="button"
              variant="outline"
              disabled={busyAction !== null}
              onClick={() => void handleCopyImage()}
              className="text-xs font-semibold gap-1.5 h-9"
            >
              {feedback?.type === "success" &&
              feedback.text.includes("Imagem") ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copiar Imagem
            </Button>

            {canNativeShare && (
              <Button
                type="button"
                variant="outline"
                disabled={busyAction !== null}
                onClick={() => void handleNativeShare()}
                className="text-xs font-semibold gap-1.5 h-9"
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={busyAction !== null}
            onClick={() => void handleCopyCaption()}
            className="w-full text-xs font-bold gap-1.5 h-9"
          >
            <MessageSquareText className="h-3.5 w-3.5 text-fire-orange" />
            Copiar Legenda (WhatsApp / Instagram)
          </Button>

          {feedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-[11px] font-medium ${
                feedback.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>
      </div>

      {/* Prévia */}
      <div className="rounded-xl border border-border/60 bg-black/50 p-3 sm:p-4 flex flex-col items-center justify-center gap-2.5">
        <div className="w-full flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-fire-yellow" />
            Prévia instantânea do Pódio
          </span>
          <span className="font-mono text-[10px]">
            {currentPreset.shortLabel} • PNG
          </span>
        </div>

        <div className="w-full flex items-center justify-center overflow-hidden rounded-lg bg-[#07050c] border border-white/10 shadow-2xl">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-h-[66vh] object-contain block"
          />
        </div>
      </div>
    </div>
  );
}

export function TournamentPodiumCardModal({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
}: TournamentPodiumCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto bg-card border-border/80 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <ImageIcon className="h-4 w-4 text-amber-400" />
            </span>
            <span className="truncate">
              Card do Pódio — {tournamentName}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-fire-yellow shrink-0" />
            Arte oficial com fotos de perfil, combos iniciais registrados pelo
            pódio e Menção Honrosa ao Líder da Fase Suíça.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <TournamentPodiumCardModalBody
            key={tournamentId}
            tournamentId={tournamentId}
            tournamentName={tournamentName}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
