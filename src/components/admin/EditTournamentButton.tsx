"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
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
import { updateTournamentAction } from "@/app/admin/actions";
import type {
  RulesetRow,
  Tournament,
  TournamentCategory,
  TournamentFormat,
  TournamentRegistrationStatus,
  TournamentStatus,
} from "@/types/domain";

export function EditTournamentButton({
  tournament,
  rulesets = [],
  pixConfigured = false,
}: {
  tournament: Tournament;
  rulesets?: RulesetRow[];
  pixConfigured?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [name, setName] = React.useState(tournament.name);
  const [eventDate, setEventDate] = React.useState(tournament.event_date);
  const [status, setStatus] = React.useState<TournamentStatus>(tournament.status);
  const [category, setCategory] = React.useState<TournamentCategory>(
    tournament.category ?? "semanal"
  );
  const [format, setFormat] = React.useState<TournamentFormat>(tournament.format);
  const [rulesetId, setRulesetId] = React.useState<string>(
    tournament.ruleset_id ?? ""
  );
  const [swissRounds, setSwissRounds] = React.useState(
    String(tournament.swiss_rounds ?? 4)
  );
  const [registrationStatus, setRegistrationStatus] =
    React.useState<TournamentRegistrationStatus>(
      tournament.registration_status ?? "closed"
    );
  const [entryFee, setEntryFee] = React.useState(
    String(tournament.entry_fee ?? 0)
  );
  const [maxPlayers, setMaxPlayers] = React.useState(
    tournament.max_players ? String(tournament.max_players) : ""
  );
  const [location, setLocation] = React.useState(tournament.location ?? "");
  const [locationUrl, setLocationUrl] = React.useState(
    tournament.location_url ?? ""
  );
  const [eventTime, setEventTime] = React.useState(tournament.event_time ?? "");
  const [prizeInfo, setPrizeInfo] = React.useState(tournament.prize_info ?? "");
  const [description, setDescription] = React.useState(
    tournament.description ?? ""
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(tournament.name);
      setEventDate(tournament.event_date);
      setStatus(tournament.status);
      setCategory(tournament.category ?? "semanal");
      setFormat(tournament.format);
      setRulesetId(tournament.ruleset_id ?? "");
      setSwissRounds(String(tournament.swiss_rounds ?? 4));
      setRegistrationStatus(tournament.registration_status ?? "closed");
      setEntryFee(String(tournament.entry_fee ?? 0));
      setMaxPlayers(
        tournament.max_players ? String(tournament.max_players) : ""
      );
      setLocation(tournament.location ?? "");
      setLocationUrl(tournament.location_url ?? "");
      setEventTime(tournament.event_time ?? "");
      setPrizeInfo(tournament.prize_info ?? "");
      setDescription(tournament.description ?? "");
      setError(null);
      setSuccess(false);
    }
  };

  const parsedEntryFee = Number(entryFee.replace(",", ".")) || 0;

  const handleCategoryChange = (nextCategory: TournamentCategory) => {
    setCategory(nextCategory);
    setFormat(nextCategory === "oficial" ? "swiss_top_cut" : "swiss_only");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("event_date", eventDate);
    formData.set("status", status);
    formData.set("category", category);
    formData.set("format", format);
    if (rulesets.length > 0) {
      formData.set("ruleset_id", rulesetId);
    }
    formData.set("swiss_rounds", swissRounds);
    formData.set("registration_status", registrationStatus);
    formData.set("entry_fee", entryFee);
    formData.set("max_players", maxPlayers);
    formData.set("location", location);
    formData.set("location_url", locationUrl);
    formData.set("event_time", eventTime);
    formData.set("prize_info", prizeInfo);
    formData.set("description", description);

    const result = await updateTournamentAction(tournament.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 700);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => handleOpenChange(true)}
        className="h-8 text-xs font-semibold gap-1.5 border-border/80"
        title="Editar Torneio"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              Editar Torneio OBA
            </DialogTitle>
          </DialogHeader>

          {tournament.status === "finished" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Torneio já encerrado. Alterar categoria, formato ou data
                recalcula automaticamente os resultados publicados e o ranking da
                temporada.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Torneio atualizado com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label
                htmlFor={`edit-t-name-${tournament.id}`}
                className="text-xs font-semibold"
              >
                Nome da Etapa / Torneio *
              </Label>
              <Input
                id={`edit-t-name-${tournament.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-date-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Data do Torneio *
                </Label>
                <Input
                  id={`edit-t-date-${tournament.id}`}
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-status-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Situação
                </Label>
                <select
                  id={`edit-t-status-${tournament.id}`}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as TournamentStatus)
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="open">🟢 Inscrições Abertas</option>
                  <option value="ongoing">🔥 Em Andamento</option>
                  <option value="finished">🏆 Encerrado</option>
                  <option value="draft">📝 Rascunho</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-category-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Categoria
                </Label>
                <select
                  id={`edit-t-category-${tournament.id}`}
                  value={category}
                  onChange={(e) =>
                    handleCategoryChange(e.target.value as TournamentCategory)
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="semanal">Semanal (100 / 75 / 50)</option>
                  <option value="oficial">Oficial (200 / 150 / 100)</option>
                  <option value="amistoso">Amistoso (Sem pontos no ranking)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-format-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Formato OBA
                </Label>
                <select
                  id={`edit-t-format-${tournament.id}`}
                  value={format}
                  onChange={(e) =>
                    setFormat(e.target.value as TournamentFormat)
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="swiss_only">Exclusivamente Suíço</option>
                  <option value="swiss_top_cut">
                    Suíço + Top Cut (+15 Líder)
                  </option>
                  {tournament.format === "swiss" && (
                    <option value="swiss">Sistema Suíço (Legado)</option>
                  )}
                  {tournament.format === "single_elim" && (
                    <option value="single_elim">Mata-mata Simples</option>
                  )}
                  {tournament.format === "double_elim" && (
                    <option value="double_elim">Mata-mata Duplo</option>
                  )}
                </select>
              </div>
            </div>

            {category === "amistoso" && (
              <div className="rounded-lg border border-sky-500/35 bg-sky-500/10 p-2.5 text-[11px] text-sky-400">
                Modalidade <strong>Amistoso</strong>: não soma pontos, vitórias no Suíço nem pódios no Ranking Oficial da temporada.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-rounds-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Rodadas Suíço
                </Label>
                <Input
                  id={`edit-t-rounds-${tournament.id}`}
                  type="number"
                  min={1}
                  max={10}
                  value={swissRounds}
                  onChange={(e) => setSwissRounds(e.target.value)}
                  className="h-9 text-xs text-center font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-location-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Local
                </Label>
                <Input
                  id={`edit-t-location-${tournament.id}`}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Arena..."
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-time-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Horário(s) (Opcional)
                </Label>
                <Input
                  id={`edit-t-time-${tournament.id}`}
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="Ex: Check-in 13h30 • Início 14h00"
                  maxLength={120}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-maps-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Link Google Maps (Opcional)
                </Label>
                <Input
                  id={`edit-t-maps-${tournament.id}`}
                  type="url"
                  value={locationUrl}
                  onChange={(e) => setLocationUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`edit-t-prize-${tournament.id}`}
                className="text-xs font-semibold"
              >
                Premiação (Opcional)
              </Label>
              <Textarea
                id={`edit-t-prize-${tournament.id}`}
                value={prizeInfo}
                onChange={(e) => setPrizeInfo(e.target.value)}
                placeholder={"Ex: 1º Booster Beyblade X + Medalha\n2º e 3º Medalhas + Brindes"}
                rows={2}
                maxLength={600}
                className="text-xs"
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-background/40 p-3.5 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Inscrições Online &amp; PIX
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`edit-t-reg-${tournament.id}`}
                    className="text-xs font-semibold"
                  >
                    Inscrições
                  </Label>
                  <select
                    id={`edit-t-reg-${tournament.id}`}
                    value={registrationStatus}
                    onChange={(e) =>
                      setRegistrationStatus(
                        e.target.value as TournamentRegistrationStatus
                      )
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="closed">🔒 Fechadas</option>
                    <option value="open">🟢 Abertas</option>
                    <option value="finished">🏁 Encerradas</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor={`edit-t-fee-${tournament.id}`}
                    className="text-xs font-semibold"
                  >
                    Taxa PIX (R$)
                  </Label>
                  <Input
                    id={`edit-t-fee-${tournament.id}`}
                    type="number"
                    step="0.01"
                    min={0}
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    placeholder="0.00"
                    className="h-9 text-xs text-center font-semibold tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor={`edit-t-max-${tournament.id}`}
                    className="text-xs font-semibold"
                  >
                    Vagas (Opc.)
                  </Label>
                  <Input
                    id={`edit-t-max-${tournament.id}`}
                    type="number"
                    min={2}
                    max={128}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    placeholder="Livre"
                    className="h-9 text-xs text-center"
                  />
                </div>
              </div>

              {parsedEntryFee > 0 && !pixConfigured && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-500 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    A chave PIX da Liga ainda não está configurada.{" "}
                    <Link
                      href="/admin/configuracoes"
                      className="underline font-bold"
                    >
                      Configurar PIX agora
                    </Link>
                    .
                  </span>
                </div>
              )}
            </div>

            {rulesets.length > 0 && (
              <div className="space-y-1.5">
                <Label
                  htmlFor={`edit-t-ruleset-${tournament.id}`}
                  className="text-xs font-semibold"
                >
                  Formato / Ban-list (Regras)
                </Label>
                <select
                  id={`edit-t-ruleset-${tournament.id}`}
                  value={rulesetId}
                  onChange={(e) => setRulesetId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Sem formato definido</option>
                  {rulesets.map((rs) => (
                    <option key={rs.id} value={rs.id}>
                      {rs.name}
                      {!rs.is_active ? " (Inativo)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor={`edit-t-desc-${tournament.id}`}
                className="text-xs font-semibold"
              >
                Observações / Regulamento (Opcional)
              </Label>
              <Textarea
                id={`edit-t-desc-${tournament.id}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || success}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
