import fs from "node:fs";
import path from "node:path";

type CsvCategory =
  | "blade"
  | "ratchet"
  | "bit"
  | "lock_chip"
  | "assist_blade"
  | "over_blade";

type PartType =
  | "blade"
  | "main_blade"
  | "metal_blade"
  | "over_blade"
  | "lock_chip"
  | "assist_blade"
  | "ratchet"
  | "bit";

type PartLine = "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;

interface CsvSource {
  file: string;
  csvCategory: CsvCategory;
  distributor: "TT" | "Hasbro";
}

interface ParsedCsvEntry {
  name: string;
  releases: string[];
}

interface CatalogSeedEntry {
  name: string;
  aliases: string[];
  partType: PartType;
  line: PartLine;
  isSimpleRatchet: boolean;
  requiresSimpleRatchet: boolean;
  blocksBit: boolean;
}

const SEED_DATA_DIR = path.join(process.cwd(), "scripts", "seed-data");
const OUTPUT_UPDATE_SQL_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "008_update_parts_classification.sql"
);

const CSV_PAIRS: Array<{
  csvCategory: CsvCategory;
  ttFile: string;
  hasbroFile: string;
}> = [
  {
    csvCategory: "blade",
    ttFile: "Beyblade X Available Colors - TT Blades.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Blades.csv",
  },
  {
    csvCategory: "ratchet",
    ttFile: "Beyblade X Available Colors - TT Ratchets.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Ratchets.csv",
  },
  {
    csvCategory: "bit",
    ttFile: "Beyblade X Available Colors - TT Bits.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Bits.csv",
  },
  {
    csvCategory: "lock_chip",
    ttFile: "Beyblade X Available Colors - TT Lock Chips.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Lock Chips.csv",
  },
  {
    csvCategory: "assist_blade",
    ttFile: "Beyblade X Available Colors - TT Assist Blades.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Assist Blades.csv",
  },
  {
    csvCategory: "over_blade",
    ttFile: "Beyblade X Available Colors - TT Over Blades.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Over Blades.csv",
  },
];

// Correções de digitação no nome canônico TT da planilha de origem
const CANONICAL_NAME_FIXES: Record<CsvCategory, Record<string, string>> = {
  blade: {
    "The Mandolorian": "The Mandalorian",
  },
  ratchet: {},
  bit: {
    Yeilding: "Yielding",
  },
  lock_chip: {},
  assist_blade: {},
  over_blade: {},
};

// Mapeamento explícito de nomes Hasbro distintos -> nome canônico Takara Tomy
const EXPLICIT_HASBRO_TO_TT: Record<CsvCategory, Record<string, string>> = {
  blade: {
    "Helm Knight": "KnightShield",
    "Scythe Incendio": "HellsScythe",
    "Chain Incendio": "HellsChain",
    "Hammer Incendio": "HellsHammer",
    "Nether Incendio": "HellsNether",
    "Keel Shark": "SharkEdge",
    "Soar Phoenix": "PhoenixWing",
    "Talon Ptera": "PteraSwing",
    "Bite Croc": "CrocoCrunch",
    "Savage Bear": "BearScratch",
    "Wand Wizard": "WizardRod",
    "Obsidian Shell": "BlackShell",
    "Pearl Tiger": "WeissTiger",
    "Scarlet Garuda": "CrimsonGaruda",
    "Sterling Wolf": "SilverWolf",
    "Tide Whale": "WhaleWave",
    Courage: "Brave",
    Antler: "Antlers",
    Armor: "Fortress",
    "Meteoroid Dragoon": "MeteorDragoon",
    "Rocket Griffon": "BulletGriffon",
    "Brace Triceratops": "TriceraPress",
    "Ring Aether": "HeavensRing",
    "Supress Superion": "SiegSuperion",
    "Coil Orochi": "OrochiCluster",
    "Mosasaurus/Ridge Triceratops": "Mosasaurus",
    "The Mandolorian": "The Mandalorian",
  },
  ratchet: {},
  bit: {
    "Disk Ball": "Disc Ball",
    "Disk Spike": "Disc Spike",
    Yielding: "Yielding",
  },
  lock_chip: {
    Incendio: "Hells",
    Stag: "Bucks",
  },
  assist_blade: {},
  over_blade: {},
};

const EXTRA_ALIASES_BY_CANONICAL: Record<string, string[]> = {
  "blade:Mosasaurus": ["Ridge Triceratops"],
  "blade:The Mandalorian": ["The Mandolorian"],
  "bit:Yielding": ["Yeilding"],
};

