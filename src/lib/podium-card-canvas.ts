import { OBA_SOCIAL_LINKS } from "@/lib/constants";
import {
  BANLIST_CARD_ASPECT_ORDER,
  BANLIST_CARD_PRESETS,
  type BanlistCardAspect,
  canvasToPngBlob,
  loadObaLogoImage,
} from "@/lib/banlist-card-canvas";
import {
  drawCircularAvatar,
  loadBladerAvatarImage,
  traceRoundedRect,
  truncateCanvasText,
} from "@/lib/ranking-card-canvas";
import { formatTournamentDatePtBr } from "@/lib/tournament-card-canvas";
import type {
  PodiumComboItem,
  TournamentPodiumCardData,
} from "@/lib/services/podium-card";
import {
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  type BeySystem,
} from "@/types/domain";

export {
  BANLIST_CARD_ASPECT_ORDER as PODIUM_CARD_ASPECT_ORDER,
  BANLIST_CARD_PRESETS as PODIUM_CARD_PRESETS,
  type BanlistCardAspect as PodiumCardAspect,
  canvasToPngBlob,
  loadBladerAvatarImage,
  loadObaLogoImage,
};

export interface PodiumCardRenderOptions {
  aspect: BanlistCardAspect;
  data: TournamentPodiumCardData;
  showSwissLeader: boolean;
  showDepositCombo: boolean;
  showPoints: boolean;
  logoImage?: HTMLImageElement | null;
  avatarsByBladerId?: Map<string, HTMLImageElement | null>;
}

const FONT_SANS =
  'Geist, "Geist Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function getSystemBadgeColors(system: BeySystem | null): {
  bg: string;
  border: string;
  text: string;
} {
  if (system === "BX" || system === "BXE") {
    return {
      bg: "rgba(34, 211, 238, 0.16)",
      border: "rgba(34, 211, 238, 0.45)",
      text: "#67e8f9",
    };
  }
  if (system === "UX" || system === "UXE") {
    return {
      bg: "rgba(189, 8, 245, 0.22)",
      border: "rgba(189, 8, 245, 0.55)",
      text: "#e879f9",
    };
  }
  if (system === "CX" || system === "CXE") {
    return {
      bg: "rgba(233, 107, 0, 0.22)",
      border: "rgba(233, 107, 0, 0.55)",
      text: "#fdba74",
    };
  }
  return {
    bg: "rgba(255, 255, 255, 0.08)",
    border: "rgba(255, 255, 255, 0.22)",
    text: "#d4d4d8",
  };
}

function drawCrownIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  const w = size;
  const h = size * 0.72;
  const left = cx - w / 2;
  const top = cy - h / 2;
  ctx.beginPath();
  ctx.moveTo(left, top + h);
  ctx.lineTo(left, top + h * 0.25);
  ctx.lineTo(left + w * 0.28, top + h * 0.55);
  ctx.lineTo(cx, top);
  ctx.lineTo(left + w * 0.72, top + h * 0.55);
  ctx.lineTo(left + w, top + h * 0.25);
  ctx.lineTo(left + w, top + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function measureComboPillRequiredWidth(params: {
  ctx: CanvasRenderingContext2D;
  combo: PodiumComboItem;
  slotFontSize: number;
  sysFontSize: number;
  textFontSize: number;
}): number {
  const { ctx, combo, slotFontSize, sysFontSize, textFontSize } = params;
  const isDeposit = combo.slotNumber === 4;
  const slotText = isDeposit ? "#4" : `#${combo.slotNumber}`;

  ctx.save();
  ctx.font = `900 ${slotFontSize}px ${FONT_SANS}`;
  const slotBadgeW = ctx.measureText(slotText).width + 12;

  let sysArea = 0;
  if (combo.system) {
    ctx.font = `900 ${sysFontSize}px ${FONT_SANS}`;
    sysArea = ctx.measureText(combo.system).width + 12 + 7;
  }

  ctx.font = `700 ${textFontSize}px ${FONT_SANS}`;
  const textW = ctx.measureText(combo.summaryText).width;
  ctx.restore();

  return 8 + slotBadgeW + 6 + sysArea + textW + 14;
}

function drawComboPillsGrid(params: {
  ctx: CanvasRenderingContext2D;
  combos: PodiumComboItem[];
  x: number;
  y: number;
  width: number;
  height: number;
  columns: number;
  compact: boolean;
}) {
  const { ctx, combos, x, y, width, height, columns, compact } = params;

  if (combos.length === 0) {
    ctx.save();
    traceRoundedRect(ctx, x, y, width, height, 10);
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#71717a";
    ctx.font = `600 ${compact ? 14 : 16}px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "Decklist inicial não registrada nesta etapa",
      x + width / 2,
      y + height / 2
    );
    ctx.restore();
    return;
  }

  const shownCombos = combos.slice(0, 4);
  const gapX = 10;
  const halfColW = columns > 1 ? (width - gapX) / 2 : width;

  // Empacota combos preservando a ordem: combos extensos ganham linha própria inteira
  const baseSlotFont = compact ? 12 : 13;
  const baseSysFont = compact ? 11 : 12;
  const baseTextFont = compact ? 14 : 16;

  const fitsHalfColumn = (combo: PodiumComboItem) =>
    columns > 1 &&
    measureComboPillRequiredWidth({
      ctx,
      combo,
      slotFontSize: baseSlotFont,
      sysFontSize: baseSysFont,
      textFontSize: baseTextFont,
    }) <= halfColW;

  const packedRows: PodiumComboItem[][] = [];
  let i = 0;
  while (i < shownCombos.length) {
    const current = shownCombos[i];
    const next = shownCombos[i + 1];
    if (fitsHalfColumn(current) && next && fitsHalfColumn(next)) {
      packedRows.push([current, next]);
      i += 2;
    } else {
      packedRows.push([current]);
      i += 1;
    }
  }

  const rowCount = packedRows.length;
  let gapY = compact ? (rowCount >= 3 ? 5 : 7) : rowCount >= 3 ? 7 : 10;
  let rawCellH = Math.floor((height - gapY * (rowCount - 1)) / rowCount);
  if (rawCellH < 24 && rowCount > 1) {
    gapY = 4;
    rawCellH = Math.floor((height - gapY * (rowCount - 1)) / rowCount);
  }
  const cellH = Math.min(compact ? 44 : 58, Math.max(20, rawCellH));

  const dense = cellH < 30;
  const slotFontSize = dense ? 10.5 : baseSlotFont;
  const sysFontSize = dense ? 10 : baseSysFont;
  const textFontSize = dense ? 12.5 : baseTextFont;
  const badgeH = dense ? 17 : compact ? 20 : 22;

  const totalBlockH = rowCount * cellH + Math.max(0, rowCount - 1) * gapY;
  const startY = y + Math.max(0, Math.floor((height - totalBlockH) / 2));

  packedRows.forEach((rowItems, rowIdx) => {
    const cy = startY + rowIdx * (cellH + gapY);
    const midY = cy + cellH / 2;
    const colsInRow = rowItems.length;
    const cellW = colsInRow === 1 ? width : (width - gapX) / 2;

    rowItems.forEach((combo, colIdx) => {
      const cx = x + colIdx * (cellW + gapX);
      const isDeposit = combo.slotNumber === 4;

      ctx.save();
      traceRoundedRect(ctx, cx, cy, cellW, cellH, dense ? 8 : 10);
      ctx.fillStyle = isDeposit
        ? "rgba(245, 158, 11, 0.08)"
        : "rgba(9, 7, 16, 0.72)";
      ctx.fill();
      ctx.strokeStyle = isDeposit
        ? "rgba(245, 158, 11, 0.42)"
        : "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Slot badge (#1, #2, #3, #4 Dep.)
      const slotText = isDeposit ? "#4" : `#${combo.slotNumber}`;
      ctx.font = `900 ${slotFontSize}px ${FONT_SANS}`;
      const slotBadgeW = ctx.measureText(slotText).width + 12;
      const slotX = cx + 8;
      traceRoundedRect(ctx, slotX, midY - badgeH / 2, slotBadgeW, badgeH, 6);
      ctx.fillStyle = isDeposit
        ? "rgba(245, 158, 11, 0.2)"
        : "rgba(255, 255, 255, 0.09)";
      ctx.fill();
      ctx.fillStyle = isDeposit ? "#fbbf24" : "#e4e4e7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(slotText, slotX + slotBadgeW / 2, midY + 0.5);

      let textCursorX = slotX + slotBadgeW + 6;

      if (combo.system) {
        const sysTheme = getSystemBadgeColors(combo.system);
        ctx.font = `900 ${sysFontSize}px ${FONT_SANS}`;
        const sysW = ctx.measureText(combo.system).width + 12;
        traceRoundedRect(ctx, textCursorX, midY - badgeH / 2, sysW, badgeH, 6);
        ctx.fillStyle = sysTheme.bg;
        ctx.fill();
        ctx.strokeStyle = sysTheme.border;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = sysTheme.text;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(combo.system, textCursorX + sysW / 2, midY + 0.5);
        textCursorX += sysW + 7;
      }

      const availableTextW = cx + cellW - 10 - textCursorX;
      ctx.fillStyle = "#f4f4f5";
      ctx.font = `700 ${textFontSize}px ${FONT_SANS}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        truncateCanvasText(ctx, combo.summaryText, availableTextW),
        textCursorX,
        midY + 0.5
      );
      ctx.restore();
    });
  });
}

function wrapTitleLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < words.length; i += 1) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (!current) {
      lines.push(truncateCanvasText(ctx, words[i], maxWidth));
    } else {
      lines.push(current);
      current = words[i];
    }
    if (lines.length === maxLines - 1) {
      const rest = [current, ...words.slice(i + 1)].filter(Boolean).join(" ");
      lines.push(truncateCanvasText(ctx, rest, maxWidth));
      return lines;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export function buildPodiumCardFilename(
  tournamentName: string,
  aspect: BanlistCardAspect
): string {
  const slug = tournamentName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `podium-oba-${slug || "torneio"}-${aspect}.png`;
}

export function buildPodiumShareCaption(
  data: TournamentPodiumCardData,
  showDepositCombo: boolean
): string {
  const { shortDate } = formatTournamentDatePtBr(data.tournament.eventDate);
  const categoryLabel = TOURNAMENT_CATEGORY_LABELS[data.tournament.category];
  const medalByPos: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  const lines: string[] = [
    `🏆 *PÓDIO OFICIAL — ${data.tournament.name}*`,
    `📅 ${shortDate} • ${categoryLabel}${data.tournament.location ? ` • ${data.tournament.location}` : ""}`,
    "",
  ];

  for (const finisher of data.podium) {
    const medal = medalByPos[finisher.position] ?? `${finisher.position}º`;
    const ptsText =
      data.tournament.category !== "amistoso"
        ? ` (+${finisher.pointsEarned} pts)`
        : "";
    lines.push(`${medal} *${finisher.position}º Lugar:* ${finisher.nickname}${ptsText}`);

    const visibleCombos = finisher.initialCombos.filter(
      (c) => showDepositCombo || c.slotNumber <= 3
    );
    if (visibleCombos.length > 0) {
      const combosStr = visibleCombos
        .map(
          (c) =>
            `${c.system ? `[${c.system}] ` : ""}${c.summaryText}`
        )
        .join(" | ");
      lines.push(`   🌀 Combos iniciais: ${combosStr}`);
    }
  }

  if (data.swissLeader) {
    const campaign =
      data.swissLeader.losses !== null
        ? `${data.swissLeader.wins}V-${data.swissLeader.losses}D${
            data.swissLeader.pointDiff !== null
              ? `, Saldo ${data.swissLeader.pointDiff >= 0 ? `+${data.swissLeader.pointDiff}` : data.swissLeader.pointDiff}`
              : ""
          }`
        : `${data.swissLeader.wins} vit. Suíço`;
    lines.push("");
    lines.push(
      `👑 *Menção Honrosa — Líder da Fase Suíça:* ${data.swissLeader.nickname} (${campaign})`
    );
  }

  lines.push("");
  lines.push(
    `${OBA_SOCIAL_LINKS.instagram.handle} • Organização de Beyblade do Amazonas`
  );

  return lines.join("\n");
}

export function renderPodiumCardToCanvas(
  canvas: HTMLCanvasElement,
  options: PodiumCardRenderOptions
): void {
  const preset = BANLIST_CARD_PRESETS[options.aspect];
  const W = preset.width;
  const H = preset.height;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isStory = options.aspect === "story";
  const isSquare = options.aspect === "square";
  const paddingX = 50;
  const contentW = W - paddingX * 2;
  const { data } = options;

  // 1. Fundo base escuro OBA
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#090611");
  bgGrad.addColorStop(0.5, "#120921");
  bgGrad.addColorStop(1, "#07050c");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Glow dourado/roxo de pódio
  const goldGlow = ctx.createRadialGradient(
    W * 0.5,
    H * 0.2,
    20,
    W * 0.5,
    H * 0.2,
    W * 0.7
  );
  goldGlow.addColorStop(0, "rgba(237, 189, 3, 0.16)");
  goldGlow.addColorStop(0.55, "rgba(189, 8, 245, 0.12)");
  goldGlow.addColorStop(1, "rgba(189, 8, 245, 0)");
  ctx.fillStyle = goldGlow;
  ctx.fillRect(0, 0, W, H);

  // Grid sutil
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.022)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 72) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
  }
  for (let gy = 0; gy <= H; gy += 72) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Barra topo fogo
  const topBarGrad = ctx.createLinearGradient(0, 0, W, 0);
  topBarGrad.addColorStop(0, "#bd08f5");
  topBarGrad.addColorStop(0.5, "#e96b00");
  topBarGrad.addColorStop(1, "#edbd03");
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(0, 0, W, 7);

  // 2. Cabeçalho do Torneio
  const headerTop = isStory ? 48 : isSquare ? 30 : 40;
  const logoSize = isStory ? 80 : isSquare ? 64 : 72;
  drawCircularAvatar(
    ctx,
    paddingX + logoSize / 2,
    headerTop + logoSize / 2,
    logoSize / 2,
    options.logoImage ?? null,
    "OB",
    "rgba(237, 189, 3, 0.75)",
    "#18102b",
    "#fde047",
    2.5
  );

  const textStartX = paddingX + logoSize + 20;
  const headerTextW = contentW - logoSize - 20;
  const categoryLabel =
    TOURNAMENT_CATEGORY_LABELS[data.tournament.category].toUpperCase();
  const kickerText =
    data.tournament.category === "amistoso"
      ? "PÓDIO OFICIAL • AMISTOSO OBA"
      : `PÓDIO OFICIAL • ${categoryLabel}`;

  ctx.save();
  ctx.font = `800 15px ${FONT_SANS}`;
  const kickerW = Math.min(headerTextW, ctx.measureText(kickerText).width + 24);
  traceRoundedRect(ctx, textStartX, headerTop, kickerW, 27, 13.5);
  ctx.fillStyle = "rgba(237, 189, 3, 0.14)";
  ctx.fill();
  ctx.strokeStyle = "rgba(237, 189, 3, 0.45)";
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.fillStyle = "#fde047";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    truncateCanvasText(ctx, kickerText, kickerW - 18),
    textStartX + 12,
    headerTop + 14
  );
  ctx.restore();

  const titleSize = isStory ? 38 : isSquare ? 30 : 34;
  ctx.save();
  ctx.font = `900 ${titleSize}px ${FONT_SANS}`;
  const titleLines = wrapTitleLines(ctx, data.tournament.name, headerTextW, 2);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const titleStartY = headerTop + 34;
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, textStartX, titleStartY + idx * (titleSize + 4));
  });

  const metaY = titleStartY + titleLines.length * (titleSize + 4) + 5;
  const { shortDate } = formatTournamentDatePtBr(data.tournament.eventDate);
  const metaParts = [
    shortDate,
    TOURNAMENT_FORMAT_LABELS[data.tournament.format],
    data.tournament.participantsCount > 0
      ? `${data.tournament.participantsCount} Bladers`
      : null,
    data.tournament.location || null,
  ].filter(Boolean);

  ctx.font = `600 ${isSquare ? 15 : 17}px ${FONT_SANS}`;
  ctx.fillStyle = "#a1a1aa";
  ctx.fillText(
    truncateCanvasText(ctx, metaParts.join(" • "), headerTextW),
    textStartX,
    metaY
  );
  ctx.restore();

  let cursorY =
    Math.max(headerTop + logoSize, metaY + 24) + (isStory ? 24 : isSquare ? 14 : 18);

  const footerH = isStory ? 78 : isSquare ? 54 : 64;
  const footerTop = H - footerH;

  const hasSwissLeader = Boolean(options.showSwissLeader && data.swissLeader);
  const gap = isStory ? 18 : isSquare ? 11 : 14;
  const totalAvailH = footerTop - cursorY - (isStory ? 18 : 10);

  // Calcula alturas proporcionais para 1º, 2º, 3º e Menção Honrosa
  const swissBannerH = hasSwissLeader
    ? isStory
      ? 262
      : isSquare
        ? 158
        : 196
    : 0;
  const podiumCount = Math.max(1, data.podium.length);
  const totalGaps = gap * ((hasSwissLeader ? podiumCount : podiumCount - 1));
  const podiumAvailH = Math.max(240, totalAvailH - swissBannerH - totalGaps);

  const firstWeight = 1.15;
  const otherWeight = 1.0;
  const weightSum =
    data.podium.length > 0
      ? data.podium.reduce(
          (acc, p) => acc + (p.position === 1 ? firstWeight : otherWeight),
          0
        )
      : 3;

  // 3. Blocos do Pódio (1º, 2º, 3º)
  if (data.podium.length === 0) {
    ctx.save();
    traceRoundedRect(ctx, paddingX, cursorY, contentW, 200, 18);
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fill();
    ctx.fillStyle = "#a1a1aa";
    ctx.font = `700 22px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "Nenhum resultado de pódio registrado para este torneio.",
      W / 2,
      cursorY + 100
    );
    ctx.restore();
    cursorY += 200 + gap;
  } else {
    for (const finisher of data.podium) {
      const cardH = Math.floor(
        (podiumAvailH * (finisher.position === 1 ? firstWeight : otherWeight)) /
          weightSum
      );
      const isFirst = finisher.position === 1;
      const isSecond = finisher.position === 2;

      const theme = isFirst
        ? {
            accent: "#edbd03",
            border: "rgba(237, 189, 3, 0.78)",
            bgTop: "rgba(69, 39, 9, 0.66)",
            bgBottom: "rgba(22, 14, 34, 0.92)",
            badgeBg: "#eab308",
            badgeText: "#09090b",
            badgeLabel: "1º LUGAR • CAMPEÃO",
          }
        : isSecond
          ? {
              accent: "#cbd5e1",
              border: "rgba(148, 163, 184, 0.5)",
              bgTop: "rgba(30, 41, 59, 0.68)",
              bgBottom: "rgba(15, 21, 36, 0.9)",
              badgeBg: "#475569",
              badgeText: "#f1f5f9",
              badgeLabel: "2º LUGAR • VICE",
            }
          : {
              accent: "#d97706",
              border: "rgba(217, 119, 6, 0.55)",
              bgTop: "rgba(67, 29, 13, 0.64)",
              bgBottom: "rgba(19, 12, 26, 0.9)",
              badgeBg: "#92400e",
              badgeText: "#fef3c7",
              badgeLabel: "3º LUGAR • PÓDIO",
            };

      ctx.save();
      traceRoundedRect(ctx, paddingX, cursorY, contentW, cardH, 18);
      const cardGrad = ctx.createLinearGradient(
        paddingX,
        cursorY,
        paddingX,
        cursorY + cardH
      );
      cardGrad.addColorStop(0, theme.bgTop);
      cardGrad.addColorStop(1, theme.bgBottom);
      ctx.fillStyle = cardGrad;
      ctx.fill();
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = isFirst ? 2.5 : 1.5;
      ctx.stroke();

      ctx.clip();
      ctx.fillStyle = theme.accent;
      ctx.fillRect(paddingX, cursorY, 7, cardH);
      ctx.restore();

      const visibleCombos = finisher.initialCombos.filter(
        (c) => options.showDepositCombo || c.slotNumber <= 3
      );

      if (isStory) {
        // Layout Story vertical: topo com avatar/nome/pontos, baixo com grid 2x2 de combos
        const pad = 20;
        const avatarR = isFirst ? 44 : 38;
        const avatarCx = paddingX + pad + 8 + avatarR;
        const topAreaH = avatarR * 2 + 16;
        const avatarCy = cursorY + pad + avatarR + 4;

        const avatarImg =
          options.avatarsByBladerId?.get(finisher.bladerId) ?? null;
        drawCircularAvatar(
          ctx,
          avatarCx,
          avatarCy,
          avatarR,
          avatarImg,
          finisher.nickname,
          theme.accent,
          "rgba(255,255,255,0.08)",
          theme.accent,
          isFirst ? 3.5 : 2.5
        );

        const infoX = avatarCx + avatarR + 18;
        const infoW = paddingX + contentW - pad - infoX;

        ctx.save();
        ctx.font = `900 13px ${FONT_SANS}`;
        const badgeW = ctx.measureText(theme.badgeLabel).width + 20;
        traceRoundedRect(ctx, infoX, cursorY + pad, badgeW, 24, 12);
        ctx.fillStyle = theme.badgeBg;
        ctx.fill();
        ctx.fillStyle = theme.badgeText;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(theme.badgeLabel, infoX + badgeW / 2, cursorY + pad + 12.5);

        ctx.font = `900 ${isFirst ? 34 : 29}px ${FONT_SANS}`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(
          truncateCanvasText(ctx, finisher.nickname, infoW),
          infoX,
          cursorY + pad + 31
        );

        if (options.showPoints) {
          ctx.font = `700 16px ${FONT_SANS}`;
          ctx.fillStyle = theme.accent;
          const ptsText =
            data.tournament.category !== "amistoso"
              ? `+${finisher.pointsEarned} pts no Ranking • ${finisher.swissWins} vit. Suíço`
              : `${finisher.swissWins} vit. na Fase Suíça`;
          ctx.fillText(
            truncateCanvasText(ctx, ptsText, infoW),
            infoX,
            cursorY + pad + 31 + (isFirst ? 39 : 34)
          );
        }
        ctx.restore();

        const comboLabelY = cursorY + pad + topAreaH + 6;
        ctx.save();
        ctx.font = `800 12px ${FONT_SANS}`;
        ctx.fillStyle = "#a1a1aa";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("COMBOS INICIAIS REGISTRADOS", paddingX + pad + 6, comboLabelY);
        ctx.restore();

        const gridY = comboLabelY + 20;
        const gridH = cursorY + cardH - pad - gridY;
        drawComboPillsGrid({
          ctx,
          combos: visibleCombos,
          x: paddingX + pad + 6,
          y: gridY,
          width: contentW - pad * 2 - 6,
          height: gridH,
          columns: 2,
          compact: false,
        });
      } else {
        // Layout Feed (4:5) e Quadrado (1:1): esquerda Blader + foto, direita Combos 2x2
        const leftColW = isSquare ? 316 : 332;
        const avatarR = isFirst ? (isSquare ? 38 : 46) : isSquare ? 34 : 40;
        const avatarCx = paddingX + 24 + avatarR;
        const avatarCy = cursorY + cardH / 2;

        const avatarImg =
          options.avatarsByBladerId?.get(finisher.bladerId) ?? null;
        drawCircularAvatar(
          ctx,
          avatarCx,
          avatarCy,
          avatarR,
          avatarImg,
          finisher.nickname,
          theme.accent,
          "rgba(255,255,255,0.08)",
          theme.accent,
          isFirst ? 3.5 : 2.5
        );

        const infoX = avatarCx + avatarR + 14;
        const infoMaxW = paddingX + leftColW - infoX - 10;
        const infoCenterY = cursorY + cardH / 2;

        ctx.save();
        ctx.font = `900 ${isSquare ? 11 : 12}px ${FONT_SANS}`;
        const badgeLabel = isFirst ? "1º CAMPEÃO" : `${finisher.position}º LUGAR`;
        const badgeW = ctx.measureText(badgeLabel).width + 18;
        const blockStartY = infoCenterY - (options.showPoints ? 38 : 26);

        traceRoundedRect(ctx, infoX, blockStartY, badgeW, 22, 11);
        ctx.fillStyle = theme.badgeBg;
        ctx.fill();
        ctx.fillStyle = theme.badgeText;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeLabel, infoX + badgeW / 2, blockStartY + 11.5);

        const nickSize = isFirst ? (isSquare ? 24 : 28) : isSquare ? 22 : 24;
        ctx.font = `900 ${nickSize}px ${FONT_SANS}`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(
          truncateCanvasText(ctx, finisher.nickname, infoMaxW),
          infoX,
          blockStartY + 28
        );

        if (options.showPoints) {
          ctx.font = `700 ${isSquare ? 13 : 15}px ${FONT_SANS}`;
          ctx.fillStyle = theme.accent;
          const ptsText =
            data.tournament.category !== "amistoso"
              ? `+${finisher.pointsEarned} pts • ${finisher.swissWins}V Suíço`
              : `${finisher.swissWins} vit. Suíço`;
          ctx.fillText(
            truncateCanvasText(ctx, ptsText, infoMaxW),
            infoX,
            blockStartY + 28 + nickSize + 5
          );
        }
        ctx.restore();

        // Divisória vertical sutil
        const dividerX = paddingX + leftColW;
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(dividerX, cursorY + 16);
        ctx.lineTo(dividerX, cursorY + cardH - 16);
        ctx.stroke();
        ctx.restore();

        const rightX = dividerX + 16;
        const rightW = paddingX + contentW - 16 - rightX;
        const labelTopY = cursorY + (isSquare ? 13 : 16);

        ctx.save();
        ctx.font = `800 ${isSquare ? 10.5 : 11.5}px ${FONT_SANS}`;
        ctx.fillStyle = "#a1a1aa";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("COMBOS INICIAIS REGISTRADOS", rightX, labelTopY);
        ctx.restore();

        const gridY = labelTopY + (isSquare ? 18 : 20);
        const gridH = cursorY + cardH - (isSquare ? 14 : 16) - gridY;
        drawComboPillsGrid({
          ctx,
          combos: visibleCombos,
          x: rightX,
          y: gridY,
          width: rightW,
          height: gridH,
          columns: 2,
          compact: isSquare,
        });
      }

      cursorY += cardH + gap;
    }
  }

  // 4. Menção Honrosa — Líder da Fase Suíça
  if (hasSwissLeader && data.swissLeader) {
    const leader = data.swissLeader;
    const h = swissBannerH;

    ctx.save();
    traceRoundedRect(ctx, paddingX, cursorY, contentW, h, 18);
    const honorGrad = ctx.createLinearGradient(
      paddingX,
      cursorY,
      paddingX + contentW,
      cursorY + h
    );
    honorGrad.addColorStop(0, "rgba(237, 189, 3, 0.14)");
    honorGrad.addColorStop(0.5, "rgba(189, 8, 245, 0.12)");
    honorGrad.addColorStop(1, "rgba(233, 107, 0, 0.12)");
    ctx.fillStyle = honorGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(237, 189, 3, 0.55)";
    ctx.lineWidth = 1.75;
    ctx.stroke();
    ctx.restore();

    const visibleLeaderCombos = leader.initialCombos.filter(
      (c) => options.showDepositCombo || c.slotNumber <= 3
    );

    const campaignParts: string[] = [];
    if (leader.losses !== null) {
      campaignParts.push(`${leader.wins}V-${leader.losses}D no Suíço`);
      if (leader.pointDiff !== null) {
        campaignParts.push(
          `Saldo ${leader.pointDiff >= 0 ? `+${leader.pointDiff}` : leader.pointDiff}`
        );
      }
    } else {
      campaignParts.push(`${leader.wins} vitória(s) no Suíço`);
    }
    if (leader.podiumPosition) {
      campaignParts.push(`Também ${leader.podiumPosition}º no Pódio`);
    }

    const showBonusChip =
      options.showPoints &&
      data.tournament.category !== "amistoso" &&
      data.tournament.format !== "swiss_only";

    if (isStory) {
      const pad = 18;
      const topRowY = cursorY + pad;
      drawCrownIcon(ctx, paddingX + pad + 12, topRowY + 11, 20, "#edbd03");

      ctx.save();
      ctx.font = `900 13px ${FONT_SANS}`;
      ctx.fillStyle = "#fde047";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "MENÇÃO HONROSA • LÍDER DA FASE SUÍÇA",
        paddingX + pad + 30,
        topRowY + 12
      );
      ctx.restore();

      const avatarR = 32;
      const avatarCx = paddingX + pad + avatarR;
      const avatarCy = topRowY + 34 + avatarR;
      drawCircularAvatar(
        ctx,
        avatarCx,
        avatarCy,
        avatarR,
        options.avatarsByBladerId?.get(leader.bladerId) ?? null,
        leader.nickname,
        "#edbd03",
        "rgba(237, 189, 3, 0.16)",
        "#fde047",
        2.5
      );

      const infoX = avatarCx + avatarR + 14;
      const infoW = paddingX + contentW - pad - infoX;

      ctx.save();
      ctx.font = `900 26px ${FONT_SANS}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        truncateCanvasText(ctx, leader.nickname, infoW),
        infoX,
        avatarCy + 2
      );

      ctx.font = `600 15px ${FONT_SANS}`;
      ctx.fillStyle = "#e4e4e7";
      ctx.textBaseline = "top";
      ctx.fillText(
        truncateCanvasText(
          ctx,
          `${campaignParts.join(" • ")}${showBonusChip ? " • +15 pts bônus" : ""}`,
          infoW
        ),
        infoX,
        avatarCy + 6
      );
      ctx.restore();

      const gridY = avatarCy + avatarR + 14;
      const gridH = cursorY + h - pad - gridY;
      drawComboPillsGrid({
        ctx,
        combos: visibleLeaderCombos,
        x: paddingX + pad,
        y: gridY,
        width: contentW - pad * 2,
        height: gridH,
        columns: 2,
        compact: true,
      });
    } else {
      const pad = isSquare ? 14 : 16;
      const leftW =
        visibleLeaderCombos.length > 0
          ? isSquare
            ? 364
            : 388
          : contentW - pad * 2;
      const avatarR = isSquare ? 29 : 34;
      const avatarCx = paddingX + pad + 4 + avatarR;
      const avatarCy = cursorY + h / 2 + 12;

      // Título Menção Honrosa no topo
      drawCrownIcon(ctx, paddingX + pad + 11, cursorY + pad + 10, 18, "#edbd03");
      ctx.save();
      ctx.font = `900 ${isSquare ? 12 : 13}px ${FONT_SANS}`;
      ctx.fillStyle = "#fde047";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "MENÇÃO HONROSA • LÍDER DA FASE SUÍÇA",
        paddingX + pad + 26,
        cursorY + pad + 10.5
      );
      ctx.restore();

      drawCircularAvatar(
        ctx,
        avatarCx,
        avatarCy,
        avatarR,
        options.avatarsByBladerId?.get(leader.bladerId) ?? null,
        leader.nickname,
        "#edbd03",
        "rgba(237, 189, 3, 0.16)",
        "#fde047",
        2.5
      );

      const infoX = avatarCx + avatarR + 14;
      const infoW = paddingX + leftW - infoX;

      ctx.save();
      ctx.font = `900 ${isSquare ? 22 : 25}px ${FONT_SANS}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        truncateCanvasText(ctx, leader.nickname, infoW),
        infoX,
        avatarCy + 2
      );

      ctx.font = `600 ${isSquare ? 13 : 14.5}px ${FONT_SANS}`;
      ctx.fillStyle = "#e4e4e7";
      ctx.textBaseline = "top";
      ctx.fillText(
        truncateCanvasText(
          ctx,
          `${campaignParts.join(" • ")}${showBonusChip ? " • +15 pts" : ""}`,
          infoW
        ),
        infoX,
        avatarCy + 5
      );
      ctx.restore();

      if (visibleLeaderCombos.length > 0) {
        const rightX = paddingX + leftW + 14;
        const rightW = paddingX + contentW - pad - rightX;
        const gridY = cursorY + pad + 24;
        const gridH = h - pad * 2 - 24;
        drawComboPillsGrid({
          ctx,
          combos: visibleLeaderCombos,
          x: rightX,
          y: gridY,
          width: rightW,
          height: gridH,
          columns: 2,
          compact: true,
        });
      }
    }
  }

  // 5. Rodapé oficial OBA
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(paddingX, footerTop);
  ctx.lineTo(W - paddingX, footerTop);
  ctx.stroke();

  const footerMidY = footerTop + footerH / 2;
  ctx.fillStyle = "#e4e4e7";
  ctx.font = `700 ${isSquare ? 16 : 17}px ${FONT_SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${OBA_SOCIAL_LINKS.instagram.handle} • Organização de Beyblade do Amazonas`,
    paddingX,
    footerMidY + 1
  );

  const rightLabel = [
    data.tournament.seasonName,
    data.tournament.rulesetName ? `Regras: ${data.tournament.rulesetName}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  if (rightLabel) {
    ctx.fillStyle = "#a1a1aa";
    ctx.font = `600 ${isSquare ? 14 : 15}px ${FONT_SANS}`;
    ctx.textAlign = "right";
    ctx.fillText(
      truncateCanvasText(ctx, rightLabel, 360),
      W - paddingX,
      footerMidY + 1
    );
  }
  ctx.restore();
}
