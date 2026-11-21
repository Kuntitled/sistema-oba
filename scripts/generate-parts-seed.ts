import fs from "node:fs";
import path from "node:path";

type PartType =
  | "blade"
  | "ratchet"
  | "bit"
  | "lock_chip"
  | "assist_blade"
  | "over_blade";

type PartLine = "BX" | "UX" | "CX";

interface CsvSource {
  file: string;
  partType: PartType;
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
}

const SEED_DATA_DIR = path.join(process.cwd(), "scripts", "seed-data");
const OUTPUT_SQL_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "006_seed_parts_catalog.sql"
);

const CSV_PAIRS: Array<{
  partType: PartType;
  ttFile: string;
  hasbroFile: string;
}> = [
  {
    partType: "blade",
    ttFile: "Beyblade X Available Colors - TT Blades.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Blades.csv",
  },
  {
    partType: "ratchet",
    ttFile: "Beyblade X Available Colors - TT Ratchets.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Ratchets.csv",
  },
  {
    partType: "bit",
    ttFile: "Beyblade X Available Colors - TT Bits.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Bits.csv",
  },
  {
    partType: "lock_chip",
    ttFile: "Beyblade X Available Colors - TT Lock Chips.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Lock Chips.csv",
  },
  {
    partType: "assist_blade",
    ttFile: "Beyblade X Available Colors - TT Assist Blades.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Assist Blades.csv",
  },
  {
    partType: "over_blade",
    ttFile: "Beyblade X Available Colors - TT Over Blades.csv",
    hasbroFile: "Beyblade X Available Colors - Hasbro Over Blades.csv",
  },
];

