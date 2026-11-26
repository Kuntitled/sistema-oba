"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isUniversalPartType } from "@/lib/combo-rules";
import { partMatchesQuery } from "@/lib/parts-search";
import { useToast } from "@/components/ui/toast-provider";
import {
  createPartAction,
  deletePartAction,
  updatePartAction,
} from "@/app/admin/parts-actions";
import {
  PART_LINE_ORDER,
  PART_TYPE_LABELS,
  PART_TYPE_ORDER,
  type PartLine,
  type PartRow,
  type PartType,
} from "@/types/domain";

interface PartsCatalogClientProps {
  initialParts: PartRow[];
}

function defaultLineForPartType(partType: PartType): PartLine | "" {
  if (isUniversalPartType(partType)) return "";
  if (
    partType === "main_blade" ||
    partType === "lock_chip" ||
    partType === "assist_blade"
  ) {
    return "CX";
  }
  if (partType === "metal_blade" || partType === "over_blade") {
    return "CXE";
  }
  return "BX";
}

export function PartsCatalogClient({ initialParts }: PartsCatalogClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | PartType>("all");
  const [lineFilter, setLineFilter] = React.useState<
    "all" | PartLine | "universal"
  >("all");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "inactive"
  >("all");

  // Modal Create/Edit
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPart, setEditingPart] = React.useState<PartRow | null>(null);
  const [name, setName] = React.useState("");
  const [partType, setPartType] = React.useState<PartType>("blade");
  const [line, setLine] = React.useState<PartLine | "">("BX");
  const [aliasesStr, setAliasesStr] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isSimpleRatchet, setIsSimpleRatchet] = React.useState(false);
  const [requiresSimpleRatchet, setRequiresSimpleRatchet] =
    React.useState(false);
  const [blocksBit, setBlocksBit] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState(false);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const filteredParts = React.useMemo(() => {
    return initialParts.filter((part) => {
      if (typeFilter !== "all" && part.part_type !== typeFilter) return false;
      if (lineFilter === "universal" && part.line !== null) return false;
      if (
        lineFilter !== "all" &&
        lineFilter !== "universal" &&
        part.line !== lineFilter
      ) {
        return false;
      }
      if (statusFilter === "active" && !part.is_active) return false;
      if (statusFilter === "inactive" && part.is_active) return false;
      if (search.trim() && !partMatchesQuery(part, search)) return false;
      return true;
    });
  }, [initialParts, typeFilter, lineFilter, statusFilter, search]);

  const openCreateModal = () => {
    setEditingPart(null);
    setName("");
    setPartType("blade");
    setLine("BX");
    setAliasesStr("");
    setIsActive(true);
    setIsSimpleRatchet(false);
    setRequiresSimpleRatchet(false);
    setBlocksBit(false);
    setFormError(null);
    setFormSuccess(false);
    setDialogOpen(true);
  };

  const openEditModal = (part: PartRow) => {
    setEditingPart(part);
    setName(part.name);
    setPartType(part.part_type);
    setLine(isUniversalPartType(part.part_type) ? "" : (part.line ?? "BX"));
    setAliasesStr((part.aliases ?? []).join(", "));
    setIsActive(part.is_active);
    setIsSimpleRatchet(part.is_simple_ratchet);
    setRequiresSimpleRatchet(part.requires_simple_ratchet);
    setBlocksBit(part.blocks_bit);
    setFormError(null);
    setFormSuccess(false);
    setDialogOpen(true);
  };

  const handlePartTypeChange = (nextType: PartType) => {
    setPartType(nextType);
    if (isUniversalPartType(nextType)) {
      setLine("");
    } else if (!line) {
      setLine(defaultLineForPartType(nextType));
    } else if (
      nextType === "main_blade" ||
      nextType === "lock_chip" ||
      nextType === "assist_blade"
    ) {
      setLine("CX");
    } else if (nextType === "metal_blade" || nextType === "over_blade") {
      setLine("CXE");
    }

    if (nextType !== "ratchet") {
      setIsSimpleRatchet(false);
      setBlocksBit(false);
    }
    if (
      nextType !== "blade" &&
      nextType !== "main_blade" &&
      nextType !== "metal_blade"
    ) {
      setRequiresSimpleRatchet(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFormSuccess(false);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("part_type", partType);
    fd.set("line", isUniversalPartType(partType) ? "" : line);
    fd.set("aliases", aliasesStr);
    fd.set("is_active", isActive ? "true" : "false");
    fd.set("is_simple_ratchet", isSimpleRatchet ? "true" : "false");
    fd.set(
      "requires_simple_ratchet",
      requiresSimpleRatchet ? "true" : "false"
    );
    fd.set("blocks_bit", blocksBit ? "true" : "false");

    const res = editingPart
      ? await updatePartAction(editingPart.id, fd)
      : await createPartAction(fd);

    setSaving(false);

    if (res.error) {
      setFormError(res.error);
      toast.error(res.error);
      return;
    }

    setFormSuccess(true);
    toast.success(
      editingPart ? `Peça "${name}" atualizada!` : `Peça "${name}" criada!`
    );
    router.refresh();
    setTimeout(() => {
      setDialogOpen(false);
      setFormSuccess(false);
    }, 600);
  };

  const handleDelete = async (part: PartRow) => {
    const confirmed = window.confirm(
      `Excluir a peça "${part.name}" (${PART_TYPE_LABELS[part.part_type]}) do catálogo?`
    );
    if (!confirmed) return;

    setDeletingId(part.id);
    setActionError(null);

    const res = await deletePartAction(part.id);
    setDeletingId(null);

    if (res.error) {
      setActionError(res.error);
      toast.error(res.error);
      return;
    }

    toast.success(`Peça "${part.name}" excluída.`);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* Barra de Ação & Filtros */}
      <Card className="border-border/60 bg-card/60 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar peça por nome Takara Tomy ou alias Hasbro..."
              className="pl-9 h-9 text-xs bg-background/60"
            />
          </div>

          <Button
            type="button"
            onClick={openCreateModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            Nova Peça
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="xs"
              variant={typeFilter === "all" ? "default" : "outline"}
              onClick={() => setTypeFilter("all")}
              className="font-bold"
            >
              Todos ({initialParts.length})
            </Button>
            {PART_TYPE_ORDER.map((type) => (
              <Button
                key={type}
                type="button"
                size="xs"
                variant={typeFilter === type ? "default" : "outline"}
                onClick={() => setTypeFilter(type)}
                className="font-bold"
              >
                {PART_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", ...PART_LINE_ORDER, "universal"] as const).map((l) => (
              <Button
                key={l}
                type="button"
                size="xs"
                variant={lineFilter === l ? "default" : "outline"}
                onClick={() => setLineFilter(l)}
                className="font-bold"
              >
                {l === "all"
                  ? "Todas Linhas"
                  : l === "universal"
                    ? "Universal"
                    : l}
              </Button>
            ))}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "active" | "inactive"
                )
              }
              aria-label="Filtrar por status da peça"
              className="h-7 rounded-md border border-input bg-background px-2 text-[11px] font-semibold"
            >
              <option value="all">Ativas e Inativas</option>
              <option value="active">Somente Ativas</option>
              <option value="inactive">Somente Inativas</option>
            </select>
          </div>
        </div>
      </Card>

      {actionError && (
        <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Listagem */}
      {initialParts.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-10 text-center space-y-2">
          <Layers className="h-9 w-9 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-base text-foreground">
            Nenhuma peça no catálogo ainda
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Aplique as migrations{" "}
            <code>006_seed_parts_catalog.sql</code>,{" "}
            <code>007_phase3a_combo_systems_and_avatars.sql</code> e{" "}
            <code>008_update_parts_classification.sql</code> no Supabase SQL Editor para importar todas as 288 peças competitivas dos CSVs, ou cadastre peças manualmente acima.
          </p>
        </Card>
      ) : filteredParts.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-8 text-center">
          <p className="text-xs text-muted-foreground">
            Nenhuma peça corresponde aos filtros selecionados.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredParts.map((part) => (
            <Card
              key={part.id}
              className={`border-border/60 bg-card/60 p-3.5 flex items-start justify-between gap-2 ${
                !part.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm text-foreground truncate">
                    {part.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-primary/40 text-primary"
                  >
                    {PART_TYPE_LABELS[part.part_type]}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {part.line ?? "Universal"}
                  </Badge>
                  {part.is_simple_ratchet && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-500"
                    >
                      Simple Ratchet
                    </Badge>
                  )}
                  {part.requires_simple_ratchet && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-500"
                    >
                      Exige Simple Ratchet
                    </Badge>
                  )}
                  {part.blocks_bit && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 border-fire-orange/40 text-fire-orange"
                    >
                      Bit Integrada
                    </Badge>
                  )}
                  {!part.is_active && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 border-destructive/40 text-destructive"
                    >
                      Inativa
                    </Badge>
                  )}
                </div>

                {part.aliases && part.aliases.length > 0 && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    Aliases: {part.aliases.join(", ")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEditModal(part)}
                  title="Editar peça"
                  className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={deletingId === part.id}
                  onClick={() => void handleDelete(part)}
                  title="Excluir peça"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  {deletingId === part.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Peça */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              {editingPart ? `Editar Peça — ${editingPart.name}` : "Nova Peça"}
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
              <span>Peça salva com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="part-name" className="text-xs font-semibold">
                Nome Canônico (Takara Tomy) *
              </Label>
              <Input
                id="part-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: WizardRod, 9-60, Ball..."
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="part-type" className="text-xs font-semibold">
                  Tipo de Peça *
                </Label>
                <select
                  id="part-type"
                  value={partType}
                  onChange={(e) =>
                    handlePartTypeChange(e.target.value as PartType)
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  {PART_TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {PART_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="part-line" className="text-xs font-semibold">
                  Sistema / Linha {isUniversalPartType(partType) ? "" : "*"}
                </Label>
                <select
                  id="part-line"
                  value={isUniversalPartType(partType) ? "" : line}
                  disabled={isUniversalPartType(partType)}
                  onChange={(e) => setLine(e.target.value as PartLine | "")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs disabled:opacity-60"
                >
                  {isUniversalPartType(partType) ? (
                    <option value="">Universal (sem sistema)</option>
                  ) : (
                    PART_LINE_ORDER.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="part-aliases" className="text-xs font-semibold">
                Aliases Hasbro / Alternativos (separados por vírgula)
              </Label>
              <Input
                id="part-aliases"
                value={aliasesStr}
                onChange={(e) => setAliasesStr(e.target.value)}
                placeholder="Ex: Wand Wizard, Wizard Rod"
                className="h-9 text-xs"
              />
            </div>

            {partType === "ratchet" && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Regras de Compatibilidade da Ratchet
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isSimpleRatchet}
                    onChange={(e) => setIsSimpleRatchet(e.target.checked)}
                    className="accent-primary mt-0.5"
                  />
                  <div>
                    <div className="font-semibold text-foreground">
                      Simple Ratchet (O-type joint)
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Ratchet simples com altura terminada em 5 (ex: 9-65, 4-55, 3-85).
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={blocksBit}
                    onChange={(e) => setBlocksBit(e.target.checked)}
                    className="accent-primary mt-0.5"
                  />
                  <div>
                    <div className="font-semibold text-foreground">
                      Ratchet Composta / Bit Integrada
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Bloqueia seleção de Bit separada no construtor de combos (ex: Operate, Turbo).
                    </div>
                  </div>
                </label>
              </div>
            )}

            {(partType === "blade" ||
              partType === "main_blade" ||
              partType === "metal_blade") && (
              <label className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/40 p-3 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={requiresSimpleRatchet}
                  onChange={(e) => setRequiresSimpleRatchet(e.target.checked)}
                  className="accent-primary mt-0.5"
                />
                <div>
                  <div className="font-semibold text-foreground">
                    Exige Simple Ratchet
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Restringe a seleção de Ratchet apenas a peças com O-type joint (ex: ClockMirage).
                  </div>
                </div>
              </label>
            )}

            <label className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/50 p-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-primary"
              />
              <div>
                <div className="font-bold text-foreground">Peça ativa</div>
                <div className="text-[11px] text-muted-foreground">
                  Peças inativas ficam ocultas na seleção dos Bladers.
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
                Salvar Peça
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
