import {
  BEY_SYSTEM_ORDER,
  type BeySystem,
  type ComboSelection,
  type PartLine,
  type PartRow,
  type PartType,
  type RegistrationComboRow,
} from "@/types/domain";

export interface SystemSlotConfig {
  system: BeySystem;
  shortDesc: string;
  bladePartType: "blade" | "main_blade" | "metal_blade";
  allowedBladeLines: PartLine[];
  bladeLabel: string;
  bladePlaceholder: string;
  needsLockChip: boolean;
  needsOverBlade: boolean;
  needsAssistBlade: boolean;
  needsRatchet: boolean;
}

export const BEY_SYSTEM_CONFIG: Record<BeySystem, SystemSlotConfig> = {
  BX: {
    system: "BX",
    shortDesc: "Blade + Ratchet + Bit",
    bladePartType: "blade",
    allowedBladeLines: ["BX", "BXE"],
    bladeLabel: "Blade",
    bladePlaceholder: "Selecionar Blade BX/BXE...",
    needsLockChip: false,
    needsOverBlade: false,
    needsAssistBlade: false,
    needsRatchet: true,
  },
  BXE: {
    system: "BXE",
    shortDesc: "Blade Expand + Ratchet + Bit",
    bladePartType: "blade",
    allowedBladeLines: ["BX", "BXE"],
    bladeLabel: "Blade",
    bladePlaceholder: "Selecionar Blade BX/BXE...",
    needsLockChip: false,
    needsOverBlade: false,
    needsAssistBlade: false,
    needsRatchet: true,
  },
  UX: {
    system: "UX",
    shortDesc: "Blade UX + Ratchet + Bit",
    bladePartType: "blade",
    allowedBladeLines: ["UX"],
    bladeLabel: "Blade",
    bladePlaceholder: "Selecionar Blade UX...",
    needsLockChip: false,
    needsOverBlade: false,
    needsAssistBlade: false,
    needsRatchet: true,
  },
  UXE: {
    system: "UXE",
    shortDesc: "Blade c/ Ratchet Integrada + Bit",
    bladePartType: "blade",
    allowedBladeLines: ["UXE"],
    bladeLabel: "Blade (Ratchet Integrada)",
    bladePlaceholder: "Selecionar Blade UXE...",
    needsLockChip: false,
    needsOverBlade: false,
    needsAssistBlade: false,
    needsRatchet: false,
  },
  CX: {
    system: "CX",
    shortDesc: "Lock Chip + Main Blade + Assist + Ratchet + Bit",
    bladePartType: "main_blade",
    allowedBladeLines: ["CX"],
    bladeLabel: "Main Blade",
    bladePlaceholder: "Selecionar Main Blade CX...",
    needsLockChip: true,
    needsOverBlade: false,
    needsAssistBlade: true,
    needsRatchet: true,
  },
  CXE: {
    system: "CXE",
    shortDesc: "Lock Chip + Over + Metal + Assist + Ratchet + Bit",
    bladePartType: "metal_blade",
    allowedBladeLines: ["CXE"],
    bladeLabel: "Metal Blade",
    bladePlaceholder: "Selecionar Metal Blade CXE...",
    needsLockChip: true,
    needsOverBlade: true,
    needsAssistBlade: true,
    needsRatchet: true,
  },
};

export function createEmptyComboSelection(): ComboSelection {
  return {
    system: null,
    bladeId: "",
    lockChipId: "",
    overBladeId: "",
    assistBladeId: "",
    ratchetId: "",
    bitId: "",
  };
}

export function isUniversalPartType(partType: PartType): boolean {
  return partType === "ratchet" || partType === "bit";
}

export function isValidBeySystem(value: unknown): value is BeySystem {
  return (
    typeof value === "string" &&
    (BEY_SYSTEM_ORDER as string[]).includes(value)
  );
}

export function inferComboSystem(params: {
  system?: string | null;
  blade?: PartRow | null;
  lockChip?: PartRow | null;
  overBlade?: PartRow | null;
  assistBlade?: PartRow | null;
}): BeySystem | null {
  if (isValidBeySystem(params.system)) {
    return params.system;
  }

  if (params.overBlade || params.blade?.part_type === "metal_blade") {
    return "CXE";
  }
  if (
    params.lockChip ||
    params.assistBlade ||
    params.blade?.part_type === "main_blade"
  ) {
    return "CX";
  }
  if (params.blade?.line && isValidBeySystem(params.blade.line)) {
    return params.blade.line;
  }
  if (params.blade) {
    return "BX";
  }

  return null;
}