// Reclassificação de sub-sistemas e tipos específicos
const MAIN_BLADE_NAMES = new Set([
  "Brave",
  "Arc",
  "Dark",
  "Reaper",
  "Brush",
  "Blast",
  "Flame",
  "Volt",
  "Eclipse",
  "Fang",
  "Hunt",
  "Might",
  "Flare",
  "Antlers",
  "Fort",
  "Wriggle",
]);

const METAL_BLADE_NAMES = new Set([
  "Blitz",
  "Fortress",
  "Rage",
  "Delta",
  "Whip",
  "Tread",
  "Force",
  "Hurricane",
]);

const UXE_BLADE_NAMES = new Set([
  "BulletGriffon",
  "GloryValkyrie",
  "HellsNether",
  "ValorBison",
  "Cutter Shinobi",
  "Rampart Aegis",
  "Seize Jaguar",
]);

const BXE_BLADE_NAMES = new Set([
  "DranStrike",
  "HeavensRing",
  "LusterDragoon",
  "SiegSuperion",
  "Shatter Horus",
  "Glare Cyclops",
]);

const REQUIRES_SIMPLE_RATCHET_NAMES = new Set(["ClockMirage"]);

// Ratchets Compostas/Integradas listadas originalmente na aba Bits dos CSVs
const BLOCKS_BIT_RATCHET_NAMES = new Set(["Operate", "Turbo"]);

const BLADE_LINE_OVERRIDES: Record<string, Exclude<PartLine, null>> = {
  SharkEdge: "BX",
  CobaltDrake: "BX",
  PhoenixFeather: "BX",
  AeroPegasus: "UX",
  ShinobiKnife: "BX",
  MammothTusk: "BX",
  CrocoCrunch: "BX",
  SamuraiSteel: "BX",
  WyvernHover: "UX",
  SharkGill: "BX",
  OrochiCluster: "UX",
  "Red Hulk": "BX",
  "Captain America": "BX",
  "HellsScythe v2": "BX",
  PteraSwing: "BX",
  TyrannoRoar: "BX",
  "Stun Medusa": "UX",
  "Hack Viking": "UX",
};

const PART_TYPE_OUTPUT_ORDER: PartType[] = [
  "blade",
  "main_blade",
  "metal_blade",
  "over_blade",
  "lock_chip",
  "assist_blade",
  "ratchet",
  "bit",
];

