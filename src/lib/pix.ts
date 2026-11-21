import type { LeagueSettingsRow } from "@/types/domain";

const UTF8_ENCODER = new TextEncoder();

/**
 * Formata valor monetário em Real Brasileiro (R$ 0,00).
 */
export function formatCurrencyBRL(value: number | null | undefined): string {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

/**
 * Verifica se a configuração PIX global da Liga OBA está minimamente preenchida.
 */
export function isPixConfigured(
  settings: Pick<LeagueSettingsRow, "pix_key" | "pix_receiver_name"> | null | undefined
): boolean {
  return Boolean(settings?.pix_key?.trim() && settings?.pix_receiver_name?.trim());
}

/**
 * Remove acentos e normaliza texto para padrão EMVCo / BACEN BR Code.
 */
export function sanitizePixText(input: string, maxLength: number): string {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return normalized.slice(0, maxLength).trim();
}

/**
 * Normaliza o identificador de transação (txid) para padrão alfanumérico até 25 caracteres.
 */
export function sanitizePixTxid(input?: string | null): string {
  if (!input) return "***";
  const cleaned = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 25);
  return cleaned.length > 0 ? cleaned : "***";
}

/**
 * Calcula CRC16-CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF) sobre bytes UTF-8.
 */
export function computeCrc16Ccitt(payload: string): string {
  const bytes = UTF8_ENCODER.encode(payload);
  let crc = 0xffff;

  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatEmvField(id: string, value: string): string {
  const byteLength = UTF8_ENCODER.encode(value).length;
  if (byteLength > 99) {
    throw new Error(`Campo PIX ${id} excede 99 bytes.`);
  }
  return `${id}${String(byteLength).padStart(2, "0")}${value}`;
}

export interface PixBrCodeParams {
  pixKey: string;
  receiverName: string;
  city?: string | null;
  amount?: number | null;
  txid?: string | null;
  description?: string | null;
}

/**
 * Gera payload estático PIX (EMVCo / BACEN BR Code Copia e Cola).
 */
export function generatePixBrCode({
  pixKey,
  receiverName,
  city,
  amount,
  txid,
  description,
}: PixBrCodeParams): string {
  const cleanKey = pixKey.trim();
  if (!cleanKey) {
    throw new Error("Chave PIX não configurada.");
  }

  const merchantName = sanitizePixText(receiverName || "OBA MANAUS", 25) || "OBA MANAUS";
  const merchantCity = sanitizePixText(city || "MANAUS", 15) || "MANAUS";
  const cleanTxid = sanitizePixTxid(txid);

  // Merchant Account Information (Tag 26)
  let maiContent =
    formatEmvField("00", "br.gov.bcb.pix") + formatEmvField("01", cleanKey);

  if (description) {
    const cleanDesc = sanitizePixText(description, 50);
    if (cleanDesc) {
      const descField = formatEmvField("02", cleanDesc);
      if (UTF8_ENCODER.encode(maiContent + descField).length <= 99) {
        maiContent += descField;
      }
    }
  }

  const fields: string[] = [
    formatEmvField("00", "01"),
    formatEmvField("26", maiContent),
    formatEmvField("52", "0000"),
    formatEmvField("53", "986"),
  ];

  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    fields.push(formatEmvField("54", amount.toFixed(2)));
  }

  fields.push(
    formatEmvField("58", "BR"),
    formatEmvField("59", merchantName),
    formatEmvField("60", merchantCity),
    formatEmvField("62", formatEmvField("05", cleanTxid))
  );

  const payloadWithoutCrc = `${fields.join("")}6304`;
  const crc = computeCrc16Ccitt(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}