export function isBladeCompatibleWithSystem(
  part: PartRow,
  system: BeySystem
): boolean {
  const cfg = BEY_SYSTEM_CONFIG[system];
  if (part.part_type !== cfg.bladePartType) return false;
  if (!part.line) return false;
  return cfg.allowedBladeLines.includes(part.line);
}

export function sanitizeComboForSystem(
  combo: ComboSelection,
  partsById: Map<string, PartRow>
): ComboSelection {
  if (!combo.system) {
    return createEmptyComboSelection();
  }

  const cfg = BEY_SYSTEM_CONFIG[combo.system];
  const bladePart = combo.bladeId ? partsById.get(combo.bladeId) : undefined;
  const bladeValid =
    bladePart && isBladeCompatibleWithSystem(bladePart, combo.system);
  const nextBladeId = bladeValid ? combo.bladeId : "";

  const lockChipPart = combo.lockChipId
    ? partsById.get(combo.lockChipId)
    : undefined;
  const nextLockChipId =
    cfg.needsLockChip && lockChipPart?.part_type === "lock_chip"
      ? combo.lockChipId
      : "";

  const overBladePart = combo.overBladeId
    ? partsById.get(combo.overBladeId)
    : undefined;
  const nextOverBladeId =
    cfg.needsOverBlade && overBladePart?.part_type === "over_blade"
      ? combo.overBladeId
      : "";

  const assistBladePart = combo.assistBladeId
    ? partsById.get(combo.assistBladeId)
    : undefined;
  const nextAssistBladeId =
    cfg.needsAssistBlade && assistBladePart?.part_type === "assist_blade"
      ? combo.assistBladeId
      : "";

  let nextRatchetId = "";
  if (cfg.needsRatchet && combo.ratchetId) {
    const ratchetPart = partsById.get(combo.ratchetId);
    if (ratchetPart?.part_type === "ratchet") {
      if (bladeValid && bladePart.requires_simple_ratchet) {
        nextRatchetId = ratchetPart.is_simple_ratchet ? combo.ratchetId : "";
      } else {
        nextRatchetId = combo.ratchetId;
      }
    }
  }

  let nextBitId = "";
  const selectedRatchet = nextRatchetId
    ? partsById.get(nextRatchetId)
    : undefined;
  if (!selectedRatchet?.blocks_bit && combo.bitId) {
    const bitPart = partsById.get(combo.bitId);
    if (bitPart?.part_type === "bit") {
      nextBitId = combo.bitId;
    }
  }

  return {
    system: combo.system,
    bladeId: nextBladeId,
    lockChipId: nextLockChipId,
    overBladeId: nextOverBladeId,
    assistBladeId: nextAssistBladeId,
    ratchetId: nextRatchetId,
    bitId: nextBitId,
  };
}

export function validateComboCompatibility(
  combo: ComboSelection,
  partsById: Map<string, PartRow>
): { valid: true; sanitized: ComboSelection } | { valid: false; error: string } {
  const hasAnyPart = Boolean(
    combo.bladeId ||
      combo.lockChipId ||
      combo.overBladeId ||
      combo.assistBladeId ||
      combo.ratchetId ||
      combo.bitId
  );

  if (!combo.system) {
    if (!hasAnyPart) {
      return { valid: true, sanitized: createEmptyComboSelection() };
    }
    return {
      valid: false,
      error: "Selecione o sistema do Bey (BX, BXE, UX, UXE, CX ou CXE).",
    };
  }

  const cfg = BEY_SYSTEM_CONFIG[combo.system];

  const blade = combo.bladeId ? partsById.get(combo.bladeId) : undefined;
  if (combo.bladeId && (!blade || !isBladeCompatibleWithSystem(blade, combo.system))) {
    return {
      valid: false,
      error: `A peça selecionada em "${cfg.bladeLabel}" não pertence ao sistema ${combo.system}.`,
    };
  }

  const lockChip = combo.lockChipId
    ? partsById.get(combo.lockChipId)
    : undefined;
  if (combo.lockChipId && (!cfg.needsLockChip || lockChip?.part_type !== "lock_chip")) {
    return {
      valid: false,
      error: "Lock Chip inválido para o sistema selecionado.",
    };
  }

  const overBlade = combo.overBladeId
    ? partsById.get(combo.overBladeId)
    : undefined;
  if (
    combo.overBladeId &&
    (!cfg.needsOverBlade || overBlade?.part_type !== "over_blade")
  ) {
    return {
      valid: false,
      error: "Over Blade inválido para o sistema selecionado.",
    };
  }

  const assistBlade = combo.assistBladeId
    ? partsById.get(combo.assistBladeId)
    : undefined;
  if (
    combo.assistBladeId &&
    (!cfg.needsAssistBlade || assistBlade?.part_type !== "assist_blade")
  ) {
    return {
      valid: false,
      error: "Assist Blade inválido para o sistema selecionado.",
    };
  }

  const ratchet = combo.ratchetId ? partsById.get(combo.ratchetId) : undefined;
  if (combo.ratchetId) {
    if (!cfg.needsRatchet) {
      return {
        valid: false,
        error: `O sistema ${combo.system} utiliza Blade com Ratchet integrada e não aceita Ratchet separada.`,
      };
    }
    if (!ratchet || ratchet.part_type !== "ratchet") {
      return { valid: false, error: "Ratchet selecionada é inválida." };
    }
    if (blade?.requires_simple_ratchet && !ratchet.is_simple_ratchet) {
      return {
        valid: false,
        error: `${blade.name} aceita apenas Ratchets Simples (ex: 9-65, 4-55, 3-85).`,
      };
    }
  }

  const bit = combo.bitId ? partsById.get(combo.bitId) : undefined;
  if (combo.bitId) {
    if (ratchet?.blocks_bit) {
      return {
        valid: false,
        error: `A Ratchet ${ratchet.name} possui Bit integrada e não aceita Bit separada.`,
      };
    }
    if (!bit || bit.part_type !== "bit") {
      return { valid: false, error: "Bit selecionada é inválida." };
    }
  }

  return {
    valid: true,
    sanitized: sanitizeComboForSystem(combo, partsById),
  };
}

