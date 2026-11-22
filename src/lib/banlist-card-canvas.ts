import { OBA_SOCIAL_LINKS } from "@/lib/constants";
import {
  PART_TYPE_ORDER,
  type PartLine,
  type PartRow,
  type PartType,
} from "@/types/domain";

export type BanlistCardAspect = "feed" | "square" | "story";

export interface BanlistCardPreset {
  id: BanlistCardAspect;
  label: string;
  shortLabel: string;
  ratioLabel: string;
  width: number;
  height: number;
}

export const BANLIST_CARD_PRESETS: Record<
  BanlistCardAspect,
  BanlistCardPreset
> = {
  feed: {
    id: "feed",
    label: "Feed Instagram (4:5)",
    shortLabel: "Feed 4:5",
    ratioLabel: "4:5",
    width: 1080,
    height: 1350,
  },
  square: {
    id: "square",
    label: "Post Quadrado (1:1)",
    shortLabel: "Quadrado 1:1",
    ratioLabel: "1:1",
    width: 1080,
    height: 1080,
  },
  story: {
    id: "story",
    label: "Story / Reels (9:16)",
    shortLabel: "Story 9:16",
    ratioLabel: "9:16",
    width: 1080,
    height: 1920,
  },
} as const;

export const BANLIST_CARD_ASPECT_ORDER: BanlistCardAspect[] = [
  "feed",
  "square",
  "story",
];

export interface BanlistCardRenderOptions {
  rulesetName: string;
  rulesetDescription?: string | null;
  bannedParts: PartRow[];
  aspect: BanlistCardAspect;
  bladesOnly: boolean;
  showHasbroAliases: boolean;
  showDescription: boolean;
  showUpdatedDate: boolean;
  subtitle?: string;
  logoImage?: HTMLImageElement | null;
  updatedAt?: Date;
}

const FONT_SANS =
  'Geist, "Geist Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const CARD_SECTION_LABELS: Record<PartType, string> = {
  blade: "BLADES",
  main_blade: "MAIN BLADES (CX)",
  metal_blade: "METAL BLADES (CXE)",
  over_blade: "OVER BLADES (CXE)",
  lock_chip: "LOCK CHIPS",
  assist_blade: "ASSIST BLADES",
  ratchet: "RATCHETS",
  bit: "BITS",
};

interface LineTheme {
  accent: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  label: string;
}

function getLineTheme(line: PartLine | null): LineTheme {
  if (line === "BX" || line === "BXE") {
    return {
      accent: "#22d3ee",
      badgeBg: "rgba(34, 211, 238, 0.16)",
      badgeBorder: "rgba(34, 211, 238, 0.45)",
      badgeText: "#67e8f9",
      label: line,
    };
  }
  if (line === "UX" || line === "UXE") {
    return {
      accent: "#c026d3",
      badgeBg: "rgba(189, 8, 245, 0.22)",
      badgeBorder: "rgba(189, 8, 245, 0.55)",
      badgeText: "#e879f9",
      label: line,
    };
  }
  if (line === "CX" || line === "CXE") {
    return {
      accent: "#f97316",
      badgeBg: "rgba(233, 107, 0, 0.22)",
      badgeBorder: "rgba(233, 107, 0, 0.55)",
      badgeText: "#fdba74",
      label: line,
    };
  }
  return {
    accent: "#edbd03",
    badgeBg: "rgba(237, 189, 3, 0.16)",
    badgeBorder: "rgba(237, 189, 3, 0.45)",
    badgeText: "#fde047",
    label: "UNIV",
  };
}

export function isBladePartType(partType: PartType): boolean {
  return (
    partType === "blade" ||
    partType === "main_blade" ||
    partType === "metal_blade" ||
    partType === "over_blade"
  );
}

export function buildBanlistCardFilename(
  rulesetName: string,
  aspect: BanlistCardAspect
): string {
  const slug = rulesetName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `banlist-oba-${slug || "formato"}-${aspect}.png`;
}

let cachedLogoPromise: Promise<HTMLImageElement | null> | null = null;

