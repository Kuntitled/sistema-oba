"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Share2,
  ShieldBan,
  Sparkles,
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
import { Badge } from "@/components/ui/badge";
import {
  BANLIST_CARD_ASPECT_ORDER,
  BANLIST_CARD_PRESETS,
  buildBanlistCardFilename,
  canvasToPngBlob,
  isBladePartType,
  loadObaLogoImage,
  renderBanlistCardToCanvas,
  type BanlistCardAspect,
} from "@/lib/banlist-card-canvas";
import type { PartRow } from "@/types/domain";

export interface BanlistCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rulesetName: string;
  rulesetDescription?: string | null;
  bannedParts: PartRow[];
  defaultSubtitle?: string;
  allowCustomization?: boolean;
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

interface ToggleOptionProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleOption({
  id,
  label,
  description,
  checked,
  onChange,
}: ToggleOptionProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/50 px-3 py-2 cursor-pointer hover:border-primary/40 transition-colors"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-primary cursor-pointer"
      />
      <div className="min-w-0 leading-tight">
        <div className="text-xs font-bold text-foreground">{label}</div>
        {description && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

interface BanlistCardModalBodyProps {
  rulesetName: string;
  rulesetDescription?: string | null;
  bannedParts: PartRow[];
  defaultSubtitle?: string;
  allowCustomization: boolean;
}

function BanlistCardModalBody({
  rulesetName,
  rulesetDescription,
  bannedParts,
  defaultSubtitle,
  allowCustomization,
}: BanlistCardModalBodyProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const logoRef = React.useRef<HTMLImageElement | null>(null);

  const [aspect, setAspect] = React.useState<BanlistCardAspect>("feed");
  const [bladesOnly, setBladesOnly] = React.useState(false);
  const [showHasbroAliases, setShowHasbroAliases] = React.useState(true);
  const [showDescription, setShowDescription] = React.useState(
    Boolean(rulesetDescription?.trim())
  );
  const [showUpdatedDate, setShowUpdatedDate] = React.useState(true);
  const [subtitle, setSubtitle] = React.useState(defaultSubtitle ?? "");

  const [busyAction, setBusyAction] = React.useState<
    "download" | "copy" | "share" | null
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

  const totalCount = bannedParts.length;
  const bladesCount = React.useMemo(
    () => bannedParts.filter((p) => isBladePartType(p.part_type)).length,
    [bannedParts]
  );
  const visibleCount = bladesOnly ? bladesCount : totalCount;
  const currentPreset = BANLIST_CARD_PRESETS[aspect];

  // Desenha e redesenha o canvas sempre que opções, texto ou fontes/logo ficam prontos
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const drawWithLogo = (logo: HTMLImageElement | null) => {
      if (cancelled || !canvasRef.current) return;
      renderBanlistCardToCanvas(canvasRef.current, {
        rulesetName,
        rulesetDescription,
        bannedParts,
        aspect,
        bladesOnly,
        showHasbroAliases,
        showDescription,
        showUpdatedDate,
        subtitle,
        logoImage: logo,
      });
    };

    drawWithLogo(logoRef.current);

    void Promise.all([
      loadObaLogoImage(),
      typeof document !== "undefined" && document.fonts?.ready
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve(),
    ]).then(([loadedLogo]) => {
      if (loadedLogo) {
        logoRef.current = loadedLogo;
      }
      drawWithLogo(logoRef.current);
    });

    return () => {
      cancelled = true;
    };
  }, [
    rulesetName,
    rulesetDescription,
    bannedParts,
    aspect,
    bladesOnly,
    showHasbroAliases,
    showDescription,
    showUpdatedDate,
    subtitle,
  ]);

  const showTempFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 3200);
  };

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
      a.download = buildBanlistCardFilename(rulesetName, aspect);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      showTempFeedback("success", "Card PNG baixado com sucesso!");
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

    setBusyAction("copy");
    setFeedback(null);
    try {
      const blob = await canvasToPngBlob(canvas);
      await navigator.clipboard.write([
        new window.ClipboardItem({ "image/png": blob }),
      ]);
      showTempFeedback(
        "success",
        "Imagem copiada! Cole direto no WhatsApp, Discord ou Instagram."
      );
    } catch {
      showTempFeedback(
        "error",
        "Não foi possível copiar para a área de transferência. Use Baixar PNG."
      );
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
      const filename = buildBanlistCardFilename(rulesetName, aspect);
      const file = new File([blob], filename, { type: "image/png" });

      if (!navigator.canShare({ files: [file] })) {
        showTempFeedback(
          "error",
          "Compartilhamento direto de arquivo indisponível neste dispositivo. Use Baixar PNG."
        );
        return;
      }

      await navigator.share({
        title: `Ban-list Oficial OBA — ${rulesetName}`,
        text: `Confira as ${
          bladesOnly ? "blades" : "peças"
        } banidas no formato ${rulesetName} da Organização de Beyblade do Amazonas (OBA).`,
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
    <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] gap-5 items-start">
      {/* Coluna de Opções e Exportação */}
      <div className="space-y-4">
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
            {BANLIST_CARD_ASPECT_ORDER.map((presetKey) => {
              const preset = BANLIST_CARD_PRESETS[presetKey];
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

        {/* Filtros de Exibição */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Conteúdo do Card
          </div>

          <ToggleOption
            id="banlist-card-blades-only"
            label={`Somente Blades (${bladesCount})`}
            description={
              bladesOnly
                ? "Exibindo apenas Blades, Main, Metal e Over Blades."
                : `Incluindo todos os tipos banidos (${totalCount} no total).`
            }
            checked={bladesOnly}
            onChange={setBladesOnly}
          />

          <ToggleOption
            id="banlist-card-aliases"
            label="Exibir nomes Hasbro"
            description="Mostra o nome alternativo da Hasbro abaixo do nome Takara Tomy."
            checked={showHasbroAliases}
            onChange={setShowHasbroAliases}
          />

          {Boolean(rulesetDescription?.trim()) && (
            <ToggleOption
              id="banlist-card-description"
              label="Exibir descrição do formato"
              checked={showDescription}
              onChange={setShowDescription}
            />
          )}

          <ToggleOption
            id="banlist-card-date"
            label="Carimbo de data no rodapé"
            checked={showUpdatedDate}
            onChange={setShowUpdatedDate}
          />
        </div>

        {allowCustomization && (
          <div className="space-y-1.5">
            <Label
              htmlFor="banlist-card-subtitle"
              className="text-xs font-semibold"
            >
              Subtítulo / Evento (opcional)
            </Label>
            <Input
              id="banlist-card-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={65}
              placeholder="Ex: Torneio Oficial • Temporada 2026"
              className="h-9 text-xs bg-background/60"
            />
          </div>
        )}

        {/* Botões de Ação */}
        <div className="space-y-2 pt-1">
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
              feedback.text.includes("copiada") ? (
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
            Prévia instantânea ({visibleCount}{" "}
            {visibleCount === 1 ? "item" : "itens"})
          </span>
          <span className="font-mono text-[10px]">
            {currentPreset.shortLabel} • PNG
          </span>
        </div>

        <div className="w-full flex items-center justify-center overflow-hidden rounded-lg bg-[#07050c] border border-white/10 shadow-2xl">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-h-[62vh] object-contain block"
          />
        </div>
      </div>
    </div>
  );
}

export function BanlistCardModal({
  open,
  onOpenChange,
  rulesetName,
  rulesetDescription,
  bannedParts,
  defaultSubtitle,
  allowCustomization = true,
}: BanlistCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-card border-border/80 p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-fire-orange/15 border border-fire-orange/40 flex items-center justify-center shrink-0">
              <ImageIcon className="h-4 w-4 text-fire-orange" />
            </span>
            <span className="truncate">
              Card de Divulgação — {rulesetName}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs flex items-center gap-1.5">
            <ShieldBan className="h-3.5 w-3.5 text-destructive shrink-0" />
            Exporte a ban-list oficial da OBA pronta para Instagram, WhatsApp e Discord sem precisar montar manualmente.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <BanlistCardModalBody
            key={`${rulesetName}::${defaultSubtitle ?? ""}`}
            rulesetName={rulesetName}
            rulesetDescription={rulesetDescription}
            bannedParts={bannedParts}
            defaultSubtitle={defaultSubtitle}
            allowCustomization={allowCustomization}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
