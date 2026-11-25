"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ClipboardCheck,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  AlertCircle,
  AlertTriangle,
  Receipt,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  ExternalLink,
  RefreshCw,
  Loader2,
  RotateCcw,
  FileText,
  Sparkles,
  Plus,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import {
  comboRowToSelection,
  formatComboDisplay,
  type ComboBadgeChip,
} from "@/lib/combo-rules";
import {
  AdminDecklistDialog,
  type DecklistBladerOption,
} from "@/components/admin/AdminDecklistDialog";
import { formatCurrencyBRL } from "@/lib/pix";
import { isReceiptPdfPath } from "@/lib/receipt-upload";
import { updateTournamentRegistrationStatusAction } from "@/app/admin/actions";
import {
  approveRegistrationAction,
  refreshReceiptSignedUrlAction,
  rejectRegistrationAction,
  reopenRegistrationAction,
  toggleRegistrationVerificationAction,
} from "@/app/admin/registrations-actions";
import {
  REGISTRATION_STATUS_LABELS,
  TOURNAMENT_REGISTRATION_STATUS_LABELS,
  type Blader,
  type ComboSelection,
  type PartRow,
  type RegistrationStatus,
  type Tournament,
  type TournamentRegistrationAdminItem,
  type TournamentRegistrationStatus,
} from "@/types/domain";

interface TournamentRegistrationsClientProps {
  tournament: Tournament;
  initialRegistrations: TournamentRegistrationAdminItem[];
  participantsCount: number;
  bannedParts: PartRow[];
  parts?: PartRow[];
  bladers?: Blader[];
}

const CHIP_TONE_CLASSES: Record<ComboBadgeChip["tone"], string> = {
  primary: "border-primary/40 text-primary",
  orange: "border-fire-orange/40 text-fire-orange",
  yellow: "border-fire-yellow/40 text-fire-yellow",
  muted: "border-border/70 text-muted-foreground",
};

const SUGGESTED_REJECTION_REASONS = [
  "Comprovante PIX ilegível ou não corresponde ao valor da inscrição.",
  "Decklist contém peça banida para o formato deste torneio.",
  "Decklist incompleta — confira todos os encaixes obrigatórios dos combos.",
];

