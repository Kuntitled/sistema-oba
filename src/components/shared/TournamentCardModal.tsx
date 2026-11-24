"use client";

import * as React from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  MessageSquareText,
  QrCode,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { APP_URL } from "@/lib/constants";
import {
  buildTournamentCardFilename,
  buildTournamentShareCaption,
  canvasToPngBlob,
  loadObaLogoImage,
  renderTournamentCardToCanvas,
  sanitizeHttpUrl,
  TOURNAMENT_CARD_ASPECT_ORDER,
  TOURNAMENT_CARD_PRESETS,
  type TournamentCardAspect,
  type TournamentCardQrMode,
} from "@/lib/tournament-card-canvas";
import type {
  TournamentCategory,
  TournamentFormat,
  TournamentRegistrationStatus,
} from "@/types/domain";

export interface TournamentCardSummaryData {
  id: string;
  updated_at: string;
  name: string;
  slug: string;
  event_date: string;
  event_time?: string | null;
  category: TournamentCategory;
  format: TournamentFormat;
  swiss_rounds: number;
  location?: string | null;
  location_url?: string | null;
  rulesetName?: string | null;
  bannedCount?: number;
  seasonName?: string | null;
  registration_status: TournamentRegistrationStatus;
  entry_fee: number | null;
  max_players: number | null;
  prize_info?: string | null;
  description?: string | null;
}

export interface TournamentCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: TournamentCardSummaryData;
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

async function createQrImageElement(url: string): Promise<HTMLImageElement | null> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
    });
    return await new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
}

interface TournamentCardModalBodyProps {
  tournament: TournamentCardSummaryData;
}