export function loadObaLogoImage(): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (cachedLogoPromise) {
    return cachedLogoPromise;
  }

  cachedLogoPromise = new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      cachedLogoPromise = null;
      resolve(null);
    };
    img.src = "/icons/icon-512x512.png";
  });

  return cachedLogoPromise;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Não foi possível exportar a imagem PNG."));
        }
      },
      "image/png",
      1
    );
  });
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = text.slice(0, mid).trimEnd() + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low > 0 ? text.slice(0, low).trimEnd() + ellipsis : ellipsis;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean || maxLines <= 0) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (!current) {
      lines.push(truncateText(ctx, word, maxWidth));
      current = "";
    } else {
      lines.push(current);
      current = word;
    }

    if (lines.length === maxLines - 1 && i < words.length) {
      const rest = [current, ...words.slice(i + 1)].filter(Boolean).join(" ");
      lines.push(truncateText(ctx, rest, maxWidth));
      return lines;
    }
  }

  if (current) {
    lines.push(
      lines.length >= maxLines - 1
        ? truncateText(ctx, current, maxWidth)
        : current
    );
  }

  return lines.slice(0, maxLines);
}

function drawProhibitionIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  strokeColor: string,
  lineWidth: number
) {
  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const offset = radius * 0.68;
  ctx.beginPath();
  ctx.moveTo(cx - offset, cy + offset);
  ctx.lineTo(cx + offset, cy - offset);
  ctx.stroke();
  ctx.restore();
}

function drawShieldCheckIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  strokeColor: string,
  fillColor: string
) {
  ctx.save();
  const halfW = size * 0.42;
  const topY = cy - size * 0.46;
  const midY = cy - size * 0.04;
  const botY = cy + size * 0.48;

  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx + halfW, topY + size * 0.16);
  ctx.lineTo(cx + halfW, midY);
  ctx.quadraticCurveTo(cx + halfW, botY - size * 0.16, cx, botY);
  ctx.quadraticCurveTo(
    cx - halfW,
    botY - size * 0.16,
    cx - halfW,
    midY
  );
  ctx.lineTo(cx - halfW, topY + size * 0.16);
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.16, cy + size * 0.02);
  ctx.lineTo(cx - size * 0.03, cy + size * 0.15);
  ctx.lineTo(cx + size * 0.19, cy - size * 0.11);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

interface LayoutDensityPreset {
  cols: number;
  cardH: number;
  cardGap: number;
  groupGap: number;
  groupHeaderH: number;
  nameFont: number;
  aliasFont: number;
  pillFont: number;
  iconR: number;
  allowAlias: boolean;
}

const DENSITY_PRESETS: LayoutDensityPreset[] = [
  {
    cols: 1,
    cardH: 88,
    cardGap: 14,
    groupGap: 24,
    groupHeaderH: 34,
    nameFont: 26,
    aliasFont: 16,
    pillFont: 15,
    iconR: 12,
    allowAlias: true,
  },
  {
    cols: 2,
    cardH: 82,
    cardGap: 14,
    groupGap: 22,
    groupHeaderH: 32,
    nameFont: 22,
    aliasFont: 14,
    pillFont: 14,
    iconR: 11,
    allowAlias: true,
  },
  {
    cols: 2,
    cardH: 70,
    cardGap: 12,
    groupGap: 18,
    groupHeaderH: 28,
    nameFont: 20,
    aliasFont: 13,
    pillFont: 13,
    iconR: 10,
    allowAlias: true,
  },
  {
    cols: 2,
    cardH: 58,
    cardGap: 10,
    groupGap: 14,
    groupHeaderH: 26,
    nameFont: 18,
    aliasFont: 12,
    pillFont: 12,
    iconR: 9,
    allowAlias: true,
  },
  {
    cols: 3,
    cardH: 60,
    cardGap: 10,
    groupGap: 14,
    groupHeaderH: 26,
    nameFont: 17,
    aliasFont: 12,
    pillFont: 11,
    iconR: 8,
    allowAlias: true,
  },
  {
    cols: 3,
    cardH: 48,
    cardGap: 8,
    groupGap: 12,
    groupHeaderH: 24,
    nameFont: 15,
    aliasFont: 11,
    pillFont: 11,
    iconR: 7,
    allowAlias: false,
  },
  {
    cols: 4,
    cardH: 42,
    cardGap: 8,
    groupGap: 10,
    groupHeaderH: 22,
    nameFont: 13,
    aliasFont: 10,
    pillFont: 10,
    iconR: 6,
    allowAlias: false,
  },
];

