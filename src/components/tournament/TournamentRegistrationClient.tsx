"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Swords,
  Plus,
  Trash2,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Loader2,
  ShieldBan,
  LogIn,
  UserPlus,
  FileText,
  ExternalLink,
  Receipt,
  Users,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboBuilder } from "@/components/blader/ComboBuilder";
import { PixPaymentBox } from "@/components/tournament/PixPaymentBox";
import { useToast } from "@/components/ui/toast-provider";
import {
  comboRowToSelection,
  createEmptyComboSelection,
  formatComboDisplay,
  getMissingComboPartLabels,
  inferComboSystem,
  validateTournamentDeckCombo,
  type ComboBadgeChip,
} from "@/lib/combo-rules";
import { formatCurrencyBRL, isPixConfigured } from "@/lib/pix";
import {
  isReceiptPdfPath,
  uploadTournamentReceipt,
} from "@/lib/receipt-upload";
import {
  cancelOwnRegistrationAction,
  submitTournamentRegistrationAction,
} from "@/app/torneios/registration-actions";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_REGISTRATION_STATUS_LABELS,
  type BladerRow,
  type ComboSelection,
  type LeagueSettingsRow,
  type PartRow,
  type RegistrationComboRow,
  type Tournament,
  type TournamentRegistrationRow,
} from "@/types/domain";

interface TournamentRegistrationClientProps {
  tournament: Tournament;
  confirmedParticipantsCount: number;
  userId: string | null;
  blader: BladerRow | null;
  hasPendingClaim: boolean;
  parts: PartRow[];
  bannedParts: PartRow[];
  leagueSettings: LeagueSettingsRow | null;
  initialRegistration: TournamentRegistrationRow | null;
  initialCombos: RegistrationComboRow[];
  initialReceiptSignedUrl: string | null;
}

const CHIP_TONE_CLASSES: Record<ComboBadgeChip["tone"], string> = {
  primary: "border-primary/40 text-primary",
  orange: "border-fire-orange/40 text-fire-orange",
  yellow: "border-fire-yellow/40 text-fire-yellow",
  muted: "border-border/70 text-muted-foreground",
};

