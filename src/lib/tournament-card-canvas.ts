import { OBA_PODIUM_POINTS, OBA_SOCIAL_LINKS } from "@/lib/constants";
import {
  BANLIST_CARD_ASPECT_ORDER,
  BANLIST_CARD_PRESETS,
  type BanlistCardAspect,
  canvasToPngBlob,
  loadObaLogoImage,
} from "@/lib/banlist-card-canvas";
import { formatCurrencyBRL } from "@/lib/pix";
import {
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  type TournamentCategory,
  type TournamentFormat,
  type TournamentRegistrationStatus,
} from "@/types/domain";

export {
  BANLIST_CARD_ASPECT_ORDER as TOURNAMENT_CARD_ASPECT_ORDER,
  BANLIST_CARD_PRESETS as TOURNAMENT_CARD_PRESETS,
  type BanlistCardAspect as TournamentCardAspect,
  canvasToPngBlob,
  loadObaLogoImage,
};

export type TournamentCardQrMode = "tournament" | "maps" | "none";

export interface TournamentCardRenderOptions {
  aspect: BanlistCardAspect;
  name: string;
  eventDate: string;
  eventTime?: string | null;
  category: TournamentCategory;
  format: TournamentFormat;
  swissRounds: number;
  location?: string | null;
  locationUrl?: string | null;
  rulesetName?: string | null;
  bannedCount?: number;
  seasonName?: string | null;
  registrationStatus: TournamentRegistrationStatus;
  entryFee: number;
  maxPlayers?: number | null;
  prizeInfo?: string | null;
  description?: string | null;
  showDescription: boolean;
  showPointsHint: boolean;
  qrMode: TournamentCardQrMode;
  tournamentUrl: string;
  logoImage?: HTMLImageElement | null;
  qrImage?: HTMLImageElement | null;
}

const FONT_SANS =
  'Geist, "Geist Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const WEEKDAYS_PT_BR = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export function sanitizeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function formatTournamentDatePtBr(dateStr: string): {
  shortDate: string;
  weekday: string;
  fullLabel: string;
} {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return {
      shortDate: dateStr || "A definir",
      weekday: "",
      fullLabel: dateStr || "Data a definir",
    };
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  const shortDate = `${String(day).padStart(2, "0")}/${String(month).padStart(
    2,
    "0"
  )}/${year}`;
  const weekday = WEEKDAYS_PT_BR[localDate.getDay()] ?? "";
  return {
    shortDate,
    weekday,
    fullLabel: weekday ? `${weekday}, ${shortDate}` : shortDate,
  };
}

export function buildTournamentCardFilename(
  name: string,
  aspect: BanlistCardAspect
): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `torneio-oba-${slug || "etapa"}-${aspect}.png`;
}

