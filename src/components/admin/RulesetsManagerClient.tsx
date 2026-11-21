"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ShieldBan,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Ban,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { partMatchesQuery } from "@/lib/parts-search";
import {
  createRulesetAction,
  deleteRulesetAction,
  toggleRulesetBannedPartAction,
  updateRulesetAction,
} from "@/app/admin/parts-actions";
import {
  PART_TYPE_LABELS,
  PART_TYPE_ORDER,
  type PartLine,
  type PartRow,
  type PartType,
  type RulesetWithBans,
} from "@/types/domain";

interface RulesetsManagerClientProps {
  initialRulesets: RulesetWithBans[];
  parts: PartRow[];
}

export function RulesetsManagerClient({
  initialRulesets,
  parts,
}: RulesetsManagerClientProps) {
  const router = useRouter();
  const [selectedRulesetId, setSelectedRulesetId] = React.useState<string>(
    initialRulesets[0]?.id ?? ""
  );

  // Sobreposições otimistas por ruleset -> (partId -> shouldBan) enquanto a action está em voo
  const [banOverrides, setBanOverrides] = React.useState<
    Record<string, Record<string, boolean>>
  >({});

  const selectedRuleset =
    initialRulesets.find((r) => r.id === selectedRulesetId) ??
    initialRulesets[0] ??
    null;

  const getRulesetBannedSet = React.useCallback(
    (rs: RulesetWithBans): Set<string> => {
      const set = new Set(rs.bannedPartIds);
      const overrides = banOverrides[rs.id];
      if (overrides) {
        for (const [partId, shouldBan] of Object.entries(overrides)) {
          if (shouldBan) set.add(partId);
          else set.delete(partId);
        }
      }
      return set;
    },
    [banOverrides]
  );

  const currentBannedSet = React.useMemo(() => {
    if (!selectedRuleset) return new Set<string>();
    return getRulesetBannedSet(selectedRuleset);
  }, [getRulesetBannedSet, selectedRuleset]);

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartRow>();
    for (const p of parts) {
      map.set(p.id, p);
    }
    return map;
  }, [parts]);

  const bannedPartObjects = React.useMemo(() => {
    const list: PartRow[] = [];
    for (const id of currentBannedSet) {
      const part = partsById.get(id);
      if (part) list.push(part);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [currentBannedSet, partsById]);

  // Filtros de peças na ban-list
  const [partSearch, setPartSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | PartType>("all");
  const [lineFilter, setLineFilter] = React.useState<"all" | PartLine>("all");
  const [pendingPartIds, setPendingPartIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [banError, setBanError] = React.useState<string | null>(null);

  const filteredParts = React.useMemo(() => {
    return parts.filter((part) => {
      if (typeFilter !== "all" && part.part_type !== typeFilter) return false;
      if (lineFilter !== "all" && part.line !== lineFilter) return false;
      if (partSearch.trim() && !partMatchesQuery(part, partSearch)) return false;
      return true;
    });
  }, [parts, typeFilter, lineFilter, partSearch]);

  // Modal Criar / Editar Formato
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRuleset, setEditingRuleset] =
    React.useState<RulesetWithBans | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const openCreateModal = () => {
    setEditingRuleset(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setFormError(null);
    setFormSuccess(false);
    setDialogOpen(true);
  };

  const openEditModal = (rs: RulesetWithBans) => {
    setEditingRuleset(rs);
    setName(rs.name);
    setDescription(rs.description ?? "");
    setIsActive(rs.is_active);
    setFormError(null);
    setFormSuccess(false);
    setDialogOpen(true);
  };

  const handleSubmitRuleset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFormSuccess(false);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("is_active", isActive ? "true" : "false");

    const res = editingRuleset
      ? await updateRulesetAction(editingRuleset.id, fd)
      : await createRulesetAction(fd);

    setSaving(false);

    if (res.error) {
      setFormError(res.error);
      return;
    }

    setFormSuccess(true);
    if (!editingRuleset && res.ruleset) {
      setSelectedRulesetId(res.ruleset.id);
    }
    router.refresh();
    setTimeout(() => {
      setDialogOpen(false);
      setFormSuccess(false);
    }, 600);
  };

  const handleDeleteRuleset = async (rs: RulesetWithBans) => {
    const confirmed = window.confirm(
      `Excluir o formato "${rs.name}" e toda a sua ban-list? Torneios vinculados ficarão sem formato selecionado.`
    );
    if (!confirmed) return;

    setDeletingId(rs.id);
    setBanError(null);

    const res = await deleteRulesetAction(rs.id);
    setDeletingId(null);

    if (res.error) {
      setBanError(res.error);
      return;
    }

    router.refresh();
  };

  const handleToggleBan = async (partId: string) => {
    if (!selectedRuleset || pendingPartIds.has(partId)) return;

    const currentlyBanned = currentBannedSet.has(partId);
    const shouldBan = !currentlyBanned;

    setBanError(null);
    setPendingPartIds((prev) => {
      const next = new Set(prev);
      next.add(partId);
      return next;
    });

    setBanOverrides((prev) => ({
      ...prev,
      [selectedRuleset.id]: {
        ...(prev[selectedRuleset.id] ?? {}),
        [partId]: shouldBan,
      },
    }));

    const res = await toggleRulesetBannedPartAction(
      selectedRuleset.id,
      partId,
      shouldBan
    );

    setPendingPartIds((prev) => {
      const next = new Set(prev);
      next.delete(partId);
      return next;
    });

    if (res.error) {
      setBanOverrides((prev) => {
        const nextRs = { ...(prev[selectedRuleset.id] ?? {}) };
        delete nextRs[partId];
        return {
          ...prev,
          [selectedRuleset.id]: nextRs,
        };
      });
      setBanError(res.error);
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho + Lista de Formatos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Selecione um formato abaixo para gerenciar sua ban-list independente ou crie um novo conjunto de regras.
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Novo Formato
        </Button>
      </div>

      {banError && (
        <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{banError}</span>
        </div>
      )}

      {initialRulesets.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-10 text-center space-y-2">
          <ShieldBan className="h-9 w-9 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-base text-foreground">
            Nenhum formato cadastrado
          </h3>
          <p className="text-xs text-muted-foreground">
            Crie o primeiro formato (ex: &ldquo;Livre&rdquo;, &ldquo;Limitado OBA&rdquo;) clicando em Novo Formato.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
          {/* Coluna Esquerda: Formatos */}
          <div className="space-y-2.5">
            {initialRulesets.map((rs) => {
              const isSelected = selectedRuleset?.id === rs.id;
              const banCount = getRulesetBannedSet(rs).size;
              return (
                <Card
                  key={rs.id}
                  className={`transition-all overflow-hidden ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border/60 bg-card/60 hover:border-primary/40"
                  }`}
                >
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRulesetId(rs.id)}
                        className="text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-foreground truncate">
                            {rs.name}
                          </span>
                          {!rs.is_active && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 border-destructive/40 text-destructive"
                            >
                              Inativo
                            </Badge>
                          )}
                        </div>
                        {rs.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                            {rs.description}
                          </p>
                        )}
                      </button>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(rs)}
                          title="Editar formato"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={deletingId === rs.id}
                          onClick={() => void handleDeleteRuleset(rs)}
                          title="Excluir formato"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          {deletingId === rs.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedRulesetId(rs.id)}
                      className="w-full flex items-center justify-between pt-2 border-t border-border/40 text-[11px] cursor-pointer"
                    >
                      <span className="text-muted-foreground">
                        Peças banidas:
                      </span>
                      <Badge
                        variant={banCount > 0 ? "destructive" : "secondary"}
                        className="text-[10px] font-bold"
                      >
                        {banCount === 0
                          ? "Sem banimentos"
                          : `${banCount} banida(s)`}
                      </Badge>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Coluna Direita: Ban-list do Formato Selecionado */}
          {selectedRuleset && (
            <Card className="border-border/60 bg-card/60">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                      <Ban className="h-4 w-4 text-destructive" />
                      Ban-list: {selectedRuleset.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Clique nas peças abaixo para banir ou liberar neste formato.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold">
                    {currentBannedSet.size} peça(s) banida(s)
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Chips de Peças Banidas Atualmente */}
                <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Atualmente Banidas neste Formato
                  </div>
                  {bannedPartObjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nenhuma peça banida neste formato (todas liberadas).
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {bannedPartObjects.map((part) => (
                        <button
                          key={part.id}
                          type="button"
                          disabled={pendingPartIds.has(part.id)}
                          onClick={() => void handleToggleBan(part.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/15 border border-destructive/40 text-destructive text-[11px] font-bold hover:bg-destructive/25 transition-colors cursor-pointer"
                          title="Clique para remover da ban-list"
                        >
                          <span>{part.name}</span>
                          <span className="text-[10px] opacity-80">
                            ({PART_TYPE_LABELS[part.part_type]})
                          </span>
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Busca e Filtros */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        value={partSearch}
                        onChange={(e) => setPartSearch(e.target.value)}
                        placeholder="Buscar peça (TT ou Hasbro) para banir/desbanir..."
                        className="pl-9 h-9 text-xs bg-background/60"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {(["all", "BX", "UX", "CX"] as const).map((l) => (
                        <Button
                          key={l}
                          type="button"
                          size="xs"
                          variant={lineFilter === l ? "default" : "outline"}
                          onClick={() => setLineFilter(l)}
                          className="font-bold"
                        >
                          {l === "all" ? "Todas" : l}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="xs"
                      variant={typeFilter === "all" ? "default" : "outline"}
                      onClick={() => setTypeFilter("all")}
                      className="font-bold"
                    >
                      Todos Tipos
                    </Button>
                    {PART_TYPE_ORDER.map((t) => (
                      <Button
                        key={t}
                        type="button"
                        size="xs"
                        variant={typeFilter === t ? "default" : "outline"}
                        onClick={() => setTypeFilter(t)}
                        className="font-bold"
                      >
                        {PART_TYPE_LABELS[t]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Grade de Peças */}
                {parts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Nenhuma peça encontrada no catálogo. Importe a migration{" "}
                    <code>006_seed_parts_catalog.sql</code> ou cadastre em{" "}
                    <strong>Peças</strong>.
                  </div>
                ) : filteredParts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Nenhuma peça encontrada para os filtros aplicados.
                  </div>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                    {filteredParts.map((part) => {
                      const isBanned = currentBannedSet.has(part.id);
                      const isPending = pendingPartIds.has(part.id);
                      return (
                        <button
                          key={part.id}
                          type="button"
                          disabled={isPending}
                          onClick={() => void handleToggleBan(part.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isBanned
                              ? "border-destructive/60 bg-destructive/15"
                              : "border-border/60 bg-background/40 hover:border-primary/40"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-foreground truncate">
                                {part.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {PART_TYPE_LABELS[part.part_type]} • {part.line}
                              </span>
                            </div>
                            {part.aliases && part.aliases.length > 0 && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                Hasbro: {part.aliases.join(", ")}
                              </div>
                            )}
                          </div>

                          <div
                            className={`h-6 px-2 rounded-md text-[10px] font-black flex items-center gap-1 shrink-0 ${
                              isBanned
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isBanned ? (
                              <>
                                <Ban className="h-3 w-3" />
                                Banida
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3" />
                                Livre
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal Criar / Editar Formato */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              {editingRuleset
                ? `Editar Formato — ${editingRuleset.name}`
                : "Novo Formato / Ban-list"}
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Formato salvo com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSubmitRuleset} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="ruleset-name" className="text-xs font-semibold">
                Nome do Formato *
              </Label>
              <Input
                id="ruleset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Limitado OBA, Só BX, Highlander..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ruleset-desc" className="text-xs font-semibold">
                Descrição / Regras Gerais (Opcional)
              </Label>
              <Textarea
                id="ruleset-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Explique as restrições deste formato para os Bladers..."
                className="text-xs"
              />
            </div>

            <label className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/50 p-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-primary"
              />
              <div>
                <div className="font-bold text-foreground">Formato ativo</div>
                <div className="text-[11px] text-muted-foreground">
                  Formatos ativos aparecem como opção na criação de novos torneios.
                </div>
              </div>
            </label>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || formSuccess}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salvar Formato
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
