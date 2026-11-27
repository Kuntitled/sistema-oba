"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
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
import { APP_URL } from "@/lib/constants";
import {
  buildRankingCardFilename,
  buildRankingShareCaption,
  canvasToPngBlob,
  loadBladerAvatarImage,
  loadObaLogoImage,
  RANKING_CARD_ASPECT_ORDER,
  RANKING_CARD_PRESETS,
  renderRankingCardToCanvas,
  type RankingCardAspect,
  type RankingCardEntry,
} from "@/lib/ranking-card-canvas";

export interface RankingCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonName: string;
  entries: RankingCardEntry[];
  totalRankedCount: number;
  finishedTournamentsCount: number;
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

function getClientOrigin(): string {
  if (typeof window === "undefined") return APP_URL.replace(/\/+$/, "");
  return window.location.origin.replace(/\/+$/, "");
}

function getServerOrigin(): string {
  return APP_URL.replace(/\/+$/, "");
}

function RankingCardModalBody({
  seasonName,
  entries,
  totalRankedCount,
  finishedTournamentsCount,
}: Omit<RankingCardModalProps, "open" | "onOpenChange">) {
  const toast = useToast();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const logoRef = React.useRef<HTMLImageElement | null>(null);
  const avatarsRef = React.useRef<Map<string, HTMLImageElement | null>>(
    new Map()
  );

  const [aspect, setAspect] = React.useState<RankingCardAspect>("feed");
  const [showAvatars, setShowAvatars] = React.useState(true);
  const [showStats, setShowStats] = React.useState(true);
  const [showUpdatedDate, setShowUpdatedDate] = React.useState(true);
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
  const origin = React.useSyncExternalStore(
    emptySubscribe,
    getClientOrigin,
    getServerOrigin
  );

  const top10Entries = React.useMemo(() => entries.slice(0, 10), [entries]);
  const currentPreset = RANKING_CARD_PRESETS[aspect];

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const drawPoster = (
      logo: HTMLImageElement | null,
      avatars: Map<string, HTMLImageElement | null>
    ) => {
      if (cancelled || !canvasRef.current) return;
      renderRankingCardToCanvas(canvasRef.current, {
        aspect,
        seasonName,
        totalRankedCount,
        finishedTournamentsCount,
        entries: top10Entries,
        showAvatars,
        showStats,
        showUpdatedDate,
        logoImage: logo,
        avatarsByBladerId: avatars,
      });
    };

    drawPoster(logoRef.current, avatarsRef.current);

    void Promise.all([
      loadObaLogoImage(),
      Promise.all(
        top10Entries.map(async (entry) => {
          const img = await loadBladerAvatarImage(
            entry.bladerId,
            entry.avatarUrl
          );
          return [entry.bladerId, img] as const;
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
  }, [
    aspect,
    seasonName,
    totalRankedCount,
    finishedTournamentsCount,
    top10Entries,
    showAvatars,
    showStats,
    showUpdatedDate,
  ]);

  const showTempFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    if (type === "success") toast.success(text);
    else toast.error(text);
    window.setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 3400);
  };

  const shareCaption = React.useMemo(
    () =>
      buildRankingShareCaption({
        seasonName,
        entries: top10Entries,
        totalRankedCount,
        originUrl: origin,
      }),
    [seasonName, top10Entries, totalRankedCount, origin]
  );

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusyAction("download");
    setFeedback(null);
    try {
      const blob = await canvasToPngBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildRankingCardFilename(seasonName, aspect);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      showTempFeedback("success", "Card Top 10 PNG baixado com sucesso!");
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
    if (!canvas) return;
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
        "Imagem copiada! Cole no WhatsApp, Discord ou Instagram."
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
    if (typeof navigator === "undefined" || !navigator.clipboard) {
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
      showTempFeedback("success", "Legenda do Top 10 copiada!");
    } catch {
      showTempFeedback("error", "Não foi possível copiar a legenda.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !canNativeShare) return;
    setBusyAction("share");
    setFeedback(null);
    try {
      const blob = await canvasToPngBlob(canvas);
      const file = new File(
        [blob],
        buildRankingCardFilename(seasonName, aspect),
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
        title: `Top 10 Ranking OBA — ${seasonName}`,
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
            {RANKING_CARD_ASPECT_ORDER.map((presetKey) => {
              const preset = RANKING_CARD_PRESETS[presetKey];
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

        {/* Opções de Exibição */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Opções do Card
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showAvatars}
              onChange={(e) => setShowAvatars(e.target.checked)}
              className="accent-primary"
            />
            <span className="font-semibold">Exibir fotos de perfil</span>
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
              className="accent-primary"
            />
            <span className="font-semibold">
              Exibir vitórias no Suíço e pódios
            </span>
          </label>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showUpdatedDate}
              onChange={(e) => setShowUpdatedDate(e.target.checked)}
              className="accent-primary"
            />
            <span className="font-semibold">Exibir data de atualização</span>
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
            Prévia do Ranking Top {top10Entries.length}
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

export function RankingCardModal({
  open,
  onOpenChange,
  seasonName,
  entries,
  totalRankedCount,
  finishedTournamentsCount,
}: RankingCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto bg-card border-border/80 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center shrink-0">
              <ImageIcon className="h-4 w-4 text-primary" />
            </span>
            <span className="truncate">
              Card do Ranking Top 10 — {seasonName}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-fire-yellow shrink-0" />
            Exporte a classificação oficial do Top 10 com fotos de perfil e
            pontuações prontas para redes sociais.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <RankingCardModalBody
            key={`${seasonName}-${entries.length}`}
            seasonName={seasonName}
            entries={entries}
            totalRankedCount={totalRankedCount}
            finishedTournamentsCount={finishedTournamentsCount}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