// Correções de digitação no nome canônico TT da planilha de origem
const CANONICAL_NAME_FIXES: Record<PartType, Record<string, string>> = {
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
const EXPLICIT_HASBRO_TO_TT: Record<PartType, Record<string, string>> = {
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

const LINE_OVERRIDES: Record<PartType, Record<string, PartLine>> = {
  blade: {
    SharkEdge: "BX",
    CobaltDrake: "BX",
    PhoenixFeather: "BX",
    AeroPegasus: "UX",
    ShinobiKnife: "BX",
    MammothTusk: "BX",
    CrocoCrunch: "BX",
    SamuraiSteel: "BX",
    Volt: "CX",
    WyvernHover: "UX",
    Fang: "CX",
    SharkGill: "BX",
    OrochiCluster: "UX",
    "Red Hulk": "BX",
    "Captain America": "BX",
    Antlers: "CX",
    Fort: "CX",
    Wriggle: "CX",
    ValorBison: "UX",
    "HellsScythe v2": "BX",
    PteraSwing: "BX",
    Hurricane: "CX",
  },
  ratchet: {},
  bit: {
    Quake: "BX",
  },
  lock_chip: {},
  assist_blade: {},
  over_blade: {},
};

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

function inferPartLine(
  partType: PartType,
  canonicalName: string,
  releases: string[]
): PartLine {
  if (
    partType === "lock_chip" ||
    partType === "assist_blade" ||
    partType === "over_blade"
  ) {
    return "CX";
  }

  const override = LINE_OVERRIDES[partType][canonicalName];
  if (override) {
    return override;
  }

  for (const rel of releases) {
    const match = /\b(BX|UX|CX|BXG)-?\d+/i.exec(rel);
    if (match) {
      const prefix = match[1].toUpperCase();
      if (prefix === "BXG" || prefix === "BX") return "BX";
      if (prefix === "UX") return "UX";
      if (prefix === "CX") return "CX";
    }
  }

  return "BX";
}

function sqlEscape(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlTextArray(values: string[]): string {
  if (values.length === 0) {
    return "ARRAY[]::TEXT[]";
  }
  return `ARRAY[${values.map((v) => sqlEscape(v)).join(", ")}]::TEXT[]`;
}

function main() {
  const allEntries: CatalogSeedEntry[] = [];
  const statsByType: Record<
    PartType,
    { ttRaw: number; hasbroRaw: number; finalCount: number; withAliases: number }
  > = {
    blade: { ttRaw: 0, hasbroRaw: 0, finalCount: 0, withAliases: 0 },
    ratchet: { ttRaw: 0, hasbroRaw: 0, finalCount: 0, withAliases: 0 },
    bit: { ttRaw: 0, hasbroRaw: 0, finalCount: 0, withAliases: 0 },
    lock_chip: { ttRaw: 0, hasbroRaw: 0, finalCount: 0, withAliases: 0 },
    assist_blade: { ttRaw: 0, hasbroRaw: 0, finalCount: 0, withAliases: 0 },
    over_blade: { ttRaw: 0, hasbroRaw: 0, finalCount: 0, withAliases: 0 },
  };

  for (const pair of CSV_PAIRS) {
    const ttEntries = readPartCsv({
      file: pair.ttFile,
      partType: pair.partType,
      distributor: "TT",
    });
    const hasbroEntries = readPartCsv({
      file: pair.hasbroFile,
      partType: pair.partType,
      distributor: "Hasbro",
    });

    statsByType[pair.partType].ttRaw = ttEntries.length;
    statsByType[pair.partType].hasbroRaw = hasbroEntries.length;

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
        CANONICAL_NAME_FIXES[pair.partType][tt.name] ?? tt.name;
      const line = inferPartLine(pair.partType, canonical, tt.releases);
      const entry: CatalogSeedEntry = {
        name: canonical,
        aliases: [],
        partType: pair.partType,
        line,
      };
      const extras =
        EXTRA_ALIASES_BY_CANONICAL[`${pair.partType}:${canonical}`] ?? [];
      for (const extra of extras) {
        addAlias(entry, extra);
      }
      addEntry(entry);
    }

    for (const hb of hasbroEntries) {
      const explicitTt = EXPLICIT_HASBRO_TO_TT[pair.partType][hb.name];
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
        CANONICAL_NAME_FIXES[pair.partType][hb.name] ?? hb.name;
      const existingByCanonical = byCanonicalLower.get(
        canonicalHasbro.toLowerCase()
      );
      if (existingByCanonical) {
        addAlias(existingByCanonical, hb.name);
        continue;
      }

      const exclusiveEntry: CatalogSeedEntry = {
        name: canonicalHasbro,
        aliases: [],
        partType: pair.partType,
        line: inferPartLine(pair.partType, canonicalHasbro, hb.releases),
      };
      addEntry(exclusiveEntry);
    }

    for (const entry of orderedEntries) {
      entry.aliases.sort((a, b) => a.localeCompare(b));
      if (entry.aliases.length > 0) {
        statsByType[pair.partType].withAliases += 1;
      }
      allEntries.push(entry);
    }

    statsByType[pair.partType].finalCount = orderedEntries.length;
  }

  const lines: string[] = [
    "-- ============================================================",
    "-- Sistema OBA — Seed Oficial do Catálogo de Peças (006)",
    "-- Gerado automaticamente por: scripts/generate-parts-seed.ts",
    "-- Regras: sem duplicação por cor/recolor ou distribuidor (TT/Hasbro).",
    "-- ============================================================",
    "",
  ];

  for (const pair of CSV_PAIRS) {
    const group = allEntries.filter((e) => e.partType === pair.partType);
    if (group.length === 0) continue;

    lines.push(
      `-- ─── ${pair.partType.toUpperCase()} (${group.length} peças únicas) ────────────────────────`
    );
    lines.push(
      "INSERT INTO public.parts_catalog (name, aliases, part_type, line, is_active)"
    );
    lines.push("VALUES");

    const valueLines = group.map((item, idx) => {
      const suffix = idx === group.length - 1 ? "" : ",";
      return `  (${sqlEscape(item.name)}, ${sqlTextArray(item.aliases)}, ${sqlEscape(item.partType)}, ${sqlEscape(item.line)}, true)${suffix}`;
    });

    lines.push(...valueLines);
    lines.push("ON CONFLICT (name, part_type) DO NOTHING;");
    lines.push("");
  }

  fs.writeFileSync(OUTPUT_SQL_PATH, `${lines.join("\n")}`, "utf8");

  console.log("Seed SQL gerado com sucesso:", OUTPUT_SQL_PATH);
  console.log("Resumo por tipo:");
  for (const pair of CSV_PAIRS) {
    const st = statsByType[pair.partType];
    console.log(
      `  - ${pair.partType}: TT=${st.ttRaw}, Hasbro=${st.hasbroRaw} -> ${st.finalCount} únicas (${st.withAliases} com aliases)`
    );
  }
  console.log(`Total de peças únicas geradas: ${allEntries.length}`);
}

main();
