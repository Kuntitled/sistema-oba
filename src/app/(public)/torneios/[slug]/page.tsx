import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Users,
  ChevronLeft,
  ShieldCheck,
  Tv,
  ClipboardCheck,
  Trophy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getTournamentBySlug } from "@/lib/services/league";
import { getPublicTournamentLiveData } from "@/lib/services/tournament-live";
import { getPartsCatalog } from "@/lib/services/parts";
import {
  getBladerTournamentRegistration,
  getLeagueSettings,
  getRulesetBannedParts,
} from "@/lib/services/registrations";
import { formatCurrencyBRL } from "@/lib/pix";
import { sanitizeHttpUrl } from "@/lib/tournament-card-canvas";
import { PublicTournamentLive } from "@/components/tournament/PublicTournamentLive";
import { TournamentBanlistButton } from "@/components/tournament/TournamentBanlistButton";
import { TournamentPromoCardButton } from "@/components/tournament/TournamentPromoCardButton";
import { TournamentRegistrationClient } from "@/components/tournament/TournamentRegistrationClient";
import {
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  type BladerRow,
} from "@/types/domain";

export default async function TorneioDetalhePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getTournamentBySlug(slug);

  if (!data) {
    notFound();
  }

  const { tournament, results } = data;
  const supabase = await createClient();

  const [liveData, userRes] = await Promise.all([
    getPublicTournamentLiveData(tournament.id),
    supabase.auth.getUser(),
  ]);

  const user = userRes.data.user ?? null;
  let blader: BladerRow | null = null;
  let hasPendingClaim = false;

  if (user) {
    const { data: bladerRow } = await supabase
      .from("bladers")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    blader = bladerRow ?? null;

    if (!blader) {
      const { data: claimRow } = await supabase
        .from("blader_claim_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      hasPendingClaim = Boolean(claimRow);
    }
  }

  const existingRegData = blader
    ? await getBladerTournamentRegistration(tournament.id, blader.id)
    : { registration: null, combos: [], receiptSignedUrl: null };

  const shouldLoadRegistrationCatalog =
    tournament.registration_status === "open" ||
    Boolean(existingRegData.registration);

  const entryFee = Number(tournament.entry_fee ?? 0);

  const [partsRes, bansRes, settingsRes] = await Promise.all([
    shouldLoadRegistrationCatalog
      ? getPartsCatalog({ includeInactive: false })
      : Promise.resolve({ parts: [], schemaMissing: false }),
    tournament.ruleset_id
      ? getRulesetBannedParts(tournament.ruleset_id)
      : Promise.resolve({ bannedPartIds: [], bannedParts: [] }),
    shouldLoadRegistrationCatalog && entryFee > 0
      ? getLeagueSettings()
      : Promise.resolve({ settings: null, schemaMissing: false }),
  ]);

  const showRegistrationPriority =
    tournament.registration_status === "open" ||
    Boolean(existingRegData.registration);

  const safeMapsUrl = sanitizeHttpUrl(tournament.location_url);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl space-y-8">
      {/* Voltar */}
      <Link
        href="/torneios"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para todos os torneios
      </Link>

      {/* Header do Torneio */}
      <Card className="border-border/60 bg-gradient-to-b from-card to-card/60 overflow-hidden shadow-lg">
        <div className="h-2 bg-gradient-to-r from-primary via-fire-orange to-fire-yellow" />
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={tournament.status === "ongoing" ? "default" : "secondary"}
              className={
                tournament.status === "ongoing"
                  ? "bg-fire-orange text-slate-950 font-bold animate-pulse"
                  : ""
              }
            >
              {TOURNAMENT_STATUS_LABELS[tournament.status]}
            </Badge>
            <Badge
              variant="outline"
              className={
                tournament.category === "oficial"
                  ? "border-fire-yellow/50 text-fire-yellow bg-fire-yellow/10 font-bold"
                  : tournament.category === "amistoso"
                    ? "border-sky-500/50 text-sky-400 bg-sky-500/10 font-bold"
                    : "border-border/60"
              }
            >
              {TOURNAMENT_CATEGORY_LABELS[tournament.category ?? "semanal"]}
              {tournament.category === "amistoso" ? " • Sem Ranking" : ""}
            </Badge>
            <Badge variant="outline" className="border-border/60">
              {TOURNAMENT_FORMAT_LABELS[tournament.format]}
            </Badge>
            {tournament.ruleset && (
              <Badge
                variant="outline"
                className="border-primary/40 text-primary bg-primary/10"
              >
                Regras: {tournament.ruleset.name}
              </Badge>
            )}
            {tournament.season && (
              <Badge variant="secondary">{tournament.season.name}</Badge>
            )}
            {tournament.registration_status === "open" && (
              <Badge className="bg-emerald-600 text-white font-bold">
                Inscrições Abertas •{" "}
                {entryFee > 0 ? formatCurrencyBRL(entryFee) : "Gratuito"}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
            {tournament.name}
          </h1>

          {tournament.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tournament.description}
            </p>
          )}

          {tournament.prize_info && (
            <div className="rounded-xl border border-fire-yellow/35 bg-fire-yellow/10 p-3.5 flex items-start gap-2.5 text-xs">
              <Trophy className="h-4 w-4 text-fire-yellow shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0">
                <div className="font-bold uppercase tracking-wider text-[10px] text-fire-yellow">
                  Premiação Oficial
                </div>
                <div className="text-foreground font-medium whitespace-pre-line leading-relaxed">
                  {tournament.prize_info}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                {formatDate(tournament.event_date)}
              </span>
              {tournament.event_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-fire-yellow" />
                  {tournament.event_time}
                </span>
              )}
              {(tournament.location || safeMapsUrl) && (
                <span className="flex items-center gap-1.5 flex-wrap">
                  <MapPin className="h-4 w-4 text-fire-orange" />
                  <span>{tournament.location || "Localização do Evento"}</span>
                  {safeMapsUrl && (
                    <a
                      href={safeMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline ml-0.5"
                    >
                      Ver no Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </span>
              )}
              {tournament.max_players && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Capacidade: {tournament.max_players} Bladers
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TournamentPromoCardButton
                variant="public"
                tournament={{
                  id: tournament.id,
                  updated_at: tournament.updated_at,
                  name: tournament.name,
                  slug: tournament.slug,
                  event_date: tournament.event_date,
                  event_time: tournament.event_time,
                  category: tournament.category ?? "semanal",
                  format: tournament.format,
                  swiss_rounds: tournament.swiss_rounds ?? 4,
                  location: tournament.location,
                  location_url: tournament.location_url,
                  rulesetName: tournament.ruleset?.name ?? null,
                  bannedCount: bansRes.bannedParts.length,
                  seasonName: tournament.season?.name ?? null,
                  registration_status:
                    tournament.registration_status ?? "closed",
                  entry_fee: tournament.entry_fee ?? 0,
                  max_players: tournament.max_players ?? null,
                  prize_info: tournament.prize_info,
                  description: tournament.description,
                }}
              />

              {tournament.ruleset && (
                <TournamentBanlistButton
                  rulesetName={tournament.ruleset.name}
                  rulesetDescription={tournament.ruleset.description}
                  bannedParts={bansRes.bannedParts}
                  tournamentSubtitle={`${tournament.name} • ${formatDate(tournament.event_date)}`}
                />
              )}

              <Link href={`/torneios/${tournament.slug}/telao`} target="_blank">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1.5 border-primary/40 hover:border-primary"
                >
                  <Tv className="h-3.5 w-3.5 text-fire-orange" />
                  Modo Telão (TV)
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {showRegistrationPriority && (
        <TournamentRegistrationClient
          tournament={tournament}
          confirmedParticipantsCount={liveData.participants.length}
          userId={user?.id ?? null}
          blader={blader}
          hasPendingClaim={hasPendingClaim}
          parts={partsRes.parts}
          bannedParts={bansRes.bannedParts}
          leagueSettings={settingsRes.settings}
          initialRegistration={existingRegData.registration}
          initialCombos={existingRegData.combos}
          initialReceiptSignedUrl={existingRegData.receiptSignedUrl}
        />
      )}

      {/* Arenas ao Vivo, Chaveamento e Resultados */}
      <PublicTournamentLive
        initialTournament={liveData.tournament ?? tournament}
        initialParticipants={liveData.participants}
        initialMatches={liveData.matches}
        initialGames={liveData.games}
        initialArenas={liveData.arenas}
        results={results}
      />

      {!showRegistrationPriority && (
        <TournamentRegistrationClient
          tournament={tournament}
          confirmedParticipantsCount={liveData.participants.length}
          userId={user?.id ?? null}
          blader={blader}
          hasPendingClaim={hasPendingClaim}
          parts={partsRes.parts}
          bannedParts={bansRes.bannedParts}
          leagueSettings={settingsRes.settings}
          initialRegistration={existingRegData.registration}
          initialCombos={existingRegData.combos}
          initialReceiptSignedUrl={existingRegData.receiptSignedUrl}
        />
      )}

      {/* Atalho discreto para organização */}
      <div className="pt-4 border-t border-border/40 flex flex-wrap items-center justify-end gap-2">
        <Link href={`/admin/torneios/${tournament.id}/inscricoes`}>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
            Gerenciar Inscrições (Admin)
          </Button>
        </Link>
        <Link href={`/admin/torneios/${tournament.id}/chaveamento`}>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Gerenciar Chaveamento (Admin)
          </Button>
        </Link>
      </div>
    </div>
  );
}