export function TournamentRegistrationsClient({
  tournament,
  initialRegistrations,
  participantsCount,
  bannedParts,
  parts = [],
  bladers = [],
}: TournamentRegistrationsClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | RegistrationStatus
  >("all");
  const [search, setSearch] = React.useState("");
  const [regStatus, setRegStatus] =
    React.useState<TournamentRegistrationStatus>(
      tournament.registration_status
    );
  const [updatingRegStatus, setUpdatingRegStatus] = React.useState(false);

  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [feedbackError, setFeedbackError] = React.useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string | null>(
    null
  );

  // Modal de Comprovante
  const [receiptModalItem, setReceiptModalItem] =
    React.useState<TournamentRegistrationAdminItem | null>(null);
  const [overrideReceiptUrls, setOverrideReceiptUrls] = React.useState<
    Record<string, string>
  >({});
  const [refreshingUrl, setRefreshingUrl] = React.useState(false);

  // Modal de Rejeição
  const [rejectModalItem, setRejectModalItem] =
    React.useState<TournamentRegistrationAdminItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

  // Modal de Decklist Manual / Edição
  const [decklistModalOpen, setDecklistModalOpen] = React.useState(false);
  const [decklistTargetBlader, setDecklistTargetBlader] =
    React.useState<DecklistBladerOption | null>(null);
  const [decklistInitialCombos, setDecklistInitialCombos] = React.useState<
    ComboSelection[]
  >([]);

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartRow>();
    for (const p of parts) map.set(p.id, p);
    return map;
  }, [parts]);

  const availableBladersForManual = React.useMemo<DecklistBladerOption[]>(() => {
    return bladers.map((b) => ({
      id: b.id,
      nickname: b.nickname,
      name: b.name,
    }));
  }, [bladers]);

  const openManualDecklistModal = () => {
    setDecklistTargetBlader(null);
    setDecklistInitialCombos([]);
    setDecklistModalOpen(true);
  };

  const openEditDecklistModal = (item: TournamentRegistrationAdminItem) => {
    if (!item.blader) return;
    setDecklistTargetBlader({
      id: item.blader.id,
      nickname: item.blader.nickname,
      name: item.blader.name,
    });
    setDecklistInitialCombos(
      item.combos.map((c) =>
        comboRowToSelection(
          {
            system: c.system,
            blade_id: c.blade?.id ?? null,
            lock_chip_id: c.lockChip?.id ?? null,
            over_blade_id: c.overBlade?.id ?? null,
            assist_blade_id: c.assistBlade?.id ?? null,
            ratchet_id: c.ratchet?.id ?? null,
            bit_id: c.bit?.id ?? null,
          },
          partsById
        )
      )
    );
    setDecklistModalOpen(true);
  };

  const entryFee = Number(tournament.entry_fee ?? 0);
  const isPaidTournament = entryFee > 0;

  const pendingCount = initialRegistrations.filter(
    (r) => r.status === "pending"
  ).length;
  const approvedCount = initialRegistrations.filter(
    (r) => r.status === "approved"
  ).length;
  const rejectedCount = initialRegistrations.filter(
    (r) => r.status === "rejected"
  ).length;

  const filteredRegistrations = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialRegistrations.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const nick = item.blader?.nickname?.toLowerCase() ?? "";
      const name = item.blader?.name?.toLowerCase() ?? "";
      return nick.includes(q) || name.includes(q);
    });
  }, [initialRegistrations, statusFilter, search]);

  const handleTournamentRegStatusChange = async (
    nextStatus: TournamentRegistrationStatus
  ) => {
    setRegStatus(nextStatus);
    setUpdatingRegStatus(true);
    setFeedbackError(null);
    setFeedbackMessage(null);

    const res = await updateTournamentRegistrationStatusAction(
      tournament.id,
      nextStatus
    );
    setUpdatingRegStatus(false);

    if (res.error) {
      setRegStatus(tournament.registration_status);
      setFeedbackError(res.error);
      return;
    }

    setFeedbackMessage(
      `Status de inscrição atualizado para: ${TOURNAMENT_REGISTRATION_STATUS_LABELS[nextStatus]}.`
    );
    router.refresh();
  };

  const handleToggleVerification = async (
    registrationId: string,
    field: "payment_verified" | "decks_verified",
    nextValue: boolean
  ) => {
    setBusyKey(`${registrationId}:${field}`);
    setFeedbackError(null);
    setFeedbackMessage(null);

    const res = await toggleRegistrationVerificationAction(
      registrationId,
      field,
      nextValue
    );
    setBusyKey(null);

    if (res.error) {
      setFeedbackError(res.error);
      return;
    }

    router.refresh();
  };

  const handleApprove = async (registrationId: string) => {
    setBusyKey(`${registrationId}:approve`);
    setFeedbackError(null);
    setFeedbackMessage(null);

    const res = await approveRegistrationAction(registrationId);
    setBusyKey(null);

    if (res.error) {
      setFeedbackError(res.error);
      return;
    }

    setFeedbackMessage(
      "Inscrição aprovada e Blader confirmado na lista de participantes!"
    );
    router.refresh();
  };

  const handleReopen = async (registrationId: string) => {
    setBusyKey(`${registrationId}:reopen`);
    setFeedbackError(null);
    setFeedbackMessage(null);

    const res = await reopenRegistrationAction(registrationId);
    setBusyKey(null);

    if (res.error) {
      setFeedbackError(res.error);
      return;
    }

    setFeedbackMessage(
      res.warning ?? "Inscrição retornada para Em Análise (pendente)."
    );
    router.refresh();
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem) return;

    setBusyKey(`${rejectModalItem.id}:reject`);
    setFeedbackError(null);
    setFeedbackMessage(null);

    const res = await rejectRegistrationAction(rejectModalItem.id, rejectReason);
    setBusyKey(null);

    if (res.error) {
      setFeedbackError(res.error);
      return;
    }

    setRejectModalItem(null);
    setRejectReason("");
    setFeedbackMessage(
      res.warning ?? "Inscrição rejeitada e motivo enviado ao painel do Blader."
    );
    router.refresh();
  };

  const handleRefreshSignedUrl = async (registrationId: string) => {
    setRefreshingUrl(true);
    const res = await refreshReceiptSignedUrlAction(registrationId);
    setRefreshingUrl(false);

    if (res.error) {
      setFeedbackError(res.error);
      return;
    }
    if (res.signedUrl) {
      setOverrideReceiptUrls((prev) => ({
        ...prev,
        [registrationId]: res.signedUrl,
      }));
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
            {REGISTRATION_STATUS_LABELS[status]}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-[10px] font-bold">
            {REGISTRATION_STATUS_LABELS[status]}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/40 text-[10px] font-bold">
            {REGISTRATION_STATUS_LABELS[status]}
          </Badge>
        );
    }
  };

  const activeReceiptUrl = receiptModalItem
    ? (overrideReceiptUrls[receiptModalItem.id] ??
      receiptModalItem.receiptSignedUrl)
    : null;
  const activeReceiptIsPdf = isReceiptPdfPath(receiptModalItem?.receipt_path);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/torneios"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para Torneios
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/torneios/${tournament.slug}`} target="_blank">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Página Pública
              </Button>
            </Link>

            <Link href={`/admin/torneios/${tournament.id}/chaveamento`}>
              <Button
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-600/90 text-white text-xs font-bold gap-1.5"
              >
                <GitBranch className="h-3.5 w-3.5" />
                Ir para Chaveamento
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              Inscrições — {tournament.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>
                Taxa:{" "}
                <strong className="text-foreground">
                  {isPaidTournament ? formatCurrencyBRL(entryFee) : "Gratuito"}
                </strong>
              </span>
              <span>•</span>
              <span>
                Formato/Regras:{" "}
                <strong className="text-foreground">
                  {tournament.ruleset?.name ?? "Sem formato definido"}
                </strong>
              </span>
              {bannedParts.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-fire-orange font-semibold">
                    {bannedParts.length} peça(s) banida(s)
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {parts.length > 0 && bladers.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={openManualDecklistModal}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Decklist Manual
              </Button>
            )}
            <span className="text-xs font-semibold text-muted-foreground">
              Inscrições Online:
            </span>
            {updatingRegStatus && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            )}
            <select
              value={regStatus}
              disabled={updatingRegStatus}
              onChange={(e) =>
                handleTournamentRegStatusChange(
                  e.target.value as TournamentRegistrationStatus
                )
              }
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="closed">🔒 Fechadas</option>
              <option value="open">🟢 Abertas</option>
              <option value="finished">🏁 Encerradas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedbackError && (
        <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{feedbackError}</span>
        </div>
      )}

      {feedbackMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-semibold">Confirmados / Vagas</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl font-black text-foreground tabular-nums">
              {participantsCount}
              {tournament.max_players ? ` / ${tournament.max_players}` : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-semibold">Em Análise</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-500 tabular-nums">
              {pendingCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-semibold">Aprovadas</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-emerald-500 tabular-nums">
              {approvedCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-semibold">Rejeitadas</span>
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-xl font-black text-destructive tabular-nums">
              {rejectedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", `Todas (${initialRegistrations.length})`],
              ["pending", `Pendentes (${pendingCount})`],
              ["approved", `Aprovadas (${approvedCount})`],
              ["rejected", `Rejeitadas (${rejectedCount})`],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="xs"
              variant={statusFilter === key ? "default" : "outline"}
              onClick={() => setStatusFilter(key)}
              className="font-bold"
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Blader..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Lista de Inscrições */}
      {filteredRegistrations.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-10 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ClipboardCheck className="h-9 w-9" />
            <p className="text-sm font-bold text-foreground">
              Nenhuma inscrição encontrada neste filtro
            </p>
            <p className="text-xs max-w-md">
              Quando os Bladers enviarem suas decklists e comprovantes pela página pública do torneio, elas aparecerão aqui para conferência.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRegistrations.map((item) => {
            const isApproving = busyKey === `${item.id}:approve`;
            const isReopening = busyKey === `${item.id}:reopen`;
            const isTogglingPay = busyKey === `${item.id}:payment_verified`;
            const isTogglingDeck = busyKey === `${item.id}:decks_verified`;
            const hasReceipt = Boolean(item.receipt_path);

            return (
              <Card
                key={item.id}
                className={`border-border/60 bg-card/60 ${
                  item.hasBannedParts
                    ? "border-destructive/50"
                    : item.status === "pending"
                      ? "border-amber-500/35"
                      : ""
                }`}
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Cabeçalho da inscrição */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <BladerAvatar
                        avatarUrl={item.blader?.avatar_url}
                        nickname={item.blader?.nickname}
                        sizeClass="h-11 w-11"
                        textClass="text-sm font-black text-primary"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-base text-foreground truncate">
                            {item.blader?.nickname ?? "Blader removido"}
                          </span>
                          {getStatusBadge(item.status)}
                          {item.isParticipant && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-500/40 text-emerald-500 font-bold"
                            >
                              No Chaveamento
                            </Badge>
                          )}
                          {item.hasBannedParts && (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Peça Banida
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                          <span>{item.blader?.name}</span>
                          <span>•</span>
                          <span>Enviado em {formatDateTime(item.updated_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botões de conferência e ação */}
                    <div className="flex flex-wrap items-center gap-2">
                      {hasReceipt && (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setReceiptModalItem(item)}
                          className="gap-1 font-bold border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Ver Comprovante
                        </Button>
                      )}

                      {parts.length > 0 && item.blader && (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => openEditDecklistModal(item)}
                          className="gap-1 font-bold border-border/80"
                        >
                          <Pencil className="h-3 w-3 text-primary" />
                          Editar Decklist
                        </Button>
                      )}

                      {isPaidTournament && (
                        <Button
                          type="button"
                          size="xs"
                          variant={item.payment_verified ? "default" : "outline"}
                          disabled={isTogglingPay}
                          onClick={() =>
                            handleToggleVerification(
                              item.id,
                              "payment_verified",
                              !item.payment_verified
                            )
                          }
                          className={`gap-1 font-bold ${
                            item.payment_verified
                              ? "bg-emerald-600 hover:bg-emerald-600/90 text-white"
                              : ""
                          }`}
                        >
                          {isTogglingPay ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : item.payment_verified ? (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          {item.payment_verified ? "PIX OK" : "Confirmar PIX"}
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="xs"
                        variant={item.decks_verified ? "default" : "outline"}
                        disabled={isTogglingDeck}
                        onClick={() =>
                          handleToggleVerification(
                            item.id,
                            "decks_verified",
                            !item.decks_verified
                          )
                        }
                        className={`gap-1 font-bold ${
                          item.decks_verified
                            ? "bg-emerald-600 hover:bg-emerald-600/90 text-white"
                            : ""
                        }`}
                      >
                        {isTogglingDeck ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : item.decks_verified ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {item.decks_verified ? "Deck OK" : "Conferir Deck"}
                      </Button>

                      {item.status !== "approved" && (
                        <Button
                          type="button"
                          size="xs"
                          disabled={isApproving || item.hasBannedParts}
                          onClick={() => handleApprove(item.id)}
                          className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold gap-1"
                        >
                          {isApproving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Aprovar
                        </Button>
                      )}

                      {item.status !== "rejected" && (
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          onClick={() => {
                            setRejectModalItem(item);
                            setRejectReason(item.rejection_reason ?? "");
                          }}
                          className="font-bold gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rejeitar
                        </Button>
                      )}

                      {item.status !== "pending" && (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          disabled={isReopening}
                          onClick={() => handleReopen(item.id)}
                          className="gap-1 text-muted-foreground hover:text-foreground"
                          title="Voltar status para Em Análise"
                        >
                          {isReopening ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Alerta de comprovante ausente em torneio pago */}
                  {isPaidTournament && !hasReceipt && !item.payment_verified && (
                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-500 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Nenhum comprovante PIX anexado para este torneio pago.
                      </span>
                    </div>
                  )}

                  {/* Motivo de rejeição */}
                  {item.status === "rejected" && item.rejection_reason && (
                    <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <strong>Motivo da rejeição:</strong>{" "}
                      {item.rejection_reason}
                    </div>
                  )}

                  {/* Decklist */}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-fire-yellow" />
                      Decklist Submetida ({item.combos.length}{" "}
                      {item.combos.length === 1 ? "combo" : "combos"})
                    </div>

                    {item.combos.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Nenhum combo salvo nesta inscrição.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {item.combos.map((combo) => {
                          const display = formatComboDisplay(combo);
                          return (
                            <div
                              key={combo.id ?? combo.slotNumber}
                              className={`rounded-lg border p-3 space-y-1.5 text-xs ${
                                combo.hasBannedPart
                                  ? "border-destructive/50 bg-destructive/5"
                                  : "border-border/50 bg-background/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-black px-1.5 py-0"
                                  >
                                    #{combo.slotNumber}
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
                                    {display.summaryText || "Combo incompleto"}
                                  </span>
                                </div>

                                {combo.hasBannedPart && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] shrink-0"
                                  >
                                    Banida
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {display.chips.map((chip) => (
                                  <Badge
                                    key={`${chip.slot}:${chip.name}`}
                                    variant="outline"
                                    className={`text-[10px] font-semibold ${CHIP_TONE_CLASSES[chip.tone]}`}
                                  >
                                    {chip.slot}: {chip.name}
                                  </Badge>
                                ))}
                              </div>

                              {combo.hasBannedPart &&
                                combo.bannedPartNames &&
                                combo.bannedPartNames.length > 0 && (
                                  <p className="text-[11px] text-destructive font-semibold">
                                    Peça banida no formato:{" "}
                                    {combo.bannedPartNames.join(", ")}
                                  </p>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Visualização de Comprovante */}
      <Dialog
        open={Boolean(receiptModalItem)}
        onOpenChange={(open) => {
          if (!open) setReceiptModalItem(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Comprovante PIX — {receiptModalItem?.blader?.nickname}
            </DialogTitle>
          </DialogHeader>

          {receiptModalItem && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Valor esperado:{" "}
                  <strong className="text-foreground">
                    {isPaidTournament ? formatCurrencyBRL(entryFee) : "Gratuito"}
                  </strong>
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={refreshingUrl}
                    onClick={() => handleRefreshSignedUrl(receiptModalItem.id)}
                    className="gap-1"
                  >
                    {refreshingUrl ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Renovar Link
                  </Button>

                  {activeReceiptUrl && (
                    <a
                      href={activeReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button type="button" size="xs" variant="outline" className="gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Abrir em nova aba
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {!activeReceiptUrl ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                  Não foi possível carregar o link temporário do comprovante. Tente clicar em &ldquo;Renovar Link&rdquo;.
                </div>
              ) : activeReceiptIsPdf ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Comprovante em PDF</span>
                  </div>
                  <iframe
                    src={activeReceiptUrl}
                    title={`Comprovante PDF ${receiptModalItem.blader?.nickname ?? ""}`}
                    className="w-full h-[60vh] rounded-lg border border-border/60 bg-white"
                  />
                </div>
              ) : (
                <div className="relative w-full rounded-xl border border-border/60 bg-black/40 overflow-hidden flex items-center justify-center p-2">
                  <Image
                    src={activeReceiptUrl}
                    alt={`Comprovante PIX de ${receiptModalItem.blader?.nickname ?? "Blader"}`}
                    width={900}
                    height={1200}
                    unoptimized
                    className="max-h-[62vh] w-auto h-auto object-contain rounded-lg"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/40">
                {isPaidTournament && (
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      receiptModalItem.payment_verified ? "outline" : "default"
                    }
                    onClick={async () => {
                      const next = !receiptModalItem.payment_verified;
                      await handleToggleVerification(
                        receiptModalItem.id,
                        "payment_verified",
                        next
                      );
                      setReceiptModalItem((prev) =>
                        prev ? { ...prev, payment_verified: next } : null
                      );
                    }}
                    className="text-xs font-bold gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {receiptModalItem.payment_verified
                      ? "Desmarcar PIX OK"
                      : "Marcar PIX como Verificado"}
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setReceiptModalItem(null)}
                  className="text-xs"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição com Motivo */}
      <Dialog
        open={Boolean(rejectModalItem)}
        onOpenChange={(open) => {
          if (!open) setRejectModalItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground">
              Rejeitar Inscrição — {rejectModalItem?.blader?.nickname}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Informe o motivo da rejeição. O Blader verá esta mensagem no painel dele e poderá corrigir os combos ou reenviar o comprovante.
            </p>

            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground">
                Sugestões rápidas:
              </div>
              <div className="flex flex-col gap-1.5">
                {SUGGESTED_REJECTION_REASONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setRejectReason(suggestion)}
                    className="text-left text-[11px] rounded-md border border-border/60 bg-background/60 hover:border-primary/50 px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reject-reason" className="text-xs font-semibold">
                Motivo da rejeição *
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                maxLength={400}
                required
                placeholder="Descreva o que o Blader precisa ajustar..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectModalItem(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                disabled={
                  !rejectModalItem ||
                  busyKey === `${rejectModalItem.id}:reject` ||
                  rejectReason.trim().length < 3
                }
                className="text-xs font-bold gap-1.5"
              >
                {rejectModalItem &&
                  busyKey === `${rejectModalItem.id}:reject` && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                Confirmar Rejeição
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AdminDecklistDialog
        open={decklistModalOpen}
        onOpenChange={setDecklistModalOpen}
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        blader={decklistTargetBlader}
        availableBladers={availableBladersForManual}
        initialCombos={decklistInitialCombos}
        parts={parts}
        bannedParts={bannedParts}
        onSaved={() => {
          setFeedbackMessage(
            "Decklist salva e aprovada com sucesso! Combos já disponíveis no Placar do Juiz."
          );
          router.refresh();
        }}
      />
    </div>
  );
}
