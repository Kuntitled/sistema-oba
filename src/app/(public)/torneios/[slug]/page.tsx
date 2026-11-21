import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  ChevronLeft,
  ShieldCheck,
  Tv,
  ClipboardCheck,
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
import { PublicTournamentLive } from "@/components/tournament/PublicTournamentLive";
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

  const [partsRes, bansRes, settingsRes] = shouldLoadRegistrationCatalog
    ? await Promise.all([
        getPartsCatalog({ includeInactive: false }),
        getRulesetBannedParts(tournament.ruleset_id),
        entryFee > 0
          ? getLeagueSettings()
          : Promise.resolve({ settings: null, schemaMissing: false }),
      ])
    : [
        { parts: [], schemaMissing: false },
        { bannedPartIds: [], bannedParts: [] },
        { settings: null, schemaMissing: false },
      ];

  const showRegistrationPriority =
    tournament.registration_status === "open" ||
    Boolean(existingRegData.registration);

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
            <Badge variant="outline" className="border-border/60">
              {TOURNAMENT_CATEGORY_LABELS[tournament.category ?? "semanal"]}
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

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                {formatDate(tournament.event_date)}
              </span>
              {tournament.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-fire-orange" />
                  {tournament.location}
                </span>
              )}
              {tournament.max_players && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Capacidade: {tournament.max_players} Bladers
                </span>
              )}
            </div>

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
