"use client";

import * as React from "react";
import {
  Sparkles,
  RotateCcw,
  Info,
  Lock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PartSearchSelect } from "@/components/blader/PartSearchSelect";
import {
  BEY_SYSTEM_CONFIG,
  createEmptyComboSelection,
  formatComboDisplay,
  getMissingComboPartLabels,
  isBladeCompatibleWithSystem,
  isComboEmpty,
  sanitizeComboForSystem,
} from "@/lib/combo-rules";
import {
  BEY_SYSTEM_ORDER,
  type BeySystem,
  type ComboSelection,
  type PartRow,
} from "@/types/domain";

interface ComboBuilderProps {
  parts: PartRow[];
  value: ComboSelection;
  onChange: (next: ComboSelection) => void;
  bannedPartIds?: Set<string>;
  disabled?: boolean;
  allowEmpty?: boolean;
  title?: string;
  subtitle?: string;
}

export function ComboBuilder({
  parts,
  value,
  onChange,
  bannedPartIds,
  disabled = false,
  allowEmpty = false,
  title = "Montar Combo (Busca por nome Takara Tomy ou Hasbro)",
  subtitle,
}: ComboBuilderProps) {
  const allowedParts = React.useMemo(() => {
    if (!bannedPartIds || bannedPartIds.size === 0) return parts;
    return parts.filter((p) => !bannedPartIds.has(p.id));
  }, [parts, bannedPartIds]);

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartRow>();
    for (const p of parts) {
      map.set(p.id, p);
    }
    return map;
  }, [parts]);

  const activeConfig = value.system ? BEY_SYSTEM_CONFIG[value.system] : null;

  const selectedBlade = value.bladeId
    ? (partsById.get(value.bladeId) ?? null)
    : null;
  const selectedLockChip = value.lockChipId
    ? (partsById.get(value.lockChipId) ?? null)
    : null;
  const selectedOverBlade = value.overBladeId
    ? (partsById.get(value.overBladeId) ?? null)
    : null;
  const selectedAssistBlade = value.assistBladeId
    ? (partsById.get(value.assistBladeId) ?? null)
    : null;
  const selectedRatchet = value.ratchetId
    ? (partsById.get(value.ratchetId) ?? null)
    : null;
  const selectedBit = value.bitId ? (partsById.get(value.bitId) ?? null) : null;

  const bladeOptions = React.useMemo(() => {
    if (!value.system) return [];
    const sys = value.system;
    return allowedParts.filter((p) => isBladeCompatibleWithSystem(p, sys));
  }, [allowedParts, value.system]);

  const lockChipOptions = React.useMemo(
    () => allowedParts.filter((p) => p.part_type === "lock_chip"),
    [allowedParts]
  );

  const overBladeOptions = React.useMemo(
    () => allowedParts.filter((p) => p.part_type === "over_blade"),
    [allowedParts]
  );

  const assistBladeOptions = React.useMemo(
    () => allowedParts.filter((p) => p.part_type === "assist_blade"),
    [allowedParts]
  );

  const requiresSimpleRatchet = Boolean(selectedBlade?.requires_simple_ratchet);
  const ratchetBlocksBit = Boolean(selectedRatchet?.blocks_bit);

  const ratchetOptions = React.useMemo(() => {
    const allRatchets = allowedParts.filter((p) => p.part_type === "ratchet");
    if (requiresSimpleRatchet) {
      return allRatchets.filter((r) => r.is_simple_ratchet);
    }
    return allRatchets;
  }, [allowedParts, requiresSimpleRatchet]);

  const bitOptions = React.useMemo(
    () => allowedParts.filter((p) => p.part_type === "bit"),
    [allowedParts]
  );

  const handleSelectSystem = (nextSystem: BeySystem) => {
    if (disabled) return;
    const next = sanitizeComboForSystem(
      {
        ...value,
        system: nextSystem,
      },
      partsById
    );
    onChange(next);
  };

  const handleClearCombo = () => {
    if (disabled) return;
    onChange(createEmptyComboSelection());
  };

  const handleFieldChange = (
    field: keyof Omit<ComboSelection, "system">,
    nextId: string
  ) => {
    if (disabled) return;
    const next = sanitizeComboForSystem(
      {
        ...value,
        [field]: nextId,
      },
      partsById
    );
    onChange(next);
  };

  const comboDisplay = React.useMemo(
    () =>
      formatComboDisplay({
        system: value.system,
        blade: selectedBlade,
        lockChip: selectedLockChip,
        overBlade: selectedOverBlade,
        assistBlade: selectedAssistBlade,
        ratchet: selectedRatchet,
        bit: selectedBit,
      }),
    [
      value.system,
      selectedBlade,
      selectedLockChip,
      selectedOverBlade,
      selectedAssistBlade,
      selectedRatchet,
      selectedBit,
    ]
  );

  const isEmptyCombo = React.useMemo(() => isComboEmpty(value), [value]);
  const missingPartLabels = React.useMemo(
    () => getMissingComboPartLabels(value, partsById),
    [value, partsById]
  );
  const isCompleteCombo = !isEmptyCombo && missingPartLabels.length === 0;

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
            <Sparkles className="h-4 w-4 text-fire-yellow" />
            <span>{title}</span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {value.system && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleClearCombo}
            className="text-[11px] text-muted-foreground hover:text-destructive gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Limpar combo
          </Button>
        )}
      </div>

      {/* Passo 1: Sistema do Bey */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          1. Sistema do Beyblade *
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {BEY_SYSTEM_ORDER.map((sys) => {
            const active = value.system === sys;
            return (
              <button
                key={sys}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectSystem(sys)}
                className={`h-9 rounded-lg border text-xs font-black transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/70 bg-background/70 text-foreground hover:border-primary/50"
                }`}
              >
                {sys}
              </button>
            );
          })}
        </div>

        {activeConfig ? (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-primary/40 text-primary font-black"
            >
              {activeConfig.system}
            </Badge>
            <span>Estrutura: {activeConfig.shortDesc}</span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            Escolha primeiro o sistema (BX, BXE, UX, UXE, CX ou CXE) para liberar os encaixes corretos.
          </p>
        )}
      </div>

      {/* Passo 2: Peças conforme o Sistema */}
      {activeConfig && (
        <div className="space-y-3 pt-1 border-t border-border/50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            2. Peças do Combo ({activeConfig.system})
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeConfig.needsLockChip && (
              <PartSearchSelect
                label="Lock Chip"
                placeholder="Selecionar Lock Chip..."
                parts={lockChipOptions}
                value={value.lockChipId}
                disabled={disabled}
                onChange={(id) => handleFieldChange("lockChipId", id)}
              />
            )}

            {activeConfig.needsOverBlade && (
              <PartSearchSelect
                label="Over Blade"
                placeholder="Selecionar Over Blade..."
                parts={overBladeOptions}
                value={value.overBladeId}
                disabled={disabled}
                onChange={(id) => handleFieldChange("overBladeId", id)}
              />
            )}

            <PartSearchSelect
              label={activeConfig.bladeLabel}
              placeholder={activeConfig.bladePlaceholder}
              parts={bladeOptions}
              value={value.bladeId}
              disabled={disabled}
              onChange={(id) => handleFieldChange("bladeId", id)}
            />

            {activeConfig.needsAssistBlade && (
              <PartSearchSelect
                label="Assist Blade"
                placeholder="Selecionar Assist Blade..."
                parts={assistBladeOptions}
                value={value.assistBladeId}
                disabled={disabled}
                onChange={(id) => handleFieldChange("assistBladeId", id)}
              />
            )}

            {activeConfig.needsRatchet ? (
              <PartSearchSelect
                label="Ratchet"
                placeholder={
                  requiresSimpleRatchet
                    ? "Selecionar Ratchet Simples..."
                    : "Selecionar Ratchet..."
                }
                parts={ratchetOptions}
                value={value.ratchetId}
                hideLineBadge
                disabled={disabled}
                notice={
                  requiresSimpleRatchet && selectedBlade
                    ? `${selectedBlade.name} aceita apenas Ratchets Simples (O-type joint, ex: 9-65, 4-55, 3-85).`
                    : null
                }
                onChange={(id) => handleFieldChange("ratchetId", id)}
              />
            ) : (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">
                  Ratchet
                </div>
                <div className="h-9 px-3 rounded-md border border-dashed border-border/70 bg-muted/30 text-muted-foreground text-[11px] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    Integrada à Blade ({activeConfig.system})
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-start gap-1 leading-tight">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>
                    Blades UXE já possuem Ratchet integrada e encaixam direto na Bit.
                  </span>
                </p>
              </div>
            )}

            <PartSearchSelect
              label="Bit"
              placeholder="Selecionar Bit..."
              parts={bitOptions}
              value={value.bitId}
              hideLineBadge
              disabled={disabled || ratchetBlocksBit}
              disabledMessage={
                ratchetBlocksBit
                  ? "Bloqueada (Bit integrada na Ratchet)"
                  : undefined
              }
              notice={
                ratchetBlocksBit && selectedRatchet
                  ? `Esta Ratchet possui Bit integrada (${selectedRatchet.name}).`
                  : null
              }
              onChange={(id) => handleFieldChange("bitId", id)}
            />
          </div>

          {comboDisplay.chips.length > 0 && (
            <div className="rounded-lg border border-border/50 bg-card/60 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-muted-foreground">
                Resumo:
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-primary/40 text-primary font-black"
              >
                {comboDisplay.system}
              </Badge>
              <span className="font-bold text-foreground">
                {comboDisplay.summaryText}
              </span>
              {isCompleteCombo && (
                <Badge
                  variant="outline"
                  className="ml-auto text-[10px] px-1.5 py-0 border-emerald-500/45 text-emerald-500 bg-emerald-500/10 gap-1 font-bold"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Combo completo
                </Badge>
              )}
            </div>
          )}

          {missingPartLabels.length > 0 && (!allowEmpty || !isEmptyCombo) && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-500 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Peças obrigatórias faltando:</strong>{" "}
                {missingPartLabels.join(", ")}.
              </span>
            </div>
          )}
        </div>
      )}

      {!activeConfig && !allowEmpty && (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-500 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Selecione o <strong>Sistema do Beyblade</strong> e preencha todas as peças obrigatórias para liberar o salvamento.
          </span>
        </div>
      )}
    </div>
  );
}