export function isComboEmpty(combo: ComboSelection): boolean {
  return !(
    combo.system ||
    combo.bladeId ||
    combo.lockChipId ||
    combo.overBladeId ||
    combo.assistBladeId ||
    combo.ratchetId ||
    combo.bitId
  );
}

export function getMissingComboPartLabels(
  combo: ComboSelection,
  partsById: Map<string, PartRow>
): string[] {
  if (!combo.system || !isValidBeySystem(combo.system)) {
    return ["Sistema do Beyblade"];
  }

  const cfg = BEY_SYSTEM_CONFIG[combo.system];
  const missing: string[] = [];

  if (cfg.needsLockChip && !combo.lockChipId) {
    missing.push("Lock Chip");
  }
  if (cfg.needsOverBlade && !combo.overBladeId) {
    missing.push("Over Blade");
  }
  if (!combo.bladeId) {
    missing.push(cfg.bladeLabel);
  }
  if (cfg.needsAssistBlade && !combo.assistBladeId) {
    missing.push("Assist Blade");
  }
  if (cfg.needsRatchet && !combo.ratchetId) {
    missing.push("Ratchet");
  }

  const ratchet = combo.ratchetId ? partsById.get(combo.ratchetId) : undefined;
  if (!ratchet?.blocks_bit && !combo.bitId) {
    missing.push("Bit");
  }

  return missing;
}

export function validateCompleteCombo(
  combo: ComboSelection,
  partsById: Map<string, PartRow>,
  options?: { allowEmpty?: boolean; slotNumber?: number }
): { valid: true; sanitized: ComboSelection } | { valid: false; error: string } {
  const prefix = options?.slotNumber ? `Combo #${options.slotNumber}: ` : "";
  if (options?.allowEmpty && isComboEmpty(combo)) {
    return { valid: true, sanitized: createEmptyComboSelection() };
  }

  const compat = validateComboCompatibility(combo, partsById);
  if (!compat.valid) {
    return { valid: false, error: `${prefix}${compat.error}` };
  }

  const s = compat.sanitized;
  if (!s.system) {
    return {
      valid: false,
      error: `${prefix}Selecione o sistema do Beyblade (BX, BXE, UX, UXE, CX ou CXE).`,
    };
  }

  const missing = getMissingComboPartLabels(s, partsById);
  if (missing.length > 0) {
    return {
      valid: false,
      error: `${prefix}Complete todas as peças obrigatórias do sistema ${s.system} (faltando: ${missing.join(", ")}).`,
    };
  }

  return { valid: true, sanitized: s };
}