export function buildTournamentShareCaption(params: {
  name: string;
  eventDate: string;
  eventTime?: string | null;
  category: TournamentCategory;
  format: TournamentFormat;
  swissRounds: number;
  location?: string | null;
  locationUrl?: string | null;
  rulesetName?: string | null;
  bannedCount?: number;
  registrationStatus: TournamentRegistrationStatus;
  entryFee: number;
  maxPlayers?: number | null;
  prizeInfo?: string | null;
  tournamentUrl: string;
}): string {
  const { fullLabel } = formatTournamentDatePtBr(params.eventDate);
  const safeMapsUrl = sanitizeHttpUrl(params.locationUrl);
  const feeText =
    params.entryFee > 0 ? formatCurrencyBRL(params.entryFee) : "Gratuito";
  const categoryLabel = TOURNAMENT_CATEGORY_LABELS[params.category ?? "semanal"];
  const formatLabel = TOURNAMENT_FORMAT_LABELS[params.format];

  const lines: string[] = [
    `🔥 *${params.name}* — Liga Oficial OBA (${categoryLabel})`,
    "",
    `📅 *Data:* ${fullLabel}`,
  ];

  if (params.eventTime?.trim()) {
    lines.push(`⏰ *Horário:* ${params.eventTime.trim()}`);
  }

  if (params.location?.trim()) {
    lines.push(`📍 *Local:* ${params.location.trim()}`);
  }

  if (safeMapsUrl) {
    lines.push(`🗺️ *Google Maps:* ${safeMapsUrl}`);
  }

  const vagasPart = params.maxPlayers
    ? ` (${params.maxPlayers} vagas)`
    : " (Vagas livres)";
  lines.push(`🎟️ *Inscrição:* ${feeText}${vagasPart}`);

  const rulesetPart = params.rulesetName
    ? ` • Ban-list: ${params.rulesetName}${
        typeof params.bannedCount === "number" && params.bannedCount > 0
          ? ` (${params.bannedCount} banidas)`
          : " (Sem banimentos)"
      }`
    : "";
  lines.push(
    `⚔️ *Formato:* ${formatLabel} (${params.swissRounds} rodadas)${rulesetPart}`
  );

  if (params.prizeInfo?.trim()) {
    lines.push("");
    lines.push("🏆 *Premiação:*");
    lines.push(params.prizeInfo.trim());
  }

  lines.push("");
  if (params.registrationStatus === "open") {
    lines.push(`👉 *Inscreva-se e acompanhe ao vivo:* ${params.tournamentUrl}`);
  } else {
    lines.push(`👉 *Detalhes e chaveamento:* ${params.tournamentUrl}`);
  }
  lines.push(
    `${OBA_SOCIAL_LINKS.instagram.handle} • Organização de Beyblade do Amazonas`
  );

  return lines.join("\n");
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
  maxLines: number,
  preserveNewlines = false
): string[] {
  if (!text.trim() || maxLines <= 0) return [];

  const paragraphs = preserveNewlines
    ? text
        .split(/\r?\n/)
        .map((p) => p.trim().replace(/\s+/g, " "))
        .filter(Boolean)
    : [text.trim().replace(/\s+/g, " ")];

  const lines: string[] = [];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx += 1) {
    const words = paragraphs[pIdx].split(" ");
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

      if (lines.length === maxLines - 1) {
        const restWords = [current, ...words.slice(i + 1)]
          .filter(Boolean)
          .join(" ");
        const trailingParagraphs = paragraphs.slice(pIdx + 1).join(" • ");
        const combinedRest = [restWords, trailingParagraphs]
          .filter(Boolean)
          .join(" • ");
        lines.push(truncateText(ctx, combinedRest, maxWidth));
        return lines;
      }
    }

    if (current) {
      const hasMoreParagraphs = pIdx < paragraphs.length - 1;
      if (lines.length === maxLines - 1 && hasMoreParagraphs) {
        const trailing = paragraphs.slice(pIdx + 1).join(" • ");
        lines.push(truncateText(ctx, `${current} • ${trailing}`, maxWidth));
        return lines;
      }
      lines.push(current);
      if (lines.length >= maxLines) {
        return lines.slice(0, maxLines);
      }
    }
  }

  return lines.slice(0, maxLines);
}

// ─── Ícones Vetoriais Consistentes no Canvas ──────────────────────────────────

function drawCalendarIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const x = cx - size / 2;
  const y = cy - size / 2 + 1;
  traceRoundedRect(ctx, x, y, size, size - 2, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.32);
  ctx.lineTo(x + size, y + size * 0.32);
  ctx.moveTo(x + size * 0.3, y - 3);
  ctx.lineTo(x + size * 0.3, y + 3);
  ctx.moveTo(x + size * 0.7, y - 3);
  ctx.lineTo(x + size * 0.7, y + 3);
  ctx.stroke();
  ctx.restore();
}

function drawTicketIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  const w = size;
  const h = size * 0.72;
  traceRoundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.14, cy - h / 2 + 3);
  ctx.lineTo(cx - w * 0.14, cy + h / 2 - 3);
  ctx.setLineDash([2.5, 2.5]);
  ctx.stroke();
  ctx.restore();
}

function drawMapPinIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const r = size * 0.34;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.12, r, Math.PI, 0);
  ctx.quadraticCurveTo(cx + r, cy + size * 0.18, cx, cy + size * 0.48);
  ctx.quadraticCurveTo(cx - r, cy + size * 0.18, cx - r, cy - size * 0.12);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.12, r * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSwordsIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  const d = size * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - d, cy + d);
  ctx.lineTo(cx + d, cy - d);
  ctx.moveTo(cx - d, cy - d);
  ctx.lineTo(cx + d, cy + d);
  ctx.moveTo(cx - d * 0.75, cy + d * 0.25);
  ctx.lineTo(cx - d * 0.25, cy + d * 0.75);
  ctx.moveTo(cx + d * 0.25, cy + d * 0.75);
  ctx.lineTo(cx + d * 0.75, cy + d * 0.25);
  ctx.stroke();
  ctx.restore();
}

function drawTrophyIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const w = size * 0.62;
  const h = size * 0.56;
  const topY = cy - size * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, topY);
  ctx.lineTo(cx + w / 2, topY);
  ctx.quadraticCurveTo(cx + w / 2, topY + h, cx, topY + h);
  ctx.quadraticCurveTo(cx - w / 2, topY + h, cx - w / 2, topY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, topY + h);
  ctx.lineTo(cx, cy + size * 0.38);
  ctx.moveTo(cx - size * 0.28, cy + size * 0.4);
  ctx.lineTo(cx + size * 0.28, cy + size * 0.4);
  ctx.stroke();
  ctx.restore();
}

function drawPillBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  bgColor: string,
  borderColor: string,
  textColor: string,
  height = 34,
  padH = 16
): number {
  ctx.save();
  ctx.font = `800 ${fontSize}px ${FONT_SANS}`;
  const textW = ctx.measureText(text).width;
  const w = textW + padH * 2;
  traceRoundedRect(ctx, x, y, w, height, height / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + height / 2 + 1);
  ctx.restore();
  return w;
}

function formatQrDisplayUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const cleanPath = u.pathname === "/" ? "" : u.pathname;
    return `${u.host}${cleanPath}`;
  } catch {
    return rawUrl;
  }
}

