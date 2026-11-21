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
import { partMatchesQuery } from "@/lib/parts-search";
import {
  createPartAction,
  deletePartAction,
  updatePartAction,
} from "@/app/admin/parts-actions";
import {
  PART_TYPE_LABELS,
  PART_TYPE_ORDER,
  type PartLine,
  type PartRow,
  type PartType,
} from "@/types/domain";

interface PartsCatalogClientProps {
  initialParts: PartRow[];
}

export function PartsCatalogClient({ initialParts }: PartsCatalogClientProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | PartType>("all");
  const [lineFilter, setLineFilter] = React.useState<"all" | PartLine>("all");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "active" | "inactive"
  >("all");

  // Modal Create/Edit
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPart, setEditingPart] = React.useState<PartRow | null>(null);
  const [name, setName] = React.useState("");
  const [partType, setPartType] = React.useState<PartType>("blade");
  const [line, setLine] = React.useState<PartLine>("BX");
  const [aliasesStr, setAliasesStr] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState(false);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const filteredParts = React.useMemo(() => {
    return initialParts.filter((part) => {
      if (typeFilter !== "all" && part.part_type !== typeFilter) return false;
      if (lineFilter !== "all" && part.line !== lineFilter) return false;
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
    setFormError(null);
    setFormSuccess(false);
    setDialogOpen(true);
  };

  const openEditModal = (part: PartRow) => {
    setEditingPart(part);
    setName(part.name);
    setPartType(part.part_type);
    setLine(part.line);
    setAliasesStr((part.aliases ?? []).join(", "));
    setIsActive(part.is_active);
    setFormError(null);
    setFormSuccess(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFormSuccess(false);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("part_type", partType);
    fd.set("line", line);
    fd.set("aliases", aliasesStr);
    fd.set("is_active", isActive ? "true" : "false");

    const res = editingPart
      ? await updatePartAction(editingPart.id, fd)
      : await createPartAction(fd);

    setSaving(false);

    if (res.error) {
      setFormError(res.error);
      return;
    }

    setFormSuccess(true);
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
      return;
    }

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
            {(["all", "BX", "UX", "CX"] as const).map((l) => (
              <Button
                key={l}
                type="button"
                size="xs"
                variant={lineFilter === l ? "default" : "outline"}
                onClick={() => setLineFilter(l)}
                className="font-bold"
              >
                {l === "all" ? "Todas Linhas" : l}
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
            Aplique a migration{" "}
            <code>006_seed_parts_catalog.sql</code> no Supabase SQL Editor para importar todas as 288 peças competitivas dos CSVs, ou cadastre peças manualmente acima.
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
                    {part.line}
                  </Badge>
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
                  onChange={(e) => setPartType(e.target.value as PartType)}
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
                  Linha *
                </Label>
                <select
                  id="part-line"
                  value={line}
                  onChange={(e) => setLine(e.target.value as PartLine)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="BX">BX</option>
                  <option value="UX">UX</option>
                  <option value="CX">CX</option>
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
