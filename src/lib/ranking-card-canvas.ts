import { OBA_SOCIAL_LINKS } from "@/lib/constants";
import {
  BANLIST_CARD_ASPECT_ORDER,
  BANLIST_CARD_PRESETS,
  type BanlistCardAspect,
  canvasToPngBlob,
  loadObaLogoImage,
} from "@/lib/banlist-card-canvas";

export {
  BANLIST_CARD_ASPECT_ORDER as RANKING_CARD_ASPECT_ORDER,
  BANLIST_CARD_PRESETS as RANKING_CARD_PRESETS,
  type BanlistCardAspect as RankingCardAspect,
  canvasToPngBlob,
  loadObaLogoImage,
};

export interface RankingCardEntry {
  position: number;
  bladerId: string;
  nickname: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  swissWins: number;
  podiumsCount: number;
  bestPodium: number | null;
  favoriteComboText?: string | null;
  mostUsedComboText?: string | null;
}

export interface RankingCardRenderOptions {
  aspect: BanlistCardAspect;
  seasonName: string;
  totalRankedCount: number;
  finishedTournamentsCount: number;
  entries: RankingCardEntry[];
  showAvatars: boolean;
  showStats: boolean;
  showUpdatedDate: boolean;
  logoImage?: HTMLImageElement | null;
  avatarsByBladerId?: Map<string, HTMLImageElement | null>;
  updatedAt?: Date;
}

const FONT_SANS =
  'Geist, "Geist Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const avatarPromiseCache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadBladerAvatarImage(
  bladerId: string,
  avatarUrl: string | null | undefined
): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  const cleanUrl = avatarUrl?.trim() ?? "";
  if (!cleanUrl) {
    return Promise.resolve(null);
  }

  const targetSrc = cleanUrl.startsWith("/")
    ? cleanUrl
    : `/api/bladers/${bladerId}/avatar`;

  const cacheKey = `${bladerId}::${cleanUrl}`;
  const cached = avatarPromiseCache.get(cacheKey);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      avatarPromiseCache.delete(cacheKey);
      resolve(null);
    };
    img.src = targetSrc;
  });

  avatarPromiseCache.set(cacheKey, promise);
  return promise;
}