export function renderTournamentCardToCanvas(
  canvas: HTMLCanvasElement,
  options: TournamentCardRenderOptions
): void {
  const preset = BANLIST_CARD_PRESETS[options.aspect];
  const W = preset.width;
  const H = preset.height;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isSquare = options.aspect === "square";
  const isStory = options.aspect === "story";
  const padX = 60;
  const contentW = W - padX * 2;
  const topPad = isStory ? 66 : isSquare ? 36 : 46;

  // ── 1. Fundo Obsidian-Roxo OBA + Brilhos ────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#07050c");
  bgGrad.addColorStop(0.5, "#140822");
  bgGrad.addColorStop(1, "#08050d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const glowPurple = ctx.createRadialGradient(
    W * 0.16,
    H * 0.12,
    10,
    W * 0.16,
    H * 0.12,
    W * 0.72
  );
  glowPurple.addColorStop(0, "rgba(189, 8, 245, 0.28)");
  glowPurple.addColorStop(1, "rgba(189, 8, 245, 0)");
  ctx.fillStyle = glowPurple;
  ctx.fillRect(0, 0, W, H);

  const glowOrange = ctx.createRadialGradient(
    W * 0.88,
    H * 0.24,
    10,
    W * 0.88,
    H * 0.24,
    W * 0.62
  );
  glowOrange.addColorStop(0, "rgba(233, 107, 0, 0.22)");
  glowOrange.addColorStop(1, "rgba(233, 107, 0, 0)");
  ctx.fillStyle = glowOrange;
  ctx.fillRect(0, 0, W, H);

  const glowGold = ctx.createRadialGradient(
    W * 0.5,
    H * 0.84,
    20,
    W * 0.5,
    H * 0.84,
    W * 0.65
  );
  glowGold.addColorStop(0, "rgba(237, 189, 3, 0.14)");
  glowGold.addColorStop(1, "rgba(237, 189, 3, 0)");
  ctx.fillStyle = glowGold;
  ctx.fillRect(0, 0, W, H);

  // Textura sutil de pontos
  ctx.fillStyle = "rgba(255, 255, 255, 0.032)";
  for (let gx = 32; gx < W; gx += 36) {
    for (let gy = 32; gy < H; gy += 36) {
      ctx.fillRect(gx, gy, 2, 2);
    }
  }

  // Moldura sutil e barras topo/base OBA
  ctx.save();
  traceRoundedRect(ctx, 18, 18, W - 36, H - 36, 28);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, "#bd08f5");
  accentGrad.addColorStop(0.5, "#e96b00");
  accentGrad.addColorStop(1, "#edbd03");
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 10, W, 10);

  // ── 2. Cabeçalho Institucional + Selo de Categoria ──────────────────────
  let cursorY = topPad;
  const logoSize = isSquare ? 82 : 88;

  ctx.save();
  traceRoundedRect(ctx, padX, cursorY, logoSize, logoSize, 20);
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
      16
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
    ctx.font = `900 28px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OBA", padX + logoSize / 2, cursorY + logoSize / 2);
  }
  ctx.restore();

  const isOficial = options.category === "oficial";
  const categoryStamp = isOficial ? "TORNEIO OFICIAL" : "ETAPA SEMANAL";
  ctx.font = `800 15px ${FONT_SANS}`;
  const stampW = ctx.measureText(categoryStamp).width + 36;
  const stampH = 38;
  const stampX = W - padX - stampW;
  const stampY = cursorY + 4;

  drawPillBadge(
    ctx,
    stampX,
    stampY,
    categoryStamp,
    15,
    isOficial ? "rgba(237, 189, 3, 0.2)" : "rgba(189, 8, 245, 0.22)",
    isOficial ? "rgba(237, 189, 3, 0.68)" : "rgba(189, 8, 245, 0.65)",
    isOficial ? "#fde047" : "#f0abfc",
    stampH,
    18
  );

  const brandX = padX + logoSize + 20;
  const brandMaxW = stampX - brandX - 16;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#e879f9";
  ctx.font = `800 14px ${FONT_SANS}`;
  ctx.fillText("OBA  •  LIGA OFICIAL", brandX, cursorY + 4);

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${isSquare ? 22 : 24}px ${FONT_SANS}`;
  ctx.fillText(
    truncateText(ctx, "Organização de Beyblade do Amazonas", brandMaxW),
    brandX,
    cursorY + 25
  );

  if (options.seasonName?.trim()) {
    ctx.fillStyle = "#fde047";
    ctx.font = `700 16px ${FONT_SANS}`;
    ctx.fillText(
      truncateText(ctx, options.seasonName.trim(), brandMaxW),
      brandX,
      cursorY + (isSquare ? 53 : 57)
    );
  }
  ctx.restore();

  cursorY += logoSize + (isSquare ? 18 : 24);

  const headerDiv = ctx.createLinearGradient(padX, 0, padX + contentW, 0);
  headerDiv.addColorStop(0, "rgba(189, 8, 245, 0.6)");
  headerDiv.addColorStop(0.5, "rgba(233, 107, 0, 0.45)");
  headerDiv.addColorStop(1, "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = headerDiv;
  ctx.fillRect(padX, cursorY, contentW, 2);

  cursorY += isSquare ? 16 : 22;

  // ── 3. Bloco de Título do Torneio ───────────────────────────────────────
  if (options.registrationStatus === "open") {
    drawPillBadge(
      ctx,
      padX,
      cursorY,
      "INSCRIÇÕES ABERTAS",
      14,
      "rgba(16, 185, 129, 0.2)",
      "rgba(52, 211, 153, 0.65)",
      "#6ee7b7",
      32,
      15
    );
    cursorY += 42;
  }

  const cleanTitle = options.name.trim() || "Torneio OBA";
  const baseTitleFont = isStory ? 54 : isSquare ? 44 : 50;
  ctx.font = `900 ${baseTitleFont}px ${FONT_SANS}`;
  let titleFont = baseTitleFont;
  let titleLines = wrapTextLines(ctx, cleanTitle, contentW, 2);
  if (titleLines.length > 1) {
    titleFont = isStory ? 48 : isSquare ? 39 : 44;
    ctx.font = `900 ${titleFont}px ${FONT_SANS}`;
    titleLines = wrapTextLines(ctx, cleanTitle, contentW, 2);
  }
  const titleLineH = titleFont + 8;

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `900 ${titleFont}px ${FONT_SANS}`;
  const titleGrad = ctx.createLinearGradient(padX, cursorY, padX + 760, cursorY);
  titleGrad.addColorStop(0, "#ffffff");
  titleGrad.addColorStop(0.7, "#fef3c7");
  titleGrad.addColorStop(1, "#fdba74");
  ctx.fillStyle = titleGrad;
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, padX, cursorY + idx * titleLineH);
  });
  ctx.restore();

  cursorY += titleLines.length * titleLineH + 10;

  const cleanDesc = options.showDescription
    ? (options.description?.trim() ?? "")
    : "";
  if (cleanDesc) {
    const descFont = isSquare ? 17 : 19;
    const descLineH = descFont + 6;
    ctx.font = `500 ${descFont}px ${FONT_SANS}`;
    const descLines = wrapTextLines(ctx, cleanDesc, contentW, 2);
    ctx.save();
    ctx.fillStyle = "rgba(226, 232, 240, 0.84)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    descLines.forEach((line, idx) => {
      ctx.fillText(line, padX, cursorY + idx * descLineH);
    });
    ctx.restore();
    cursorY += descLines.length * descLineH + 10;
  }

  // ── 4. Cálculo do Orçamento Vertical (Rodapé + QR Code + Bento Grid) ────
  const footerTop = H - (isSquare ? 76 : 84);
  const safeMapsUrl = sanitizeHttpUrl(options.locationUrl);
  const hasQr = options.qrMode !== "none" && Boolean(options.qrImage);
  const qrBoxH = hasQr ? (isStory ? 176 : isSquare ? 124 : 150) : 0;
  const qrGapBottom = hasQr ? (isSquare ? 14 : 20) : 0;
  const qrTop = footerTop - qrGapBottom - qrBoxH;

  const bodyTop = cursorY + (isSquare ? 6 : 10);
  const bodyBottomLimit = (hasQr ? qrTop : footerTop) - (isSquare ? 14 : 18);
  const availableH = Math.max(240, bodyBottomLimit - bodyTop);

  // Dados preparados para o Bento Grid
  const dateInfo = formatTournamentDatePtBr(options.eventDate);
  const cleanTime = options.eventTime?.trim() ?? "";
  const cleanLocation = options.location?.trim() ?? "";
  const cleanPrize = options.prizeInfo?.trim() ?? "";
  const hasLocationRow = Boolean(cleanLocation || safeMapsUrl);
  const hasPrizeRow = Boolean(cleanPrize);

  const row1Natural = isStory ? 186 : isSquare ? 132 : 152;
  const row2Natural = isStory ? 228 : isSquare ? 156 : 182;
  const row3Natural = hasPrizeRow ? (isStory ? 290 : isSquare ? 168 : 210) : 0;
  const naturalGap = isStory ? 22 : isSquare ? 14 : 18;
  const totalNatural =
    row1Natural +
    naturalGap +
    row2Natural +
    (hasPrizeRow ? naturalGap + row3Natural : 0);

  const useCompact = totalNatural > availableH;
  const gap = useCompact ? 11 : naturalGap;
  const row1H = useCompact ? 116 : row1Natural;
  const row2H = useCompact ? 138 : row2Natural;

  let row3H = 0;
  if (hasPrizeRow) {
    const remainingForPrize = availableH - row1H - row2H - gap * 2;
    row3H = Math.max(
      120,
      Math.min(
        useCompact ? 152 : isStory ? 340 : 250,
        remainingForPrize
      )
    );
  }

  const totalBentoH =
    row1H + gap + row2H + (hasPrizeRow ? gap + row3H : 0);
  const startY =
    bodyTop + Math.max(0, Math.min(Math.floor((availableH - totalBentoH) * 0.28), 38));

  const halfW = (contentW - gap) / 2;

  // ── 5. Row 1: DATA & HORÁRIO | INSCRIÇÃO & VAGAS ────────────────────────
  const drawBentoBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    accentHex: string,
    fill = "rgba(24, 12, 34, 0.88)",
    border = "rgba(255, 255, 255, 0.12)"
  ) => {
    ctx.save();
    traceRoundedRect(ctx, x, y, w, h, 20);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.save();
    traceRoundedRect(ctx, x, y, w, h, 20);
    ctx.clip();
    ctx.fillStyle = accentHex;
    ctx.fillRect(x, y, w, 5);
    ctx.restore();
    ctx.restore();
  };

  // Card Data e Horário
  drawBentoBox(
    padX,
    startY,
    halfW,
    row1H,
    "#bd08f5",
    "rgba(24, 12, 36, 0.9)",
    "rgba(189, 8, 245, 0.35)"
  );

  ctx.save();
  const c1x = padX + 22;
  const c1Top = startY + (useCompact ? 18 : 24);
  const c1MaxW = halfW - 44;

  drawCalendarIcon(ctx, c1x + 10, c1Top + 10, 20, "#e879f9");
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e879f9";
  ctx.font = `800 13px ${FONT_SANS}`;
  ctx.fillText("DATA E HORÁRIO", c1x + 28, c1Top + 11);

  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${useCompact ? 28 : isStory ? 34 : 30}px ${FONT_SANS}`;
  ctx.fillText(
    truncateText(
      ctx,
      dateInfo.weekday
        ? `${dateInfo.shortDate} • ${dateInfo.weekday.split("-")[0]}`
        : dateInfo.shortDate,
      c1MaxW
    ),
    c1x,
    c1Top + (useCompact ? 28 : 34)
  );

  ctx.font = `600 ${useCompact ? 16 : 18}px ${FONT_SANS}`;
  const timeDisplay = cleanTime || "Horário a confirmar";
  ctx.fillStyle = cleanTime ? "#fde047" : "#94a3b8";
  const timeLines = wrapTextLines(ctx, timeDisplay, c1MaxW, 2);
  timeLines.forEach((line, i) => {
    ctx.fillText(
      line,
      c1x,
      c1Top + (useCompact ? 62 : isStory ? 80 : 72) + i * 21
    );
  });
  ctx.restore();

  // Card Inscrição & Vagas
  const feeBoxX = padX + halfW + gap;
  drawBentoBox(
    feeBoxX,
    startY,
    halfW,
    row1H,
    "#10b981",
    "rgba(14, 24, 26, 0.88)",
    "rgba(52, 211, 153, 0.35)"
  );

  ctx.save();
  const c2x = feeBoxX + 22;
  const c2MaxW = halfW - 44;
  drawTicketIcon(ctx, c2x + 10, c1Top + 10, 20, "#34d399");
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#34d399";
  ctx.font = `800 13px ${FONT_SANS}`;
  ctx.fillText("INSCRIÇÃO", c2x + 28, c1Top + 11);

  ctx.textBaseline = "top";
  const isFree = options.entryFee <= 0;
  ctx.fillStyle = isFree ? "#6ee7b7" : "#ffffff";
  ctx.font = `900 ${useCompact ? 28 : isStory ? 36 : 32}px ${FONT_SANS}`;
  ctx.fillText(
    isFree ? "GRATUITO" : formatCurrencyBRL(options.entryFee),
    c2x,
    c1Top + (useCompact ? 28 : 34)
  );

  const slotsText = options.maxPlayers
    ? `${options.maxPlayers} vagas limitadas`
    : "Vagas livres";
  const payText = !isFree && options.registrationStatus === "open" ? " • Via PIX" : "";
  ctx.fillStyle = "#cbd5e1";
  ctx.font = `600 ${useCompact ? 16 : 18}px ${FONT_SANS}`;
  ctx.fillText(
    truncateText(ctx, `${slotsText}${payText}`, c2MaxW),
    c2x,
    c1Top + (useCompact ? 64 : isStory ? 84 : 74)
  );
  ctx.restore();

  // ── 6. Row 2: LOCAL DO EVENTO (se houver) & FORMATO / REGRAS ────────────
  const row2Y = startY + row1H + gap;

  const drawFormatCard = (x: number, y: number, w: number, h: number) => {
    drawBentoBox(
      x,
      y,
      w,
      h,
      "#e96b00",
      "rgba(28, 13, 24, 0.9)",
      "rgba(233, 107, 0, 0.35)"
    );

    ctx.save();
    const fx = x + 22;
    const fTop = y + (useCompact ? 16 : 22);
    const fMaxW = w - 44;

    drawSwordsIcon(ctx, fx + 10, fTop + 10, 19, "#fb923c");
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fb923c";
    ctx.font = `800 13px ${FONT_SANS}`;
    ctx.fillText("FORMATO & REGRAS", fx + 28, fTop + 11);

    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${useCompact ? 21 : isStory ? 26 : 23}px ${FONT_SANS}`;
    const formatTitle = `${TOURNAMENT_FORMAT_LABELS[options.format]} (${
      options.swissRounds
    } rod.)`;
    ctx.fillText(truncateText(ctx, formatTitle, fMaxW), fx, fTop + (useCompact ? 26 : 32));

    let tagY = fTop + (useCompact ? 56 : isStory ? 74 : 66);
    if (options.rulesetName) {
      const banText =
        typeof options.bannedCount === "number" && options.bannedCount > 0
          ? `Regras: ${options.rulesetName} • ${options.bannedCount} ban.`
          : `Regras: ${options.rulesetName} • Livre`;
      drawPillBadge(
        ctx,
        fx,
        tagY,
        truncateText(ctx, banText, fMaxW - 24),
        useCompact ? 13 : 14,
        options.bannedCount && options.bannedCount > 0
          ? "rgba(220, 38, 38, 0.2)"
          : "rgba(189, 8, 245, 0.2)",
        options.bannedCount && options.bannedCount > 0
          ? "rgba(248, 113, 113, 0.55)"
          : "rgba(189, 8, 245, 0.5)",
        options.bannedCount && options.bannedCount > 0
          ? "#fca5a5"
          : "#f5d0fe",
        useCompact ? 28 : 32,
        12
      );
      tagY += useCompact ? 34 : 40;
    }

    if (options.showPointsHint) {
      const podiumMap = OBA_PODIUM_POINTS[options.category ?? "semanal"];
      const ptsLabel = `Pódio Liga: ${podiumMap[1]} / ${podiumMap[2]} / ${podiumMap[3]} pts`;
      ctx.fillStyle = "#cbd5e1";
      ctx.font = `600 ${useCompact ? 13 : 15}px ${FONT_SANS}`;
      ctx.fillText(truncateText(ctx, ptsLabel, fMaxW), fx, tagY + 2);
    }
    ctx.restore();
  };

  if (hasLocationRow) {
    // Card Local do Evento à esquerda
    drawBentoBox(
      padX,
      row2Y,
      halfW,
      row2H,
      "#e96b00",
      "rgba(28, 15, 22, 0.9)",
      "rgba(233, 107, 0, 0.35)"
    );

    ctx.save();
    const lx = padX + 22;
    const lTop = row2Y + (useCompact ? 16 : 22);
    const lMaxW = halfW - 44;

    drawMapPinIcon(ctx, lx + 10, lTop + 10, 20, "#fb923c");
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fb923c";
    ctx.font = `800 13px ${FONT_SANS}`;
    ctx.fillText("LOCAL DO EVENTO", lx + 28, lTop + 11);

    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    const locFont = useCompact ? 20 : isStory ? 24 : 22;
    ctx.font = `800 ${locFont}px ${FONT_SANS}`;
    const locLines = wrapTextLines(
      ctx,
      cleanLocation || "Localização no Google Maps",
      lMaxW,
      2
    );
    locLines.forEach((line, idx) => {
      ctx.fillText(line, lx, lTop + (useCompact ? 28 : 34) + idx * (locFont + 6));
    });

    if (safeMapsUrl) {
      const badgeY =
        lTop +
        (useCompact ? 28 : 34) +
        locLines.length * (locFont + 6) +
        (useCompact ? 6 : 10);
      if (badgeY + 28 < row2Y + row2H - 8) {
        drawPillBadge(
          ctx,
          lx,
          badgeY,
          options.qrMode === "maps"
            ? "Mapa disponível no QR Code"
            : "Localização via Google Maps",
          12,
          "rgba(59, 130, 246, 0.18)",
          "rgba(96, 165, 250, 0.55)",
          "#93c5fd",
          28,
          12
        );
      }
    }
    ctx.restore();

    drawFormatCard(padX + halfW + gap, row2Y, halfW, row2H);
  } else {
    drawFormatCard(padX, row2Y, contentW, row2H);
  }

  // ── 7. Row 3: PREMIAÇÃO (Largura Total com Destaque Dourado) ────────────
  if (hasPrizeRow) {
    const row3Y = row2Y + row2H + gap;
    drawBentoBox(
      padX,
      row3Y,
      contentW,
      row3H,
      "#edbd03",
      "rgba(32, 22, 12, 0.9)",
      "rgba(237, 189, 3, 0.45)"
    );

    ctx.save();
    const px = padX + 24;
    const pTop = row3Y + (useCompact ? 16 : 22);
    const pMaxW = contentW - 48;

    drawTrophyIcon(ctx, px + 10, pTop + 10, 20, "#edbd03");
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fde047";
    ctx.font = `800 13px ${FONT_SANS}`;
    ctx.fillText("PREMIAÇÃO", px + 28, pTop + 11);

    ctx.textBaseline = "top";
    const prizeFont = useCompact ? 18 : isStory ? 24 : 21;
    const prizeLineH = prizeFont + 8;
    const maxPrizeLines = Math.max(
      2,
      Math.floor((row3H - (useCompact ? 48 : 62)) / prizeLineH)
    );
    ctx.font = `700 ${prizeFont}px ${FONT_SANS}`;
    ctx.fillStyle = "#fef9c3";
    const prizeLines = wrapTextLines(
      ctx,
      cleanPrize,
      pMaxW,
      maxPrizeLines,
      true
    );
    prizeLines.forEach((line, idx) => {
      ctx.fillText(line, px, pTop + (useCompact ? 28 : 34) + idx * prizeLineH);
    });
    ctx.restore();
  }

  // ── 8. Faixa QR Code (Link do Torneio / Inscrição ou Google Maps) ───────
  if (hasQr && options.qrImage) {
    ctx.save();
    traceRoundedRect(ctx, padX, qrTop, contentW, qrBoxH, 22);
    ctx.fillStyle = "rgba(18, 11, 28, 0.94)";
    ctx.fill();
    ctx.strokeStyle =
      options.qrMode === "maps"
        ? "rgba(96, 165, 250, 0.48)"
        : "rgba(189, 8, 245, 0.48)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const qrInnerPad = 12;
    const qrSquare = qrBoxH - qrInnerPad * 2;
    const qrX = padX + qrInnerPad;
    const qrY = qrTop + qrInnerPad;

    traceRoundedRect(ctx, qrX, qrY, qrSquare, qrSquare, 14);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.drawImage(
      options.qrImage,
      qrX + 6,
      qrY + 6,
      qrSquare - 12,
      qrSquare - 12
    );

    const textX = qrX + qrSquare + 24;
    const textMaxW = padX + contentW - textX - 24;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const isMapsQr = options.qrMode === "maps" && safeMapsUrl;
    const qrBadgeLabel = isMapsQr
      ? "ATALHO GOOGLE MAPS"
      : options.registrationStatus === "open"
        ? "INSCRIÇÃO ONLINE"
        : "PÁGINA DO TORNEIO";
    const qrTitle = isMapsQr
      ? "Escaneie para abrir a rota no Maps"
      : options.registrationStatus === "open"
        ? "Escaneie para se inscrever e enviar decklist"
        : "Escaneie para ver detalhes e chaveamento";
    const qrSub = isMapsQr
      ? cleanLocation || formatQrDisplayUrl(safeMapsUrl)
      : formatQrDisplayUrl(options.tournamentUrl);

    ctx.fillStyle = isMapsQr ? "#93c5fd" : "#e879f9";
    ctx.font = `800 13px ${FONT_SANS}`;
    ctx.fillText(qrBadgeLabel, textX, qrTop + qrBoxH * 0.25);

    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${isSquare ? 21 : 24}px ${FONT_SANS}`;
    ctx.fillText(
      truncateText(ctx, qrTitle, textMaxW),
      textX,
      qrTop + qrBoxH * 0.52
    );

    ctx.fillStyle = "#94a3b8";
    ctx.font = `600 15px ${FONT_SANS}`;
    ctx.fillText(
      truncateText(ctx, qrSub, textMaxW),
      textX,
      qrTop + qrBoxH * 0.77
    );
    ctx.restore();
  }

  // ── 9. Rodapé Oficial OBA ───────────────────────────────────────────────
  const footDiv = ctx.createLinearGradient(padX, 0, padX + contentW, 0);
  footDiv.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  footDiv.addColorStop(0.5, "rgba(233, 107, 0, 0.45)");
  footDiv.addColorStop(1, "rgba(189, 8, 245, 0.45)");
  ctx.fillStyle = footDiv;
  ctx.fillRect(padX, footerTop, contentW, 2);

  ctx.save();
  ctx.textBaseline = "middle";
  const footMidY = footerTop + 32;

  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `700 16px ${FONT_SANS}`;
  ctx.fillText(
    `${OBA_SOCIAL_LINKS.instagram.handle}  •  Organização de Beyblade do Amazonas`,
    padX,
    footMidY
  );

  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 15px ${FONT_SANS}`;
  ctx.fillText(
    options.seasonName?.trim() || "LIGA OFICIAL OBA",
    W - padX,
    footMidY
  );
  ctx.restore();
}