interface PartGroup {
  type: PartType;
  label: string;
  parts: PartRow[];
}

function measureGroupsHeight(
  groups: PartGroup[],
  preset: LayoutDensityPreset
): number {
  let h = 0;
  groups.forEach((group, idx) => {
    if (idx > 0) h += preset.groupGap;
    h += preset.groupHeaderH;
    const rows = Math.ceil(group.parts.length / preset.cols);
    h += rows * preset.cardH + Math.max(0, rows - 1) * preset.cardGap;
  });
  return h;
}

function formatPtBrDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function renderBanlistCardToCanvas(
  canvas: HTMLCanvasElement,
  options: BanlistCardRenderOptions
): void {
  const presetInfo = BANLIST_CARD_PRESETS[options.aspect];
  const W = presetInfo.width;
  const H = presetInfo.height;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const padX = 64;
  const contentW = W - padX * 2;
  const topPad =
    options.aspect === "story" ? 68 : options.aspect === "feed" ? 50 : 42;

  // ── 1. Fundo escuro OBA + brilhos atmosféricos ──────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#07050c");
  bgGrad.addColorStop(0.45, "#11081d");
  bgGrad.addColorStop(1, "#08050d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const glowPurple = ctx.createRadialGradient(
    W * 0.14,
    H * 0.1,
    10,
    W * 0.14,
    H * 0.1,
    W * 0.65
  );
  glowPurple.addColorStop(0, "rgba(189, 8, 245, 0.24)");
  glowPurple.addColorStop(1, "rgba(189, 8, 245, 0)");
  ctx.fillStyle = glowPurple;
  ctx.fillRect(0, 0, W, H);

  const glowOrange = ctx.createRadialGradient(
    W * 0.88,
    H * 0.18,
    10,
    W * 0.88,
    H * 0.18,
    W * 0.55
  );
  glowOrange.addColorStop(0, "rgba(233, 107, 0, 0.2)");
  glowOrange.addColorStop(1, "rgba(233, 107, 0, 0)");
  ctx.fillStyle = glowOrange;
  ctx.fillRect(0, 0, W, H);

  const glowCrimson = ctx.createRadialGradient(
    W * 0.5,
    H * 0.88,
    20,
    W * 0.5,
    H * 0.88,
    W * 0.65
  );
  glowCrimson.addColorStop(0, "rgba(185, 28, 28, 0.18)");
  glowCrimson.addColorStop(1, "rgba(185, 28, 28, 0)");
  ctx.fillStyle = glowCrimson;
  ctx.fillRect(0, 0, W, H);

  // Grade sutil de pontos no fundo
  ctx.fillStyle = "rgba(255, 255, 255, 0.032)";
  const dotStep = 36;
  for (let gx = 32; gx < W; gx += dotStep) {
    for (let gy = 32; gy < H; gy += dotStep) {
      ctx.fillRect(gx, gy, 2, 2);
    }
  }

  // Moldura externa sutil
  ctx.save();
  traceRoundedRect(ctx, 18, 18, W - 36, H - 36, 28);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Barras assinatura no topo e rodapé
  const topBarGrad = ctx.createLinearGradient(0, 0, W, 0);
  topBarGrad.addColorStop(0, "#bd08f5");
  topBarGrad.addColorStop(0.5, "#e96b00");
  topBarGrad.addColorStop(1, "#edbd03");
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 10, W, 10);

  // ── 2. Cabeçalho Institucional OBA ──────────────────────────────────────
  let cursorY = topPad;
  const logoSize = 90;

  ctx.save();
  traceRoundedRect(ctx, padX, cursorY, logoSize, logoSize, 22);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e96b00";
  ctx.lineWidth = 3;
  ctx.stroke();

  if (options.logoImage) {
    ctx.save();
    traceRoundedRect(
      ctx,
      padX + 4,
      cursorY + 4,
      logoSize - 8,
      logoSize - 8,
      18
    );
    ctx.clip();
    ctx.drawImage(
      options.logoImage,
      padX + 4,
      cursorY + 4,
      logoSize - 8,
      logoSize - 8
    );
    ctx.restore();
  } else {
    ctx.fillStyle = "#bd08f5";
    ctx.font = `900 30px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OBA", padX + logoSize / 2, cursorY + logoSize / 2);
  }
  ctx.restore();

  // Selo superior direito ("BAN-LIST OFICIAL")
  const tagText = "BAN-LIST OFICIAL";
  ctx.font = `800 15px ${FONT_SANS}`;
  const tagTextW = ctx.measureText(tagText).width;
  const tagPillW = tagTextW + 52;
  const tagPillH = 38;
  const tagPillX = W - padX - tagPillW;
  const tagPillY = cursorY + 4;

  ctx.save();
  traceRoundedRect(ctx, tagPillX, tagPillY, tagPillW, tagPillH, 19);
  ctx.fillStyle = "rgba(220, 38, 38, 0.2)";
  ctx.fill();
  ctx.strokeStyle = "rgba(248, 113, 113, 0.65)";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawProhibitionIcon(
    ctx,
    tagPillX + 20,
    tagPillY + tagPillH / 2,
    8,
    "#fca5a5",
    2.4
  );
  ctx.fillStyle = "#fecaca";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(tagText, tagPillX + 36, tagPillY + tagPillH / 2 + 1);
  ctx.restore();

  // Texto institucional à direita do logo
  const brandX = padX + logoSize + 22;
  const brandMaxW = tagPillX - brandX - 18;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#e879f9";
  ctx.font = `800 15px ${FONT_SANS}`;
  ctx.fillText("OBA  •  LIGA OFICIAL", brandX, cursorY + 4);

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 24px ${FONT_SANS}`;
  ctx.fillText(
    truncateText(ctx, "Organização de Beyblade do Amazonas", brandMaxW),
    brandX,
    cursorY + 26
  );

  const cleanSubtitle = options.subtitle?.trim() ?? "";
  if (cleanSubtitle) {
    ctx.fillStyle = "#fde047";
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.fillText(
      truncateText(ctx, cleanSubtitle, brandMaxW),
      brandX,
      cursorY + 58
    );
  }
  ctx.restore();

  cursorY += logoSize + (options.aspect === "square" ? 24 : 30);

  // Linha divisória do cabeçalho
  const headerDivGrad = ctx.createLinearGradient(padX, 0, padX + contentW, 0);
  headerDivGrad.addColorStop(0, "rgba(189, 8, 245, 0.55)");
  headerDivGrad.addColorStop(0.5, "rgba(233, 107, 0, 0.45)");
  headerDivGrad.addColorStop(1, "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = headerDivGrad;
  ctx.fillRect(padX, cursorY, contentW, 2);

  cursorY += options.aspect === "square" ? 22 : 28;

  // ── 3. Filtragem & Agrupamento das Peças Banidas ────────────────────────
  const activeParts = options.bannedParts
    .filter((p) => (options.bladesOnly ? isBladePartType(p.part_type) : true))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const groups: PartGroup[] = [];
  for (const partType of PART_TYPE_ORDER) {
    const groupParts = activeParts.filter((p) => p.part_type === partType);
    if (groupParts.length > 0) {
      groups.push({
        type: partType,
        label: CARD_SECTION_LABELS[partType],
        parts: groupParts,
      });
    }
  }

  // ── 4. Bloco de Título do Card ──────────────────────────────────────────
  const titleStr = options.bladesOnly ? "BLADES BANIDAS" : "PEÇAS BANIDAS";
  const titleFontSize = options.aspect === "square" ? 54 : 62;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `900 ${titleFontSize}px ${FONT_SANS}`;
  const titleGrad = ctx.createLinearGradient(padX, cursorY, padX + 520, cursorY);
  titleGrad.addColorStop(0, "#ffffff");
  titleGrad.addColorStop(0.75, "#fef3c7");
  titleGrad.addColorStop(1, "#fdba74");
  ctx.fillStyle = titleGrad;
  ctx.fillText(titleStr, padX, cursorY);
  ctx.restore();

  cursorY += titleFontSize + 14;

  // Badges: Formato + Contagem
  const countText =
    activeParts.length === 0
      ? "TODAS LIBERADAS"
      : `${activeParts.length} ${
          activeParts.length === 1 ? "BANIDA" : "BANIDAS"
        }`;
  ctx.font = `800 17px ${FONT_SANS}`;
  const countPillW = ctx.measureText(countText).width + 34;
  const pillH = 42;

  const formatPrefix = "FORMATO:";
  const formatLabelMaxW = Math.max(180, contentW - countPillW - 14);
  ctx.font = `800 18px ${FONT_SANS}`;
  const formatText = truncateText(
    ctx,
    `${formatPrefix} ${options.rulesetName.toUpperCase()}`,
    formatLabelMaxW - 34
  );
  const formatPillW = ctx.measureText(formatText).width + 36;

  ctx.save();
  traceRoundedRect(ctx, padX, cursorY, formatPillW, pillH, 12);
  ctx.fillStyle = "rgba(189, 8, 245, 0.18)";
  ctx.fill();
  ctx.strokeStyle = "rgba(189, 8, 245, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#f5d0fe";
  ctx.font = `800 18px ${FONT_SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(formatText, padX + 18, cursorY + pillH / 2 + 1);
  ctx.restore();

  const countPillX = padX + formatPillW + 14;
  ctx.save();
  traceRoundedRect(ctx, countPillX, cursorY, countPillW, pillH, 12);
  if (activeParts.length > 0) {
    ctx.fillStyle = "rgba(220, 38, 38, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.68)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fca5a5";
  } else {
    ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(52, 211, 153, 0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#6ee7b7";
  }
  ctx.font = `800 17px ${FONT_SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(countText, countPillX + countPillW / 2, cursorY + pillH / 2 + 1);
  ctx.restore();

  cursorY += pillH + 14;

  // Descrição opcional do formato
  const cleanDesc = options.showDescription
    ? (options.rulesetDescription?.trim() ?? "")
    : "";
  if (cleanDesc) {
    ctx.font = `500 20px ${FONT_SANS}`;
    const descLines = wrapTextLines(ctx, cleanDesc, contentW, 2);
    ctx.fillStyle = "rgba(226, 232, 240, 0.84)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    descLines.forEach((line, i) => {
      ctx.fillText(line, padX, cursorY + i * 28);
    });
    cursorY += descLines.length * 28 + 12;
  }

  // ── 5. Área do Rodapé (reservada com folga) ────────────────────────────
  const footerTop = H - 84;
  const bodyTop = cursorY + 8;
  const availableH = Math.max(120, footerTop - 24 - bodyTop);

  // ── 6. Conteúdo Principal: Vazio ou Grade Adaptativa ────────────────────
  if (activeParts.length === 0) {
    const emptyCardH = Math.min(340, availableH);
    const emptyCardY = bodyTop + Math.max(0, (availableH - emptyCardH) * 0.38);

    ctx.save();
    traceRoundedRect(ctx, padX, emptyCardY, contentW, emptyCardH, 24);
    ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(52, 211, 153, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const centerY = emptyCardY + emptyCardH / 2;
    drawShieldCheckIcon(
      ctx,
      W / 2,
      centerY - 58,
      78,
      "#34d399",
      "rgba(16, 185, 129, 0.16)"
    );

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 32px ${FONT_SANS}`;
    const emptyTitle =
      options.bladesOnly && options.bannedParts.length > 0
        ? "NENHUMA BLADE BANIDA"
        : "NENHUMA PEÇA BANIDA";
    ctx.fillText(emptyTitle, W / 2, centerY + 18);

    ctx.fillStyle = "#a7f3d0";
    ctx.font = `600 20px ${FONT_SANS}`;
    const emptySub =
      options.bladesOnly && options.bannedParts.length > 0
        ? `Existem ${options.bannedParts.length} peça(s) de outros tipos na ban-list deste formato.`
        : "Todas as peças competitivas estão liberadas neste formato.";
    const emptyLines = wrapTextLines(ctx, emptySub, contentW - 80, 2);
    emptyLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, centerY + 58 + i * 28);
    });
    ctx.restore();
  } else {
    // Escolhe o preset mais espaçoso que caiba integralmente no espaço disponível
    const eligiblePresets = DENSITY_PRESETS.filter((p) => {
      if (p.cols === 1) {
        return activeParts.length <= 5 && groups.length <= 3;
      }
      return true;
    });

    let chosenPreset = eligiblePresets[eligiblePresets.length - 1];
    for (const candidate of eligiblePresets) {
      const measuredH = measureGroupsHeight(groups, candidate);
      if (measuredH <= availableH) {
        chosenPreset = candidate;
        break;
      }
    }

    const totalMeasuredH = measureGroupsHeight(groups, chosenPreset);
    const fitsCompletely = totalMeasuredH <= availableH;
    const overflowReserve = fitsCompletely ? 0 : 48;
    const maxDrawY = bodyTop + availableH - overflowReserve;

    let y = fitsCompletely
      ? bodyTop + Math.min(Math.floor((availableH - totalMeasuredH) * 0.3), 42)
      : bodyTop;

    const colW =
      (contentW - chosenPreset.cardGap * (chosenPreset.cols - 1)) /
      chosenPreset.cols;

    let drawnCount = 0;
    let stoppedEarly = false;

    for (let gIdx = 0; gIdx < groups.length; gIdx += 1) {
      const group = groups[gIdx];
      const nextGroupY = gIdx > 0 ? y + chosenPreset.groupGap : y;

      // Só abre um grupo se houver espaço para o header + pelo menos 1 linha
      if (nextGroupY + chosenPreset.groupHeaderH + chosenPreset.cardH > maxDrawY) {
        stoppedEarly = true;
        break;
      }

      y = nextGroupY;

      // Cabeçalho do grupo de tipo de peça
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const headerLabel = `${group.label} (${group.parts.length})`;
      ctx.font = `800 15px ${FONT_SANS}`;
      const labelW = ctx.measureText(headerLabel).width;

      // Pílula discreta lateral + nome do grupo
      ctx.fillStyle = "#e96b00";
      ctx.fillRect(padX, y + chosenPreset.groupHeaderH / 2 - 7, 4, 14);

      ctx.fillStyle = "#fb923c";
      ctx.fillText(headerLabel, padX + 12, y + chosenPreset.groupHeaderH / 2);

      // Linha conectora à direita
      const lineStartX = padX + 24 + labelW;
      if (lineStartX < padX + contentW - 20) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(
          lineStartX,
          y + chosenPreset.groupHeaderH / 2 - 1,
          padX + contentW - lineStartX,
          2
        );
      }
      ctx.restore();

      y += chosenPreset.groupHeaderH;

      const totalRows = Math.ceil(group.parts.length / chosenPreset.cols);
      for (let row = 0; row < totalRows; row += 1) {
        if (y + chosenPreset.cardH > maxDrawY) {
          stoppedEarly = true;
          break;
        }

        const startIdx = row * chosenPreset.cols;
        const rowParts = group.parts.slice(
          startIdx,
          startIdx + chosenPreset.cols
        );

        rowParts.forEach((part, colIdx) => {
          const tileX = padX + colIdx * (colW + chosenPreset.cardGap);
          const tileY = y;
          const tileW = colW;
          const tileH = chosenPreset.cardH;
          const theme = getLineTheme(part.line);

          ctx.save();
          // Fundo do tile banido
          traceRoundedRect(ctx, tileX, tileY, tileW, tileH, 14);
          ctx.fillStyle = "rgba(28, 13, 28, 0.88)";
          ctx.fill();
          ctx.strokeStyle = "rgba(239, 68, 68, 0.42)";
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Barra lateral esquerda por linha Beyblade X (BX / UX / CX)
          ctx.save();
          traceRoundedRect(ctx, tileX, tileY, tileW, tileH, 14);
          ctx.clip();
          ctx.fillStyle = theme.accent;
          ctx.fillRect(tileX, tileY, 5, tileH);
          ctx.restore();

          // Ícone de proibição à esquerda
          const iconCenterX = tileX + 18 + chosenPreset.iconR;
          const iconCenterY = tileY + tileH / 2;
          drawProhibitionIcon(
            ctx,
            iconCenterX,
            iconCenterY,
            chosenPreset.iconR,
            "#ef4444",
            Math.max(1.8, chosenPreset.iconR * 0.22)
          );

          // Badge de Linha à direita (BX / BXE / UX / CX / UNIV)
          ctx.font = `800 ${chosenPreset.pillFont}px ${FONT_SANS}`;
          const lineBadgeTextW = ctx.measureText(theme.label).width;
          const lineBadgeW = Math.max(38, lineBadgeTextW + 16);
          const lineBadgeH = Math.min(tileH - 14, chosenPreset.pillFont + 13);
          const lineBadgeX = tileX + tileW - 12 - lineBadgeW;
          const lineBadgeY = tileY + (tileH - lineBadgeH) / 2;

          traceRoundedRect(
            ctx,
            lineBadgeX,
            lineBadgeY,
            lineBadgeW,
            lineBadgeH,
            8
          );
          ctx.fillStyle = theme.badgeBg;
          ctx.fill();
          ctx.strokeStyle = theme.badgeBorder;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = theme.badgeText;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            theme.label,
            lineBadgeX + lineBadgeW / 2,
            lineBadgeY + lineBadgeH / 2 + 1
          );

          // Textos: Nome Canônico TT + Alias Hasbro opcional
          const textX = iconCenterX + chosenPreset.iconR + 12;
          const textMaxW = Math.max(40, lineBadgeX - textX - 10);
          const hasAliases =
            options.showHasbroAliases &&
            chosenPreset.allowAlias &&
            part.aliases &&
            part.aliases.length > 0;

          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          if (hasAliases) {
            const nameCenterY = tileY + tileH * 0.37;
            const aliasCenterY = tileY + tileH * 0.69;

            ctx.fillStyle = "#ffffff";
            ctx.font = `800 ${chosenPreset.nameFont}px ${FONT_SANS}`;
            ctx.fillText(truncateText(ctx, part.name, textMaxW), textX, nameCenterY);

            ctx.fillStyle = "#cbd5e1";
            ctx.font = `600 ${chosenPreset.aliasFont}px ${FONT_SANS}`;
            ctx.fillText(
              truncateText(ctx, `Hasbro: ${part.aliases.join(", ")}`, textMaxW),
              textX,
              aliasCenterY
            );
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.font = `800 ${chosenPreset.nameFont}px ${FONT_SANS}`;
            ctx.fillText(
              truncateText(ctx, part.name, textMaxW),
              textX,
              tileY + tileH / 2 + 1
            );
          }

          ctx.restore();
          drawnCount += 1;
        });

        y += chosenPreset.cardH;
        if (row < totalRows - 1) {
          y += chosenPreset.cardGap;
        }
      }

      if (stoppedEarly) {
        break;
      }
    }

    const remainingCount = activeParts.length - drawnCount;
    if (remainingCount > 0) {
      const pillY = Math.min(y + 14, footerTop - 60);
      ctx.save();
      traceRoundedRect(ctx, padX, pillY, contentW, 40, 12);
      ctx.fillStyle = "rgba(233, 107, 0, 0.14)";
      ctx.fill();
      ctx.strokeStyle = "rgba(233, 107, 0, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#fed7aa";
      ctx.font = `700 15px ${FONT_SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `+ ${remainingCount} ${
          remainingCount === 1 ? "peça adicional" : "peças adicionais"
        } — confira a lista completa no Sistema OBA`,
        W / 2,
        pillY + 21
      );
      ctx.restore();
    }
  }

  // ── 7. Rodapé Oficial OBA ───────────────────────────────────────────────
  const footDivGrad = ctx.createLinearGradient(padX, 0, padX + contentW, 0);
  footDivGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  footDivGrad.addColorStop(0.5, "rgba(233, 107, 0, 0.45)");
  footDivGrad.addColorStop(1, "rgba(189, 8, 245, 0.45)");
  ctx.fillStyle = footDivGrad;
  ctx.fillRect(padX, footerTop, contentW, 2);

  ctx.save();
  ctx.textBaseline = "middle";
  const footerCenterY = footerTop + 34;

  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `700 17px ${FONT_SANS}`;
  ctx.fillText(
    `${OBA_SOCIAL_LINKS.instagram.handle}  •  Organização de Beyblade do Amazonas`,
    padX,
    footerCenterY
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 16px ${FONT_SANS}`;
  const rightFooterText = options.showUpdatedDate
    ? `Atualizado em ${formatPtBrDate(options.updatedAt ?? new Date())}`
    : "LIGA OFICIAL OBA";
  ctx.fillText(rightFooterText, W - padX, footerCenterY);
  ctx.restore();
}