export function traceRoundedRect(
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

export function truncateCanvasText(
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

export function drawCircularAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  image: HTMLImageElement | null | undefined,
  nickname: string,
  borderColor: string,
  bgColor = "rgba(189, 8, 245, 0.16)",
  textColor = "#f5d0fe",
  borderWidth = 3
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.clip();

  if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const size = radius * 2;
    const scale = Math.max(size / iw, size / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(image, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    const initials = (nickname.trim() || "BX").slice(0, 2).toUpperCase();
    ctx.fillStyle = textColor;
    ctx.font = `900 ${Math.round(radius * 0.72)}px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, cx, cy + 1);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.stroke();
  ctx.restore();
}

export function buildRankingCardFilename(
  seasonName: string,
  aspect: BanlistCardAspect
): string {
  const slug = seasonName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `ranking-top10-oba-${slug || "liga"}-${aspect}.png`;
}

export function buildRankingShareCaption(params: {
  seasonName: string;
  entries: RankingCardEntry[];
  totalRankedCount: number;
  originUrl: string;
}): string {
  const top10 = params.entries.slice(0, 10);
  const medalByPos: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  const lines: string[] = [
    `🏆 *TOP 10 RANKING OFICIAL OBA — ${params.seasonName}*`,
    "",
  ];

  for (const e of top10) {
    const prefix = medalByPos[e.position] ?? `${e.position}º`;
    lines.push(
      `${prefix} *${e.nickname}* — ${e.totalPoints} pts (${e.swissWins} vit • ${e.podiumsCount} pódios)`
    );
  }

  lines.push("");
  lines.push(
    `📊 ${params.totalRankedCount} Bladers ranqueados na temporada.`
  );
  lines.push(`👉 *Ranking completo:* ${params.originUrl}`);
  lines.push(
    `${OBA_SOCIAL_LINKS.instagram.handle} • Organização de Beyblade do Amazonas`
  );

  return lines.join("\n");
}

function drawTrophyBadgeIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const r = size * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.85, cy - r * 0.8);
  ctx.lineTo(cx + r * 0.85, cy - r * 0.8);
  ctx.lineTo(cx + r * 0.65, cy + r * 0.05);
  ctx.quadraticCurveTo(cx, cy + r * 0.55, cx - r * 0.65, cy + r * 0.05);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.35);
  ctx.lineTo(cx, cy + r * 0.85);
  ctx.moveTo(cx - r * 0.5, cy + r * 0.85);
  ctx.lineTo(cx + r * 0.5, cy + r * 0.85);
  ctx.stroke();
  ctx.restore();
}

export function renderRankingCardToCanvas(
  canvas: HTMLCanvasElement,
  options: RankingCardRenderOptions
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
  const paddingX = 56;
  const contentW = W - paddingX * 2;
  const top10 = options.entries.slice(0, 10);

  // 1. Fundo base escuro OBA
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#090611");
  bgGrad.addColorStop(0.5, "#120921");
  bgGrad.addColorStop(1, "#07050c");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Glow roxo superior + fogo inferior
  const purpleGlow = ctx.createRadialGradient(
    W * 0.5,
    H * 0.14,
    20,
    W * 0.5,
    H * 0.14,
    W * 0.72
  );
  purpleGlow.addColorStop(0, "rgba(189, 8, 245, 0.24)");
  purpleGlow.addColorStop(1, "rgba(189, 8, 245, 0)");
  ctx.fillStyle = purpleGlow;
  ctx.fillRect(0, 0, W, H);

  const fireGlow = ctx.createRadialGradient(
    W * 0.85,
    H * 0.88,
    10,
    W * 0.85,
    H * 0.88,
    W * 0.65
  );
  fireGlow.addColorStop(0, "rgba(233, 107, 0, 0.16)");
  fireGlow.addColorStop(1, "rgba(233, 107, 0, 0)");
  ctx.fillStyle = fireGlow;
  ctx.fillRect(0, 0, W, H);

  // Grid sutil
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.024)";
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

  // Barra de gradiente fogo no topo
  const topBarGrad = ctx.createLinearGradient(0, 0, W, 0);
  topBarGrad.addColorStop(0, "#bd08f5");
  topBarGrad.addColorStop(0.5, "#e96b00");
  topBarGrad.addColorStop(1, "#edbd03");
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(0, 0, W, 7);

  // 2. Cabeçalho
  const headerTop = isStory ? 56 : isSquare ? 36 : 46;
  const logoSize = isStory ? 84 : isSquare ? 68 : 76;
  const logoCx = paddingX + logoSize / 2;
  const logoCy = headerTop + logoSize / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(logoCx, logoCy, logoSize / 2 + 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(237, 189, 3, 0.25)";
  ctx.fill();
  ctx.restore();

  drawCircularAvatar(
    ctx,
    logoCx,
    logoCy,
    logoSize / 2,
    options.logoImage ?? null,
    "OB",
    "rgba(237, 189, 3, 0.75)",
    "#18102b",
    "#fde047",
    2.5
  );

  const textStartX = paddingX + logoSize + 22;
  const headerTextW = contentW - logoSize - 22;

  // Badge de Temporada
  ctx.save();
  ctx.font = `800 17px ${FONT_SANS}`;
  const seasonBadgeText = `RANKING OFICIAL • ${options.seasonName.toUpperCase()}`;
  const seasonBadgeW = Math.min(
    headerTextW,
    ctx.measureText(seasonBadgeText).width + 28
  );
  traceRoundedRect(ctx, textStartX, headerTop, seasonBadgeW, 30, 15);
  ctx.fillStyle = "rgba(237, 189, 3, 0.14)";
  ctx.fill();
  ctx.strokeStyle = "rgba(237, 189, 3, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#fde047";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    truncateCanvasText(ctx, seasonBadgeText, seasonBadgeW - 22),
    textStartX + 14,
    headerTop + 15.5
  );
  ctx.restore();

  // Título Principal
  const titleFontSize = isStory ? 44 : isSquare ? 36 : 40;
  ctx.save();
  ctx.font = `900 ${titleFontSize}px ${FONT_SANS}`;
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(
    truncateCanvasText(ctx, "TOP 10 RANKING GERAL", headerTextW),
    textStartX,
    headerTop + 38
  );

  ctx.font = `600 ${isSquare ? 18 : 20}px ${FONT_SANS}`;
  ctx.fillStyle = "#a1a1aa";
  const subText = `${options.totalRankedCount} Bladers ranqueados • ${options.finishedTournamentsCount} torneio(s) realizados`;
  ctx.fillText(
    truncateCanvasText(ctx, subText, headerTextW),
    textStartX,
    headerTop + 38 + titleFontSize + 6
  );
  ctx.restore();

  let cursorY = headerTop + Math.max(logoSize, 38 + titleFontSize + 34) + (isStory ? 26 : isSquare ? 14 : 20);

  const footerH = isStory ? 88 : isSquare ? 64 : 74;
  const footerTop = H - footerH;

  // 3. Pódio Top 3 (quando houver >= 3 entradas)
  const useTop3Cards = top10.length >= 3;
  if (useTop3Cards) {
    const podiumH = isStory ? 316 : isSquare ? 216 : 268;
    const cardGap = 16;
    const cardW = (contentW - cardGap * 2) / 3;

    const slots: Array<{
      entry: RankingCardEntry;
      colIdx: number;
      elevate: number;
      accent: string;
      border: string;
      bgTop: string;
      bgBottom: string;
      medalText: string;
      badgeBg: string;
      badgeText: string;
      avatarR: number;
    }> = [
      {
        entry: top10[1],
        colIdx: 0,
        elevate: isSquare ? 12 : 18,
        accent: "#cbd5e1",
        border: "rgba(148, 163, 184, 0.5)",
        bgTop: "rgba(30, 41, 59, 0.72)",
        bgBottom: "rgba(15, 23, 42, 0.85)",
        medalText: "2º LUGAR",
        badgeBg: "#475569",
        badgeText: "#f1f5f9",
        avatarR: isStory ? 44 : isSquare ? 31 : 38,
      },
      {
        entry: top10[0],
        colIdx: 1,
        elevate: 0,
        accent: "#edbd03",
        border: "rgba(237, 189, 3, 0.78)",
        bgTop: "rgba(69, 39, 9, 0.72)",
        bgBottom: "rgba(24, 15, 38, 0.9)",
        medalText: "1º • LÍDER",
        badgeBg: "#eab308",
        badgeText: "#09090b",
        avatarR: isStory ? 54 : isSquare ? 37 : 46,
      },
      {
        entry: top10[2],
        colIdx: 2,
        elevate: isSquare ? 16 : 24,
        accent: "#d97706",
        border: "rgba(217, 119, 6, 0.52)",
        bgTop: "rgba(67, 29, 13, 0.68)",
        bgBottom: "rgba(19, 12, 26, 0.86)",
        medalText: "3º LUGAR",
        badgeBg: "#92400e",
        badgeText: "#fef3c7",
        avatarR: isStory ? 42 : isSquare ? 30 : 36,
      },
    ];

    for (const slot of slots) {
      const cardX = paddingX + slot.colIdx * (cardW + cardGap);
      const cardY = cursorY + slot.elevate;
      const cardH = podiumH - slot.elevate;
      const cardCx = cardX + cardW / 2;

      ctx.save();
      traceRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
      const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      cardGrad.addColorStop(0, slot.bgTop);
      cardGrad.addColorStop(1, slot.bgBottom);
      ctx.fillStyle = cardGrad;
      ctx.fill();
      ctx.strokeStyle = slot.border;
      ctx.lineWidth = slot.entry.position === 1 ? 2.5 : 1.5;
      ctx.stroke();

      // Barra de acento no topo do card
      ctx.clip();
      ctx.fillStyle = slot.accent;
      ctx.fillRect(cardX, cardY, cardW, slot.entry.position === 1 ? 6 : 4);
      ctx.restore();

      const avatarCenterY =
        cardY + (isSquare ? 20 : 24) + (options.showAvatars ? slot.avatarR : 18);

      if (options.showAvatars) {
        const avatarImg =
          options.avatarsByBladerId?.get(slot.entry.bladerId) ?? null;
        drawCircularAvatar(
          ctx,
          cardCx,
          avatarCenterY,
          slot.avatarR,
          avatarImg,
          slot.entry.nickname,
          slot.accent,
          "rgba(255, 255, 255, 0.08)",
          slot.accent,
          slot.entry.position === 1 ? 3.5 : 2.5
        );
      }

      // Badge da posição
      const badgeY = options.showAvatars
        ? avatarCenterY + slot.avatarR - 8
        : cardY + 18;
      ctx.save();
      ctx.font = `900 ${isSquare ? 13 : 14}px ${FONT_SANS}`;
      const badgeW = ctx.measureText(slot.medalText).width + 22;
      traceRoundedRect(ctx, cardCx - badgeW / 2, badgeY, badgeW, 24, 12);
      ctx.fillStyle = slot.badgeBg;
      ctx.fill();
      ctx.fillStyle = slot.badgeText;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(slot.medalText, cardCx, badgeY + 12.5);
      ctx.restore();

      // Apelido
      const nickY = badgeY + (isSquare ? 31 : 35);
      ctx.save();
      ctx.font = `900 ${
        slot.entry.position === 1
          ? isSquare
            ? 24
            : 28
          : isSquare
            ? 20
            : 24
      }px ${FONT_SANS}`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        truncateCanvasText(ctx, slot.entry.nickname, cardW - 24),
        cardCx,
        nickY
      );
      ctx.restore();

      // Pontuação
      const ptsY = nickY + (isSquare ? 30 : 36);
      ctx.save();
      ctx.font = `900 ${
        slot.entry.position === 1
          ? isSquare
            ? 28
            : 34
          : isSquare
            ? 24
            : 28
      }px ${FONT_SANS}`;
      ctx.fillStyle = slot.accent;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${slot.entry.totalPoints} pts`, cardCx, ptsY);
      ctx.restore();

      // Stats opcionais no card do pódio
      if (options.showStats) {
        const statsY = cardY + cardH - (isSquare ? 24 : 30);
        ctx.save();
        ctx.font = `600 ${isSquare ? 13 : 15}px ${FONT_SANS}`;
        ctx.fillStyle = "#a1a1aa";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const statsText = `${slot.entry.swissWins} vit • ${slot.entry.podiumsCount} pódios`;
        ctx.fillText(
          truncateCanvasText(ctx, statsText, cardW - 20),
          cardCx,
          statsY
        );
        ctx.restore();
      }
    }

    cursorY += podiumH + (isStory ? 26 : isSquare ? 14 : 20);
  }

  // 4. Linhas do Ranking (4º ao 10º — ou todos se houver < 3 entradas)
  const listEntries = useTop3Cards ? top10.slice(3, 10) : top10;
  const availableListH = footerTop - cursorY - (isStory ? 22 : 12);

  if (listEntries.length > 0 && availableListH > 40) {
    const count = Math.max(listEntries.length, useTop3Cards ? 7 : listEntries.length);
    const gap = isStory ? 18 : isSquare ? 8 : 12;
    const rawRowH = Math.floor((availableListH - gap * (count - 1)) / count);
    const rowH = Math.min(isStory ? 130 : isSquare ? 68 : 82, Math.max(54, rawRowH));

    listEntries.forEach((entry, idx) => {
      const rowY = cursorY + idx * (rowH + gap);
      const rowMidY = rowY + rowH / 2;

      ctx.save();
      traceRoundedRect(ctx, paddingX, rowY, contentW, rowH, 16);
      ctx.fillStyle = "rgba(22, 16, 36, 0.78)";
      ctx.fill();
      ctx.strokeStyle =
        entry.position === 1
          ? "rgba(237, 189, 3, 0.55)"
          : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.restore();

      // Badge da Posição
      const posSize = isSquare ? 42 : 48;
      const posCx = paddingX + 20 + posSize / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(posCx, rowMidY, posSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#e4e4e7";
      ctx.font = `900 ${isSquare ? 18 : 20}px ${FONT_SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${entry.position}º`, posCx, rowMidY + 1);
      ctx.restore();

      let nameStartX = paddingX + 20 + posSize + 18;

      if (options.showAvatars) {
        const avatarR = isSquare ? 22 : isStory ? 30 : 25;
        const avatarCx = nameStartX + avatarR;
        const avatarImg = options.avatarsByBladerId?.get(entry.bladerId) ?? null;
        drawCircularAvatar(
          ctx,
          avatarCx,
          rowMidY,
          avatarR,
          avatarImg,
          entry.nickname,
          "rgba(189, 8, 245, 0.5)",
          "rgba(189, 8, 245, 0.14)",
          "#f5d0fe",
          2
        );
        nameStartX = avatarCx + avatarR + 18;
      }

      // Caixa de Pontuação à direita
      const ptsBoxW = isSquare ? 148 : 168;
      const ptsBoxH = rowH - (isSquare ? 16 : 22);
      const ptsBoxX = paddingX + contentW - 14 - ptsBoxW;
      const ptsBoxY = rowY + (rowH - ptsBoxH) / 2;

      ctx.save();
      traceRoundedRect(ctx, ptsBoxX, ptsBoxY, ptsBoxW, ptsBoxH, 12);
      ctx.fillStyle = "rgba(189, 8, 245, 0.14)";
      ctx.fill();
      ctx.strokeStyle = "rgba(189, 8, 245, 0.35)";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      ctx.fillStyle = "#e879f9";
      ctx.font = `900 ${isSquare ? 22 : 26}px ${FONT_SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${entry.totalPoints} pts`, ptsBoxX + ptsBoxW / 2, rowMidY + 1);
      ctx.restore();

      // Nome e métricas / combo no Story
      const nameMaxW = ptsBoxX - nameStartX - 18;
      const comboText =
        entry.mostUsedComboText || entry.favoriteComboText || null;
      const showSubLine = options.showStats || (isStory && Boolean(comboText));

      ctx.save();
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${isStory ? 26 : isSquare ? 21 : 23}px ${FONT_SANS}`;

      if (showSubLine) {
        ctx.textBaseline = "bottom";
        ctx.fillText(
          truncateCanvasText(ctx, entry.nickname, nameMaxW),
          nameStartX,
          rowMidY + (isStory ? -2 : -1)
        );

        ctx.textBaseline = "top";
        ctx.font = `600 ${isStory ? 17 : isSquare ? 14 : 15}px ${FONT_SANS}`;
        ctx.fillStyle = "#a1a1aa";
        const parts: string[] = [];
        if (options.showStats) {
          parts.push(
            `${entry.swissWins} vit. Suíço • ${entry.podiumsCount} pódio(s)`
          );
        }
        if (isStory && comboText) {
          parts.push(comboText);
        }
        ctx.fillText(
          truncateCanvasText(ctx, parts.join(" • "), nameMaxW),
          nameStartX,
          rowMidY + 4
        );
      } else {
        ctx.textBaseline = "middle";
        ctx.fillText(
          truncateCanvasText(ctx, entry.nickname, nameMaxW),
          nameStartX,
          rowMidY + 1
        );
      }
      ctx.restore();
    });
  } else if (top10.length === 0) {
    ctx.save();
    ctx.fillStyle = "#a1a1aa";
    ctx.font = `700 24px ${FONT_SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "Nenhum ponto registrado nesta temporada ainda.",
      W / 2,
      (cursorY + footerTop) / 2
    );
    ctx.restore();
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
  drawTrophyBadgeIcon(ctx, paddingX + 14, footerMidY, 24, "#edbd03");

  ctx.fillStyle = "#e4e4e7";
  ctx.font = `700 18px ${FONT_SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${OBA_SOCIAL_LINKS.instagram.handle} • Organização de Beyblade do Amazonas`,
    paddingX + 36,
    footerMidY + 1
  );

  if (options.showUpdatedDate) {
    const dateRef = options.updatedAt ?? new Date();
    const formatted = dateRef.toLocaleDateString("pt-BR");
    ctx.fillStyle = "#a1a1aa";
    ctx.font = `600 16px ${FONT_SANS}`;
    ctx.textAlign = "right";
    ctx.fillText(`Atualizado em ${formatted}`, W - paddingX, footerMidY + 1);
  }
  ctx.restore();
}