function TournamentCardModalBody({ tournament }: TournamentCardModalBodyProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const logoRef = React.useRef<HTMLImageElement | null>(null);
  const qrCacheRef = React.useRef<Map<string, HTMLImageElement>>(new Map());

  const [aspect, setAspect] = React.useState<TournamentCardAspect>("feed");
  const [qrMode, setQrMode] = React.useState<TournamentCardQrMode>("tournament");
  const [eventTime, setEventTime] = React.useState(tournament.event_time ?? "");
  const [location, setLocation] = React.useState(tournament.location ?? "");
  const [locationUrl, setLocationUrl] = React.useState(
    tournament.location_url ?? ""
  );
  const [prizeInfo, setPrizeInfo] = React.useState(tournament.prize_info ?? "");
  const [showDescription, setShowDescription] = React.useState(
    Boolean(tournament.description?.trim())
  );
  const [showPointsHint, setShowPointsHint] = React.useState(true);

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

  const tournamentUrl = `${origin}/torneios/${tournament.slug}`;
  const safeMapsUrl = sanitizeHttpUrl(locationUrl);
  const effectiveQrMode: TournamentCardQrMode =
    qrMode === "maps" && !safeMapsUrl ? "tournament" : qrMode;
  const qrTargetUrl =
    effectiveQrMode === "maps"
      ? safeMapsUrl
      : effectiveQrMode === "tournament"
        ? tournamentUrl
        : null;

  const currentPreset = TOURNAMENT_CARD_PRESETS[aspect];
  const entryFee = Number(tournament.entry_fee ?? 0);

  // Desenha e redesenha o canvas sempre que os dados, fontes, logo ou QR mudarem
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const drawPoster = (
      logo: HTMLImageElement | null,
      qrImg: HTMLImageElement | null
    ) => {
      if (cancelled || !canvasRef.current) return;
      renderTournamentCardToCanvas(canvasRef.current, {
        aspect,
        name: tournament.name,
        eventDate: tournament.event_date,
        eventTime,
        category: tournament.category,
        format: tournament.format,
        swissRounds: tournament.swiss_rounds,
        location,
        locationUrl: safeMapsUrl,
        rulesetName: tournament.rulesetName,
        bannedCount: tournament.bannedCount,
        seasonName: tournament.seasonName,
        registrationStatus: tournament.registration_status,
        entryFee,
        maxPlayers: tournament.max_players,
        prizeInfo,
        description: tournament.description,
        showDescription,
        showPointsHint,
        qrMode: effectiveQrMode,
        tournamentUrl,
        logoImage: logo,
        qrImage: qrImg,
      });
    };

    const cachedQr = qrTargetUrl
      ? (qrCacheRef.current.get(qrTargetUrl) ?? null)
      : null;

    drawPoster(logoRef.current, cachedQr);

    void Promise.all([
      loadObaLogoImage(),
      qrTargetUrl
        ? cachedQr
          ? Promise.resolve(cachedQr)
          : createQrImageElement(qrTargetUrl)
        : Promise.resolve(null),
      typeof document !== "undefined" && document.fonts?.ready
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve(),
    ]).then(([loadedLogo, loadedQr]) => {
      if (loadedLogo) {
        logoRef.current = loadedLogo;
      }
      if (qrTargetUrl && loadedQr) {
        qrCacheRef.current.set(qrTargetUrl, loadedQr);
      }
      drawPoster(logoRef.current, loadedQr);
    });

    return () => {
      cancelled = true;
    };
  }, [
    aspect,
    tournament.name,
    tournament.event_date,
    tournament.category,
    tournament.format,
    tournament.swiss_rounds,
    tournament.rulesetName,
    tournament.bannedCount,
    tournament.seasonName,
    tournament.registration_status,
    entryFee,
    tournament.max_players,
    tournament.description,
    eventTime,
    location,
    safeMapsUrl,
    prizeInfo,
    showDescription,
    showPointsHint,
    effectiveQrMode,
    tournamentUrl,
    qrTargetUrl,
  ]);

  const showTempFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 3400);
  };

  const shareCaption = React.useMemo(
    () =>
      buildTournamentShareCaption({
        name: tournament.name,
        eventDate: tournament.event_date,
        eventTime,
        category: tournament.category,
        format: tournament.format,
        swissRounds: tournament.swiss_rounds,
        location,
        locationUrl: safeMapsUrl,
        rulesetName: tournament.rulesetName,
        bannedCount: tournament.bannedCount,
        registrationStatus: tournament.registration_status,
        entryFee,
        maxPlayers: tournament.max_players,
        prizeInfo,
        tournamentUrl,
      }),
    [
      tournament.name,
      tournament.event_date,
      tournament.category,
      tournament.format,
      tournament.swiss_rounds,
      tournament.rulesetName,
      tournament.bannedCount,
      tournament.registration_status,
      tournament.max_players,
      entryFee,
      eventTime,
      location,
      safeMapsUrl,
      prizeInfo,
      tournamentUrl,
    ]
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
      a.download = buildTournamentCardFilename(tournament.name, aspect);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      showTempFeedback("success", "Card PNG do torneio baixado com sucesso!");
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
      showTempFeedback(
        "success",
        "Legenda completa copiada (com link do torneio e Google Maps)!"
      );
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
        buildTournamentCardFilename(tournament.name, aspect),
        { type: "image/png" }
      );

      if (!navigator.canShare({ files: [file] })) {
        showTempFeedback(
          "error",
          "Compartilhamento direto de arquivo indisponível neste dispositivo. Use Baixar PNG."
        );
        return;
      }

      await navigator.share({
        title: `${tournament.name} — OBA`,
        text: shareCaption,
        files: [file],
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      showTempFeedback(
        "error",
        "Não foi possível abrir o compartilhamento. Use Baixar PNG."
      );
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
      {/* Coluna de Ajustes e Exportação */}
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
            {TOURNAMENT_CARD_ASPECT_ORDER.map((presetKey) => {
              const preset = TOURNAMENT_CARD_PRESETS[presetKey];
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

        {/* QR Code no Card */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <QrCode className="h-3.5 w-3.5 text-primary" />
            QR Code no Card
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              size="xs"
              variant={effectiveQrMode === "tournament" ? "default" : "outline"}
              onClick={() => setQrMode("tournament")}
              className="font-bold h-8"
            >
              Inscrição
            </Button>
            <Button
              type="button"
              size="xs"
              disabled={!safeMapsUrl}
              variant={effectiveQrMode === "maps" ? "default" : "outline"}
              onClick={() => setQrMode("maps")}
              className="font-bold h-8 gap-1"
              title={
                safeMapsUrl
                  ? "Gerar QR Code para o Google Maps"
                  : "Informe um Link Google Maps abaixo para ativar"
              }
            >
              <MapPin className="h-3 w-3" />
              Maps
            </Button>
            <Button
              type="button"
              size="xs"
              variant={effectiveQrMode === "none" ? "default" : "outline"}
              onClick={() => setQrMode("none")}
              className="font-bold h-8"
            >
              Sem QR
            </Button>
          </div>
        </div>

        {/* Ajustes Rápidos para este Card */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Dados do Card (Ajuste Rápido)
          </div>

          <div className="space-y-1">
            <Label htmlFor="promo-time" className="text-[11px] font-semibold">
              Horário(s)
            </Label>
            <Input
              id="promo-time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              maxLength={120}
              placeholder="Ex: Check-in 13h30 • Início 14h00"
              className="h-8 text-xs bg-background/60"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="promo-loc" className="text-[11px] font-semibold">
              Local do Evento
            </Label>
            <Input
              id="promo-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={120}
              placeholder="Ex: Shopping Amazonas"
              className="h-8 text-xs bg-background/60"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="promo-maps" className="text-[11px] font-semibold">
                Link Google Maps
              </Label>
              {safeMapsUrl && (
                <a
                  href={safeMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Abrir Maps
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <Input
              id="promo-maps"
              type="url"
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className="h-8 text-xs bg-background/60"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="promo-prize" className="text-[11px] font-semibold">
              Premiação
            </Label>
            <Textarea
              id="promo-prize"
              value={prizeInfo}
              onChange={(e) => setPrizeInfo(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder={"1º Booster Beyblade X + Medalha\n2º e 3º Medalhas"}
              className="text-xs bg-background/60"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="promo-show-points"
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <input
                id="promo-show-points"
                type="checkbox"
                checked={showPointsHint}
                onChange={(e) => setShowPointsHint(e.target.checked)}
                className="accent-primary"
              />
              <span className="font-semibold">
                {tournament.category === "amistoso"
                  ? 'Exibir aviso "Não vale pontos no ranking"'
                  : "Exibir pontos de pódio do ranking"}
              </span>
            </label>

            {Boolean(tournament.description?.trim()) && (
              <label
                htmlFor="promo-show-desc"
                className="flex items-center gap-2 text-xs cursor-pointer"
              >
                <input
                  id="promo-show-desc"
                  type="checkbox"
                  checked={showDescription}
                  onChange={(e) => setShowDescription(e.target.checked)}
                  className="accent-primary"
                />
                <span className="font-semibold">
                  Exibir observações no cabeçalho
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Botões de Exportação e Compartilhamento */}
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
            className={`grid gap-2 ${
              canNativeShare ? "grid-cols-2" : "grid-cols-1"
            }`}
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

      {/* Prévia Live em Alta Resolução */}
      <div className="rounded-xl border border-border/60 bg-black/50 p-3 sm:p-4 flex flex-col items-center justify-center gap-2.5">
        <div className="w-full flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-fire-yellow" />
            Prévia instantânea do card
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

export function TournamentCardModal({
  open,
  onOpenChange,
  tournament,
}: TournamentCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto bg-card border-border/80 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center shrink-0">
              <ImageIcon className="h-4 w-4 text-primary" />
            </span>
            <span className="truncate">
              Card de Divulgação — {tournament.name}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-fire-yellow shrink-0" />
            Gere a arte oficial com data, horário, local, formato, inscrição, premiação e QR Code prontos para redes sociais.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <TournamentCardModalBody
            key={`${tournament.id}::${tournament.updated_at}`}
            tournament={tournament}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