function parseCsvRfc4180(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      currentRow.push(currentField);
      currentField = "";
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") {
        i += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else if (ch === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function readPartCsv(source: CsvSource): ParsedCsvEntry[] {
  const fullPath = path.join(SEED_DATA_DIR, source.file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Arquivo CSV não encontrado: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, "utf8");
  const rows = parseCsvRfc4180(content);
  const entries: ParsedCsvEntry[] = [];

  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;

    const rawName = (row[0] ?? "").trim();
    if (!rawName) continue;
    if (/full name unknown/i.test(rawName)) continue;

    const releases: string[] = [];
    for (let col = 3; col < row.length; col += 3) {
      const rel = (row[col] ?? "").trim();
      if (rel) releases.push(rel);
    }

    entries.push({ name: rawName, releases });
  }

  return entries;
}

function compactName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function classifyPart(
  csvCategory: CsvCategory,
  canonicalName: string,
  releases: string[]
): {
  partType: PartType;
  line: PartLine;
  isSimpleRatchet: boolean;
  requiresSimpleRatchet: boolean;
  blocksBit: boolean;
} {
  if (csvCategory === "lock_chip" || csvCategory === "assist_blade") {
    return {
      partType: csvCategory,
      line: "CX",
      isSimpleRatchet: false,
      requiresSimpleRatchet: false,
      blocksBit: false,
    };
  }

  if (csvCategory === "over_blade") {
    return {
      partType: "over_blade",
      line: "CXE",
      isSimpleRatchet: false,
      requiresSimpleRatchet: false,
      blocksBit: false,
    };
  }

  if (csvCategory === "ratchet") {
    return {
      partType: "ratchet",
      line: null,
      isSimpleRatchet: /5$/.test(canonicalName),
      requiresSimpleRatchet: false,
      blocksBit: false,
    };
  }

  if (csvCategory === "bit") {
    if (BLOCKS_BIT_RATCHET_NAMES.has(canonicalName)) {
      return {
        partType: "ratchet",
        line: null,
        isSimpleRatchet: false,
        requiresSimpleRatchet: false,
        blocksBit: true,
      };
    }

    return {
      partType: "bit",
      line: null,
      isSimpleRatchet: false,
      requiresSimpleRatchet: false,
      blocksBit: false,
    };
  }

  // csvCategory === "blade"
  if (MAIN_BLADE_NAMES.has(canonicalName)) {
    return {
      partType: "main_blade",
      line: "CX",
      isSimpleRatchet: false,
      requiresSimpleRatchet: REQUIRES_SIMPLE_RATCHET_NAMES.has(canonicalName),
      blocksBit: false,
    };
  }

  if (METAL_BLADE_NAMES.has(canonicalName)) {
    return {
      partType: "metal_blade",
      line: "CXE",
      isSimpleRatchet: false,
      requiresSimpleRatchet: REQUIRES_SIMPLE_RATCHET_NAMES.has(canonicalName),
      blocksBit: false,
    };
  }

  let line: Exclude<PartLine, null> = "BX";

  if (UXE_BLADE_NAMES.has(canonicalName)) {
    line = "UXE";
  } else if (BXE_BLADE_NAMES.has(canonicalName)) {
    line = "BXE";
  } else if (BLADE_LINE_OVERRIDES[canonicalName]) {
    line = BLADE_LINE_OVERRIDES[canonicalName];
  } else {
    for (const rel of releases) {
      const match = /\b(BX|UX|CX|BXG)-?\d+/i.exec(rel);
      if (match) {
        const prefix = match[1].toUpperCase();
        if (prefix === "UX") {
          line = "UX";
          break;
        }
        if (prefix === "BXG" || prefix === "BX") {
          line = "BX";
          break;
        }
      }
    }
  }

  return {
    partType: "blade",
    line,
    isSimpleRatchet: false,
    requiresSimpleRatchet: REQUIRES_SIMPLE_RATCHET_NAMES.has(canonicalName),
    blocksBit: false,
  };
}

function sqlEscape(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullableText(value: string | null): string {
  return value === null ? "NULL" : sqlEscape(value);
}

function sqlTextArray(values: string[]): string {
  if (values.length === 0) {
    return "ARRAY[]::TEXT[]";
  }
  return `ARRAY[${values.map((v) => sqlEscape(v)).join(", ")}]::TEXT[]`;
}

function main() {
  const allEntries: CatalogSeedEntry[] = [];
  const rawStatsByCategory: Record<
    CsvCategory,
    { ttRaw: number; hasbroRaw: number; uniqueBeforeReclass: number }
  > = {
    blade: { ttRaw: 0, hasbroRaw: 0, uniqueBeforeReclass: 0 },
    ratchet: { ttRaw: 0, hasbroRaw: 0, uniqueBeforeReclass: 0 },
    bit: { ttRaw: 0, hasbroRaw: 0, uniqueBeforeReclass: 0 },
    lock_chip: { ttRaw: 0, hasbroRaw: 0, uniqueBeforeReclass: 0 },
    assist_blade: { ttRaw: 0, hasbroRaw: 0, uniqueBeforeReclass: 0 },
    over_blade: { ttRaw: 0, hasbroRaw: 0, uniqueBeforeReclass: 0 },
  };

  for (const pair of CSV_PAIRS) {
    const ttEntries = readPartCsv({
      file: pair.ttFile,
      csvCategory: pair.csvCategory,
      distributor: "TT",
    });
    const hasbroEntries = readPartCsv({
      file: pair.hasbroFile,
      csvCategory: pair.csvCategory,
      distributor: "Hasbro",
    });

    rawStatsByCategory[pair.csvCategory].ttRaw = ttEntries.length;
    rawStatsByCategory[pair.csvCategory].hasbroRaw = hasbroEntries.length;

    const byCanonicalLower = new Map<string, CatalogSeedEntry>();
    const byCompact = new Map<string, CatalogSeedEntry>();
    const orderedEntries: CatalogSeedEntry[] = [];

    const addEntry = (entry: CatalogSeedEntry) => {
      const lowerKey = entry.name.toLowerCase();
      if (byCanonicalLower.has(lowerKey)) return;
      byCanonicalLower.set(lowerKey, entry);
      byCompact.set(compactName(entry.name), entry);
      orderedEntries.push(entry);
    };

    const addAlias = (target: CatalogSeedEntry, alias: string) => {
      const cleaned = alias.trim();
      if (!cleaned) return;
      if (cleaned.toLowerCase() === target.name.toLowerCase()) return;
      if (
        target.aliases.some(
          (existing) => existing.toLowerCase() === cleaned.toLowerCase()
        )
      ) {
        return;
      }
      target.aliases.push(cleaned);
    };

    for (const tt of ttEntries) {
      const canonical =
        CANONICAL_NAME_FIXES[pair.csvCategory][tt.name] ?? tt.name;
      const classification = classifyPart(
        pair.csvCategory,
        canonical,
        tt.releases
      );
      const entry: CatalogSeedEntry = {
        name: canonical,
        aliases: [],
        ...classification,
      };
      const extras =
        EXTRA_ALIASES_BY_CANONICAL[`${pair.csvCategory}:${canonical}`] ?? [];
      for (const extra of extras) {
        addAlias(entry, extra);
      }
      addEntry(entry);
    }

    for (const hb of hasbroEntries) {
      const explicitTt = EXPLICIT_HASBRO_TO_TT[pair.csvCategory][hb.name];
      let target: CatalogSeedEntry | undefined;

      if (explicitTt) {
        target = byCanonicalLower.get(explicitTt.toLowerCase());
      }

      if (!target) {
        target = byCanonicalLower.get(hb.name.toLowerCase());
      }

      if (!target) {
        target = byCompact.get(compactName(hb.name));
      }

      if (!target) {
        const words = hb.name.split(/\s+/).filter(Boolean);
        if (words.length === 2) {
          target = byCompact.get(compactName(`${words[1]}${words[0]}`));
        }
      }

      if (target) {
        addAlias(target, hb.name);
        continue;
      }

      // Peça exclusiva Hasbro ou collab sem entrada na planilha TT
      const canonicalHasbro =
        CANONICAL_NAME_FIXES[pair.csvCategory][hb.name] ?? hb.name;
      const existingByCanonical = byCanonicalLower.get(
        canonicalHasbro.toLowerCase()
      );
      if (existingByCanonical) {
        addAlias(existingByCanonical, hb.name);
        continue;
      }

      const classification = classifyPart(
        pair.csvCategory,
        canonicalHasbro,
        hb.releases
      );
      const exclusiveEntry: CatalogSeedEntry = {
        name: canonicalHasbro,
        aliases: [],
        ...classification,
      };
      addEntry(exclusiveEntry);
    }

    for (const entry of orderedEntries) {
      entry.aliases.sort((a, b) => a.localeCompare(b));
      allEntries.push(entry);
    }

    rawStatsByCategory[pair.csvCategory].uniqueBeforeReclass =
      orderedEntries.length;
  }

  const mainBladeList = Array.from(MAIN_BLADE_NAMES).map(sqlEscape).join(", ");
  const metalBladeList = Array.from(METAL_BLADE_NAMES).map(sqlEscape).join(", ");
  const blocksBitList = Array.from(BLOCKS_BIT_RATCHET_NAMES)
    .map(sqlEscape)
    .join(", ");

  const lines: string[] = [
    "-- ============================================================",
    "-- Sistema OBA — Reclassificação Idempotente do Catálogo de Peças (008)",
    "-- Gerado automaticamente por: scripts/generate-parts-seed.ts",
    "-- Regras: preserva UUIDs existentes em parts_catalog, reclassifica tipos/linhas",
    "--         e preenche flags de compatibilidade (BX, BXE, UX, UXE, CX, CXE).",
    "-- ============================================================",
    "",
    "-- ─── 1. Reclassificar part_type in-place preservando IDs já vinculados ───────",
    "UPDATE public.parts_catalog p",
    "SET",
    "  part_type = 'main_blade',",
    "  line = 'CX'",
    "WHERE p.part_type = 'blade'",
    `  AND p.name IN (${mainBladeList})`,
    "  AND NOT EXISTS (",
    "    SELECT 1 FROM public.parts_catalog p2",
    "    WHERE p2.name = p.name AND p2.part_type = 'main_blade'",
    "  );",
    "",
    "UPDATE public.parts_catalog p",
    "SET",
    "  part_type = 'metal_blade',",
    "  line = 'CXE'",
    "WHERE p.part_type = 'blade'",
    `  AND p.name IN (${metalBladeList})`,
    "  AND NOT EXISTS (",
    "    SELECT 1 FROM public.parts_catalog p2",
    "    WHERE p2.name = p.name AND p2.part_type = 'metal_blade'",
    "  );",
    "",
    "-- Operate e Turbo são Ratchets Compostas/Integradas (não Bits)",
    "UPDATE public.parts_catalog p",
    "SET",
    "  part_type = 'ratchet',",
    "  line = NULL,",
    "  blocks_bit = true",
    "WHERE p.part_type = 'bit'",
    `  AND p.name IN (${blocksBitList})`,
    "  AND NOT EXISTS (",
    "    SELECT 1 FROM public.parts_catalog p2",
    "    WHERE p2.name = p.name AND p2.part_type = 'ratchet'",
    "  );",
    "",
    "-- ─── 2. Upsert idempotente de todas as 288 peças classificadas ─────────────",
  ];

  for (const partType of PART_TYPE_OUTPUT_ORDER) {
    const group = allEntries.filter((e) => e.partType === partType);
    if (group.length === 0) continue;

    lines.push(
      `-- ─── ${partType.toUpperCase()} (${group.length} peças) ────────────────────────`
    );
    lines.push(
      "INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_simple_ratchet, requires_simple_ratchet, blocks_bit, is_active)"
    );
    lines.push("VALUES");

    const valueLines = group.map((item, idx) => {
      const suffix = idx === group.length - 1 ? "" : ",";
      return `  (${sqlEscape(item.name)}, ${sqlTextArray(item.aliases)}, ${sqlEscape(item.partType)}, ${sqlNullableText(item.line)}, ${item.isSimpleRatchet}, ${item.requiresSimpleRatchet}, ${item.blocksBit}, true)${suffix}`;
    });

    lines.push(...valueLines);
    lines.push("ON CONFLICT (name, part_type) DO UPDATE");
    lines.push("SET");
    lines.push("  aliases = EXCLUDED.aliases,");
    lines.push("  line = EXCLUDED.line,");
    lines.push("  is_simple_ratchet = EXCLUDED.is_simple_ratchet,");
    lines.push("  requires_simple_ratchet = EXCLUDED.requires_simple_ratchet,");
    lines.push("  blocks_bit = EXCLUDED.blocks_bit;");
    lines.push("");
  }

  lines.push(
    "-- ─── 3. Ajuste defensivo de Combos Favoritos já salvos em public.bladers ──"
  );
  lines.push("UPDATE public.bladers b");
  lines.push("SET");
  lines.push(
    "  favorite_ratchet_id = COALESCE(b.favorite_ratchet_id, b.favorite_bit_id),"
  );
  lines.push("  favorite_bit_id = NULL");
  lines.push("FROM public.parts_catalog p");
  lines.push("WHERE b.favorite_bit_id = p.id");
  lines.push("  AND p.blocks_bit = true;");
  lines.push("");
  lines.push("UPDATE public.bladers b");
  lines.push("SET favorite_system = p.line");
  lines.push("FROM public.parts_catalog p");
  lines.push("WHERE b.favorite_blade_id = p.id");
  lines.push("  AND p.line IN ('BX', 'BXE', 'UX', 'UXE', 'CX', 'CXE')");
  lines.push("  AND b.favorite_system IS DISTINCT FROM p.line;");
  lines.push("");

  fs.writeFileSync(OUTPUT_UPDATE_SQL_PATH, `${lines.join("\n")}`, "utf8");

  // Estatísticas finais
  const byType = new Map<PartType, number>();
  const byLine = new Map<string, number>();
  let simpleRatchets = 0;
  let requiresSimple = 0;
  let blocksBit = 0;

  for (const e of allEntries) {
    byType.set(e.partType, (byType.get(e.partType) ?? 0) + 1);
    const lKey = e.line ?? "NULL";
    byLine.set(lKey, (byLine.get(lKey) ?? 0) + 1);
    if (e.isSimpleRatchet) simpleRatchets += 1;
    if (e.requiresSimpleRatchet) requiresSimple += 1;
    if (e.blocksBit) blocksBit += 1;
  }

  console.log("Migration SQL gerada com sucesso:", OUTPUT_UPDATE_SQL_PATH);
  console.log("Resumo por tipo final:");
  for (const pt of PART_TYPE_OUTPUT_ORDER) {
    console.log(`  - ${pt}: ${byType.get(pt) ?? 0}`);
  }
  console.log("Resumo por linha:");
  for (const [k, v] of byLine.entries()) {
    console.log(`  - ${k}: ${v}`);
  }
  console.log(
    `Flags: is_simple_ratchet=${simpleRatchets}, requires_simple_ratchet=${requiresSimple}, blocks_bit=${blocksBit}`
  );
  console.log(`Total de peças únicas geradas: ${allEntries.length}`);
}

main();