export function validateTournamentDeckCombo(
  combo: ComboSelection,
  partsById: Map<string, PartRow>,
  bannedPartIds: Set<string>,
  slotNumber?: number
): { valid: true; sanitized: ComboSelection } | { valid: false; error: string } {
  const prefix = slotNumber ? `Combo #${slotNumber}: ` : "";
  const completeCheck = validateCompleteCombo(combo, partsById, {
    allowEmpty: false,
    slotNumber,
  });
  if (!completeCheck.valid) {
    return completeCheck;
  }

  const s = completeCheck.sanitized;

  const selectedIds = [
    s.lockChipId,
    s.overBladeId,
    s.bladeId,
    s.assistBladeId,
    s.ratchetId,
    s.bitId,
  ].filter(Boolean);

  for (const partId of selectedIds) {
    const part = partsById.get(partId);
    if (!part || !part.is_active) {
      return {
        valid: false,
        error: `${prefix}Uma das peças selecionadas não está ativa no catálogo.`,
      };
    }
    if (bannedPartIds.has(part.id)) {
      return {
        valid: false,
        error: `${prefix}A peça "${part.name}" está banida no formato deste torneio.`,
      };
    }
  }

  return { valid: true, sanitized: s };
}

export function comboRowToSelection(
  row: Pick<
    RegistrationComboRow,
    | "system"
    | "blade_id"
    | "lock_chip_id"
    | "over_blade_id"
    | "assist_blade_id"
    | "ratchet_id"
    | "bit_id"
  >,
  partsById: Map<string, PartRow>
): ComboSelection {
  const blade = row.blade_id ? (partsById.get(row.blade_id) ?? null) : null;
  const lockChip = row.lock_chip_id
    ? (partsById.get(row.lock_chip_id) ?? null)
    : null;
  const overBlade = row.over_blade_id
    ? (partsById.get(row.over_blade_id) ?? null)
    : null;
  const assistBlade = row.assist_blade_id
    ? (partsById.get(row.assist_blade_id) ?? null)
    : null;

  return {
    system: inferComboSystem({
      system: row.system,
      blade,
      lockChip,
      overBlade,
      assistBlade,
    }),
    bladeId: row.blade_id ?? "",
    lockChipId: row.lock_chip_id ?? "",
    overBladeId: row.over_blade_id ?? "",
    assistBladeId: row.assist_blade_id ?? "",
    ratchetId: row.ratchet_id ?? "",
    bitId: row.bit_id ?? "",
  };
}

export interface ComboBadgeChip {
  slot: string;
  name: string;
  tone: "primary" | "orange" | "yellow" | "muted";
}

export function formatComboDisplay(parts: {
  system?: BeySystem | null;
  blade?: PartRow | null;
  lockChip?: PartRow | null;
  overBlade?: PartRow | null;
  assistBlade?: PartRow | null;
  ratchet?: PartRow | null;
  bit?: PartRow | null;
}): {
  system: BeySystem | null;
  summaryText: string;
  chips: ComboBadgeChip[];
} {
  const system = inferComboSystem(parts);
  const cfg = system ? BEY_SYSTEM_CONFIG[system] : null;
  const chips: ComboBadgeChip[] = [];

  if (parts.lockChip) {
    chips.push({
      slot: "Lock Chip",
      name: parts.lockChip.name,
      tone: "muted",
    });
  }
  if (parts.overBlade) {
    chips.push({
      slot: "Over Blade",
      name: parts.overBlade.name,
      tone: "primary",
    });
  }
  if (parts.blade) {
    chips.push({
      slot: cfg?.bladeLabel ?? "Blade",
      name: parts.blade.name,
      tone: "primary",
    });
  }
  if (parts.assistBlade) {
    chips.push({
      slot: "Assist Blade",
      name: parts.assistBlade.name,
      tone: "muted",
    });
  }
  if (parts.ratchet) {
    chips.push({
      slot: "Ratchet",
      name: parts.ratchet.name,
      tone: "orange",
    });
  }
  if (parts.bit) {
    chips.push({
      slot: "Bit",
      name: parts.bit.name,
      tone: "yellow",
    });
  }

  // Monta nome compacto legível seguindo convenção Beyblade X
  const bladeTitleParts = [
    parts.lockChip?.name,
    parts.overBlade?.name,
    parts.blade?.name,
    parts.assistBlade?.name,
  ].filter(Boolean);

  const lowerParts = [parts.ratchet?.name, parts.bit?.name].filter(Boolean);

  const summarySegments: string[] = [];
  if (bladeTitleParts.length > 0) {
    summarySegments.push(bladeTitleParts.join(" "));
  }
  if (lowerParts.length > 0) {
    summarySegments.push(lowerParts.join(" "));
  }

  return {
    system,
    summaryText: summarySegments.join(" • "),
    chips,
  };
}