export function TournamentRegistrationClient({
  tournament,
  confirmedParticipantsCount,
  userId,
  blader,
  hasPendingClaim,
  parts,
  bannedParts,
  leagueSettings,
  initialRegistration,
  initialCombos,
  initialReceiptSignedUrl,
}: TournamentRegistrationClientProps) {
  const router = useRouter();
  const toast = useToast();
  const receiptInputRef = React.useRef<HTMLInputElement>(null);

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartRow>();
    for (const part of parts) {
      map.set(part.id, part);
    }
    return map;
  }, [parts]);

  const bannedPartIds = React.useMemo(
    () => new Set(bannedParts.map((p) => p.id)),
    [bannedParts]
  );

  const [combos, setCombos] = React.useState<ComboSelection[]>(() => {
    if (initialCombos.length > 0) {
      return [...initialCombos]
        .sort((a, b) => a.slot_number - b.slot_number)
        .map((row) => comboRowToSelection(row, partsById));
    }
    return [createEmptyComboSelection()];
  });

  const [receiptPath, setReceiptPath] = React.useState<string | null>(
    initialRegistration?.receipt_path ?? null
  );
  const [receiptPreviewUrl, setReceiptPreviewUrl] = React.useState<
    string | null
  >(initialReceiptSignedUrl);
  const [receiptLocalName, setReceiptLocalName] = React.useState<string | null>(
    null
  );
  const [uploadingReceipt, setUploadingReceipt] = React.useState(false);
  const [receiptNotice, setReceiptNotice] = React.useState<string | null>(null);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);

  const [showBannedList, setShowBannedList] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (receiptPreviewUrl && receiptPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  const entryFee = Number(tournament.entry_fee ?? 0);
  const isPaid = entryFee > 0;
  const pixReady = isPixConfigured(leagueSettings);
  const regOpen = tournament.registration_status === "open";
  const isApproved = initialRegistration?.status === "approved";
  const isFull =
    !initialRegistration &&
    tournament.max_players !== null &&
    confirmedParticipantsCount >= tournament.max_players;
  const canEdit = Boolean(
    userId && blader && regOpen && !isApproved && !isFull
  );

  // Detecta peças repetidas entre os combos da decklist (aviso amigável, não bloqueia)
  const duplicatePartNames = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const combo of combos) {
      const ids = new Set(
        [
          combo.lockChipId,
          combo.overBladeId,
          combo.bladeId,
          combo.assistBladeId,
          combo.ratchetId,
          combo.bitId,
        ].filter(Boolean)
      );
      for (const id of ids) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    const names: string[] = [];
    for (const [id, count] of counts.entries()) {
      if (count > 1) {
        const part = partsById.get(id);
        if (part) names.push(part.name);
      }
    }
    return names;
  }, [combos, partsById]);

  const incompleteCombos = React.useMemo(() => {
    return combos
      .map((combo, index) => ({
        slot: index + 1,
        missing: getMissingComboPartLabels(combo, partsById),
      }))
      .filter((item) => item.missing.length > 0);
  }, [combos, partsById]);

  const favoriteComboSelection = React.useMemo<ComboSelection | null>(() => {
    if (!blader) return null;
    const blade = blader.favorite_blade_id
      ? (partsById.get(blader.favorite_blade_id) ?? null)
      : null;
    const lockChip = blader.favorite_lock_chip_id
      ? (partsById.get(blader.favorite_lock_chip_id) ?? null)
      : null;
    const overBlade = blader.favorite_over_blade_id
      ? (partsById.get(blader.favorite_over_blade_id) ?? null)
      : null;
    const assistBlade = blader.favorite_assist_blade_id
      ? (partsById.get(blader.favorite_assist_blade_id) ?? null)
      : null;

    const system = inferComboSystem({
      system: blader.favorite_system,
      blade,
      lockChip,
      overBlade,
      assistBlade,
    });
    if (!system || !blader.favorite_blade_id) return null;

    return {
      system,
      bladeId: blader.favorite_blade_id ?? "",
      lockChipId: blader.favorite_lock_chip_id ?? "",
      overBladeId: blader.favorite_over_blade_id ?? "",
      assistBladeId: blader.favorite_assist_blade_id ?? "",
      ratchetId: blader.favorite_ratchet_id ?? "",
      bitId: blader.favorite_bit_id ?? "",
    };
  }, [blader, partsById]);

  const handleComboChange = (index: number, next: ComboSelection) => {
    setCombos((prev) => prev.map((c, idx) => (idx === index ? next : c)));
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleAddCombo = () => {
    if (combos.length >= 4) return;
    setCombos((prev) => [...prev, createEmptyComboSelection()]);
  };

  const handleRemoveCombo = (index: number) => {
    if (combos.length <= 1) return;
    setCombos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleApplyFavoriteCombo = (index: number) => {
    if (!favoriteComboSelection) return;
    const check = validateTournamentDeckCombo(
      favoriteComboSelection,
      partsById,
      bannedPartIds
    );
    if (!check.valid) {
      setSubmitError(
        `Seu Combo Favorito não pode ser importado direto: ${check.error}`
      );
      return;
    }
    handleComboChange(index, check.sanitized);
  };

  const handleReceiptChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;

    setUploadingReceipt(true);
    setReceiptError(null);
    setReceiptNotice(null);

    try {
      const uploaded = await uploadTournamentReceipt({
        tournamentId: tournament.id,
        userId,
        file,
        previousPath: receiptPath,
      });

      setReceiptPath(uploaded.path);
      setReceiptLocalName(file.name);
      if (receiptPreviewUrl && receiptPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
      if (uploaded.mimeType.startsWith("image/")) {
        setReceiptPreviewUrl(URL.createObjectURL(file));
      } else {
        setReceiptPreviewUrl(null);
      }

      setReceiptNotice(
        `Comprovante enviado (${uploaded.sizeKb} KB). Clique em "${initialRegistration ? "Atualizar Inscrição" : "Enviar Inscrição"}" abaixo para concluir.`
      );
      toast.success(`Comprovante anexado (${uploaded.sizeKb} KB)!`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o comprovante.";
      setReceiptError(msg);
      toast.error(msg);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    for (let i = 0; i < combos.length; i += 1) {
      const check = validateTournamentDeckCombo(
        combos[i],
        partsById,
        bannedPartIds,
        i + 1
      );
      if (!check.valid) {
        setSubmitError(check.error);
        toast.error(check.error);
        return;
      }
    }

    if (
      isPaid &&
      !receiptPath &&
      !initialRegistration?.payment_verified
    ) {
      const msg = "Anexe o comprovante do pagamento PIX antes de enviar sua inscrição.";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    const res = await submitTournamentRegistrationAction({
      tournamentId: tournament.id,
      combos,
      receiptPath,
    });
    setSubmitting(false);

    if (res.error) {
      setSubmitError(res.error);
      toast.error(res.error);
      return;
    }

    const msg = initialRegistration
      ? "Inscrição e decklist atualizadas e enviadas para análise da organização!"
      : "Inscrição enviada! Acompanhe a aprovação aqui ou em Meu Painel.";
    setSubmitSuccess(msg);
    toast.success(msg);
    router.refresh();
  };

  const handleCancelRegistration = async () => {
    setCancelling(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const res = await cancelOwnRegistrationAction(tournament.id);
    setCancelling(false);

    if (res.error) {
      setSubmitError(res.error);
      toast.error(res.error);
      return;
    }

    setReceiptPath(null);
    setReceiptPreviewUrl(null);
    setReceiptLocalName(null);
    setCombos([createEmptyComboSelection()]);
    setSubmitSuccess("Sua inscrição foi cancelada.");
    toast.info("Sua inscrição foi cancelada.");
    router.refresh();
  };

  // Se inscrições não estão abertas e o usuário não tem inscrição prévia, mostra card discreto
  if (!regOpen && !initialRegistration) {
    return (
      <section id="inscricao">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-black text-foreground">
                  Inscrições Online
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {
                    TOURNAMENT_REGISTRATION_STATUS_LABELS[
                      tournament.registration_status ?? "closed"
                    ]
                  }
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {tournament.registration_status === "finished"
                  ? "O período de inscrições online para esta etapa foi encerrado."
                  : "As inscrições online para este torneio ainda não foram abertas pela organização."}
              </p>
            </div>
            {tournament.max_players && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>
                  {confirmedParticipantsCount} / {tournament.max_players} vagas preenchidas
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section id="inscricao" className="space-y-4">
      <Card className="border-primary/35 bg-card/70 overflow-visible shadow-md">
        <div className="h-1.5 bg-gradient-to-r from-primary via-fire-orange to-fire-yellow rounded-t-xl" />
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                <Swords className="h-5 w-5 text-primary" />
                Inscrição Online &amp; Decklist
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  className={`text-[10px] font-bold ${
                    regOpen
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {
                    TOURNAMENT_REGISTRATION_STATUS_LABELS[
                      tournament.registration_status ?? "closed"
                    ]
                  }
                </Badge>

                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    isPaid
                      ? "border-primary/40 text-primary"
                      : "border-emerald-500/40 text-emerald-500"
                  }`}
                >
                  {isPaid ? `Taxa: ${formatCurrencyBRL(entryFee)}` : "Inscrição Gratuita"}
                </Badge>

                {tournament.max_players && (
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <strong>{confirmedParticipantsCount}</strong> /{" "}
                    {tournament.max_players} vagas confirmadas
                  </span>
                )}
              </div>
            </div>

            {initialRegistration && (
              <div className="flex flex-wrap items-center gap-1.5">
                {initialRegistration.status === "approved" && (
                  <Badge className="bg-emerald-600 text-white text-xs font-black gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {REGISTRATION_STATUS_LABELS.approved}
                  </Badge>
                )}
                {initialRegistration.status === "pending" && (
                  <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/40 text-xs font-black gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {REGISTRATION_STATUS_LABELS.pending}
                  </Badge>
                )}
                {initialRegistration.status === "rejected" && (
                  <Badge variant="destructive" className="text-xs font-black gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    {REGISTRATION_STATUS_LABELS.rejected}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Ban-list do formato */}
          <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldBan className="h-4 w-4 text-fire-orange" />
                <span>
                  Formato:{" "}
                  <strong className="text-foreground">
                    {tournament.ruleset?.name ?? "Padrão sem formato vinculado"}
                  </strong>
                </span>
                {bannedParts.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-destructive/40 text-destructive font-bold"
                  >
                    {bannedParts.length} peça(s) banida(s)
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/40 text-emerald-500 font-bold"
                  >
                    Sem peças banidas
                  </Badge>
                )}
              </div>

              {bannedParts.length > 0 && (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowBannedList((prev) => !prev)}
                  className="text-[11px] text-primary"
                >
                  {showBannedList ? "Ocultar ban-list" : "Ver peças banidas"}
                </Button>
              )}
            </div>

            {showBannedList && bannedParts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                {bannedParts.map((part) => (
                  <Badge
                    key={part.id}
                    variant="outline"
                    className="text-[10px] border-destructive/40 text-destructive bg-destructive/5"
                  >
                    {part.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Caso 1: Não autenticado */}
          {!userId && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-black text-sm text-foreground">
                  Entre na sua conta para se inscrever
                </div>
                <p className="text-xs text-muted-foreground">
                  Você precisa entrar com Google ou e-mail e ter um perfil de Blader para montar sua decklist (até 4 combos) e enviar o comprovante.
                </p>
              </div>
              <Link
                href={`/auth/login?next=${encodeURIComponent(`/torneios/${tournament.slug}#inscricao`)}`}
                className="shrink-0"
              >
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Entrar / Cadastrar
                </Button>
              </Link>
            </div>
          )}

          {/* Caso 2: Autenticado mas sem Blader vinculado */}
          {userId && !blader && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-black text-sm text-foreground flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-amber-500" />
                  {hasPendingClaim
                    ? "Vínculo de perfil aguardando aprovação"
                    : "Crie ou vincule seu perfil de Blader primeiro"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasPendingClaim
                    ? "Sua solicitação de vínculo em Meu Painel ainda está pendente. Assim que for aprovada, você poderá finalizar sua inscrição."
                    : "Para competir em torneios da OBA, configure seu apelido e perfil em Meu Painel antes de enviar sua decklist."}
                </p>
              </div>
              <Link href="/meu-painel" className="shrink-0">
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-500/90 text-slate-950 font-black text-xs gap-1.5"
                >
                  Ir para Meu Painel
                </Button>
              </Link>
            </div>
          )}

          {/* Caso 3: Vagas esgotadas (sem inscrição prévia) */}
          {userId && blader && isFull && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-xs text-destructive flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-black text-sm">Vagas esgotadas</div>
                <p>
                  Este torneio atingiu o limite máximo de {tournament.max_players}{" "}
                  participantes confirmados.
                </p>
              </div>
            </div>
          )}

          {/* Status existente (Rejeitada / Em análise / Aprovada) */}
          {initialRegistration && (
            <div className="space-y-2">
              {initialRegistration.status === "approved" && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-500 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-sm">
                      Inscrição Confirmada!
                    </div>
                    <p>
                      Sua vaga como{" "}
                      <strong>{blader?.nickname}</strong> está confirmada na lista de participantes do torneio. Nos vemos na arena!
                    </p>
                  </div>
                </div>
              )}

              {initialRegistration.status === "pending" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-500 flex items-start gap-2.5">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-sm">
                      Inscrição em Análise
                    </div>
                    <p>
                      A organização está conferindo sua decklist
                      {isPaid ? " e seu comprovante PIX" : ""}.{" "}
                      {regOpen
                        ? "Enquanto estiver em análise, você ainda pode ajustar seus combos ou reenviar o comprovante abaixo."
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isPaid && (
                        <Badge variant="outline" className="text-[10px]">
                          PIX:{" "}
                          {initialRegistration.payment_verified
                            ? "Verificado ✓"
                            : "Aguardando conferência"}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        Decklist:{" "}
                        {initialRegistration.decks_verified
                          ? "Conferida ✓"
                          : "Aguardando conferência"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {initialRegistration.status === "rejected" && (
                <div className="rounded-xl border border-destructive/45 bg-destructive/10 p-4 text-xs text-destructive flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-sm">
                      Inscrição Rejeitada — Ajuste necessário
                    </div>
                    <p className="text-foreground">
                      <strong>Motivo informado:</strong>{" "}
                      {initialRegistration.rejection_reason ??
                        "Verifique sua decklist ou comprovante PIX."}
                    </p>
                    {regOpen && (
                      <p className="text-muted-foreground">
                        Corrija os dados abaixo e clique em{" "}
                        <strong>Reenviar Inscrição</strong> para voltar à fila de análise.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visualização somente leitura quando aprovada ou inscrições fechadas */}
          {userId && blader && initialRegistration && !canEdit && (
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sua Decklist Enviada ({combos.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {combos.map((combo, idx) => {
                  const display = formatComboDisplay({
                    system: combo.system,
                    blade: combo.bladeId
                      ? (partsById.get(combo.bladeId) ?? null)
                      : null,
                    lockChip: combo.lockChipId
                      ? (partsById.get(combo.lockChipId) ?? null)
                      : null,
                    overBlade: combo.overBladeId
                      ? (partsById.get(combo.overBladeId) ?? null)
                      : null,
                    assistBlade: combo.assistBladeId
                      ? (partsById.get(combo.assistBladeId) ?? null)
                      : null,
                    ratchet: combo.ratchetId
                      ? (partsById.get(combo.ratchetId) ?? null)
                      : null,
                    bit: combo.bitId
                      ? (partsById.get(combo.bitId) ?? null)
                      : null,
                  });
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 space-y-1.5 text-xs ${
                        idx === 3
                          ? "border-dashed border-amber-500/45 bg-amber-500/5"
                          : "border-border/60 bg-background/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant={idx === 3 ? "outline" : "secondary"}
                          className={`text-[10px] font-black px-1.5 py-0 ${
                            idx === 3
                              ? "border-amber-500/50 text-amber-500"
                              : ""
                          }`}
                        >
                          {idx === 3
                            ? "#4 • Depósito (Reserva)"
                            : `Principal #${idx + 1}`}
                        </Badge>
                        {display.system && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-primary/40 text-primary font-black"
                          >
                            {display.system}
                          </Badge>
                        )}
                        <span className="font-bold text-foreground truncate">
                          {display.summaryText}
                        </span>
                      </div>
                      {idx === 3 && (
                        <p className="text-[10px] text-amber-500/90 font-medium">
                          Apenas depósito de peças extras — não aparece diretamente no placar do juiz.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {display.chips.map((chip) => (
                          <Badge
                            key={`${chip.slot}:${chip.name}`}
                            variant="outline"
                            className={`text-[10px] ${CHIP_TONE_CLASSES[chip.tone]}`}
                          >
                            {chip.slot}: {chip.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulário interativo de Decklist + PIX */}
          {canEdit && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* Passo 1: Decklist (até 3 combos principais + 1 depósito de peças extras) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-fire-yellow" />
                      Decklist ({Math.min(combos.length, 3)} / 3 principais
                      {combos.length === 4 ? " + Depósito #4" : ""})
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Monte até <strong>3 combos principais</strong> para a arena +{" "}
                      <strong className="text-amber-500">
                        1 slot opcional (#4) como depósito de peças extras
                      </strong>{" "}
                      para trocas entre rodadas. Peças banidas ficam ocultas.
                    </p>
                  </div>

                  {combos.length < 4 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddCombo}
                      className={`text-xs font-bold gap-1 ${
                        combos.length === 3
                          ? "border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                          : "border-primary/40 text-primary hover:bg-primary/10"
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {combos.length < 3
                        ? `Adicionar Combo Principal (${combos.length}/3)`
                        : "Adicionar Depósito de Peças Extras (#4)"}
                    </Button>
                  )}
                </div>

                {duplicatePartNames.length > 0 && (
                  <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-[11px] text-amber-500 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Aviso: a(s) peça(s){" "}
                      <strong>{duplicatePartNames.join(", ")}</strong> aparece(m) em mais de um combo. Caso o formato exija peças distintas entre os Beys do deck, confira antes de enviar.
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {combos.map((combo, index) => {
                    const isDeposit = index === 3;
                    return (
                      <div
                        key={index}
                        className={`space-y-2 ${
                          isDeposit
                            ? "rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-3"
                            : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={`text-xs font-black border ${
                                isDeposit
                                  ? "bg-amber-500/15 text-amber-500 border-amber-500/50"
                                  : "bg-primary/20 text-primary border-primary/40"
                              }`}
                            >
                              {isDeposit
                                ? "Combo #4 — Depósito de Peças Extras (Reserva)"
                                : `Combo Principal #${index + 1}`}
                            </Badge>
                            {isDeposit && (
                              <span className="text-[11px] text-amber-500/90 font-medium">
                                Não aparece no placar do juiz — uso opcional entre rodadas
                              </span>
                            )}
                            {favoriteComboSelection && !combo.bladeId && (
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                onClick={() => handleApplyFavoriteCombo(index)}
                                className="text-[11px] text-primary hover:bg-primary/10 gap-1"
                              >
                                <Sparkles className="h-3 w-3" />
                                Usar meu Combo Favorito
                              </Button>
                            )}
                          </div>

                          {combos.length > 1 && (
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => handleRemoveCombo(index)}
                              className="text-[11px] text-muted-foreground hover:text-destructive gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              {isDeposit ? "Remover depósito #4" : "Remover combo"}
                            </Button>
                          )}
                        </div>

                        <ComboBuilder
                          parts={parts}
                          value={combo}
                          onChange={(next) => handleComboChange(index, next)}
                          bannedPartIds={bannedPartIds}
                          title={
                            isDeposit
                              ? "Depósito #4 (Reserva) — Peças extras para remontagem"
                              : `Combo Principal #${index + 1} — Busca por nome Takara Tomy ou Hasbro`
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Passo 2: PIX e Comprovante (se torneio pago) */}
              {isPaid && (
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-primary" />
                      Pagamento PIX &amp; Comprovante ({formatCurrencyBRL(entryFee)})
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Faça o PIX usando o QR Code ou Copia e Cola abaixo e anexe o comprovante (imagem ou PDF).
                    </p>
                  </div>

                  {pixReady && leagueSettings?.pix_key && leagueSettings.pix_receiver_name ? (
                    <PixPaymentBox
                      pixKey={leagueSettings.pix_key}
                      receiverName={leagueSettings.pix_receiver_name}
                      city={leagueSettings.pix_city}
                      amount={entryFee}
                      txid={`OBA${blader?.nickname ?? "BLADER"}`}
                      description={tournament.name}
                    />
                  ) : (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-500 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        A organização ainda não cadastrou a chave PIX global no sistema. Entre em contato com a diretoria da OBA antes de efetuar o pagamento.
                      </span>
                    </div>
                  )}

                  {/* Upload do comprovante */}
                  <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground">
                          Comprovante de Pagamento *
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Imagens (JPG, PNG, WebP) são comprimidas automaticamente no navegador; PDF até 5 MB.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          ref={receiptInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleReceiptChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={uploadingReceipt}
                          onClick={() => receiptInputRef.current?.click()}
                          className="text-xs font-bold gap-1.5 border-primary/40 hover:border-primary"
                        >
                          {uploadingReceipt ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 text-primary" />
                          )}
                          {uploadingReceipt
                            ? "Enviando..."
                            : receiptPath
                              ? "Substituir Comprovante"
                              : "Anexar Comprovante"}
                        </Button>
                      </div>
                    </div>

                    {receiptError && (
                      <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-[11px] flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{receiptError}</span>
                      </div>
                    )}

                    {receiptNotice && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[11px] flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{receiptNotice}</span>
                      </div>
                    )}

                    {receiptPath && (
                      <div className="rounded-lg border border-border/50 bg-card/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {isReceiptPdfPath(receiptPath) ? (
                            <div className="h-12 w-12 rounded-lg border border-border/60 bg-primary/10 flex items-center justify-center shrink-0">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                          ) : receiptPreviewUrl ? (
                            <div className="relative h-14 w-14 rounded-lg border border-border/60 overflow-hidden bg-black/30 shrink-0">
                              <Image
                                src={receiptPreviewUrl}
                                alt="Prévia do comprovante PIX"
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-border/60 bg-primary/10 flex items-center justify-center shrink-0">
                              <Receipt className="h-5 w-5 text-primary" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">
                              {receiptLocalName ?? "Comprovante anexado"}
                            </div>
                            <div className="text-[11px] text-emerald-500 font-semibold">
                              Arquivo pronto no servidor privado
                            </div>
                          </div>
                        </div>

                        {receiptPreviewUrl && !receiptPreviewUrl.startsWith("blob:") && (
                          <a
                            href={receiptPreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              className="gap-1 text-[11px]"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Visualizar
                            </Button>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ações finais */}
              {incompleteCombos.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500 space-y-1">
                  <div className="font-bold">
                    Complete todos os combos da decklist antes de enviar:
                  </div>
                  {incompleteCombos.map((item) => (
                    <div key={item.slot} className="text-[11px]">
                      • Combo #{item.slot}: falta {item.missing.join(", ")}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
                <div>
                  {initialRegistration &&
                    !initialRegistration.payment_verified && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={cancelling || submitting}
                        onClick={handleCancelRegistration}
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                      >
                        {cancelling ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Cancelar inscrição
                      </Button>
                    )}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    submitting ||
                    uploadingReceipt ||
                    cancelling ||
                    incompleteCombos.length > 0
                  }
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 px-5"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {initialRegistration
                    ? initialRegistration.status === "rejected"
                      ? "Reenviar Inscrição"
                      : "Atualizar Inscrição"
                    : "Enviar Inscrição"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
