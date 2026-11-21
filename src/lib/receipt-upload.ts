import { createClient } from "@/lib/supabase/client";

export const RECEIPTS_BUCKET = "receipts";
const MAX_RECEIPT_DIMENSION = 1600;
const RECEIPT_IMAGE_QUALITY = 0.8;
const MAX_IMAGE_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB antes de comprimir
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB teto do bucket

export function isReceiptPdfPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const clean = path.split("?")[0]?.toLowerCase() ?? "";
  return clean.endsWith(".pdf");
}

interface ImageDimensions {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, dw: number, dh: number) => void;
  cleanup: () => void;
}

async function loadImageSource(file: File): Promise<ImageDimensions> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, dw, dh) => {
          ctx.drawImage(bitmap, 0, 0, dw, dh);
        },
        cleanup: () => {
          bitmap.close();
        },
      };
    } catch {
      // Fallback para HTMLImageElement caso createImageBitmap falhe
    }
  }

  return await new Promise<ImageDimensions>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, dw, dh) => {
          ctx.drawImage(img, 0, 0, dw, dh);
        },
        cleanup: () => {
          URL.revokeObjectURL(objectUrl);
        },
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem selecionada."));
    };

    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export async function compressReceiptImage(
  file: File
): Promise<{ blob: Blob; ext: "webp" | "jpg"; mimeType: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error(
      "Formato inválido. Envie uma imagem (JPG, PNG, WebP) ou PDF."
    );
  }

  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    throw new Error("A imagem original excede o limite de 10 MB.");
  }

  const source = await loadImageSource(file);

  try {
    if (source.width <= 0 || source.height <= 0) {
      throw new Error("Dimensões da imagem inválidas.");
    }

    const largestSide = Math.max(source.width, source.height);
    const scale =
      largestSide > MAX_RECEIPT_DIMENSION
        ? MAX_RECEIPT_DIMENSION / largestSide
        : 1;

    const targetWidth = Math.max(1, Math.round(source.width * scale));
    const targetHeight = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error(
        "Seu navegador não suporta processamento de imagem via Canvas."
      );
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    source.draw(ctx, targetWidth, targetHeight);

    const webpBlob = await canvasToBlob(
      canvas,
      "image/webp",
      RECEIPT_IMAGE_QUALITY
    );
    if (webpBlob && webpBlob.type === "image/webp") {
      if (webpBlob.size > MAX_UPLOAD_BYTES) {
        throw new Error(
          "A imagem comprimida ainda excede o limite de 5 MB."
        );
      }
      return { blob: webpBlob, ext: "webp", mimeType: "image/webp" };
    }

    const jpegBlob = await canvasToBlob(
      canvas,
      "image/jpeg",
      RECEIPT_IMAGE_QUALITY
    );
    if (jpegBlob) {
      if (jpegBlob.size > MAX_UPLOAD_BYTES) {
        throw new Error(
          "A imagem comprimida ainda excede o limite de 5 MB."
        );
      }
      return { blob: jpegBlob, ext: "jpg", mimeType: "image/jpeg" };
    }

    throw new Error("Falha ao processar a imagem do comprovante.");
  } finally {
    source.cleanup();
  }
}

export async function uploadTournamentReceipt(params: {
  tournamentId: string;
  userId: string;
  file: File;
  previousPath?: string | null;
}): Promise<{ path: string; sizeKb: number; mimeType: string }> {
  const { tournamentId, userId, file, previousPath } = params;

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  let uploadBody: Blob;
  let ext: string;
  let mimeType: string;

  if (isPdf) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("O arquivo PDF do comprovante excede o limite de 5 MB.");
    }
    uploadBody = file;
    ext = "pdf";
    mimeType = "application/pdf";
  } else if (file.type.startsWith("image/")) {
    const compressed = await compressReceiptImage(file);
    uploadBody = compressed.blob;
    ext = compressed.ext;
    mimeType = compressed.mimeType;
  } else {
    throw new Error(
      "Envie um arquivo de imagem (JPG, PNG, WebP) ou PDF de até 5 MB."
    );
  }

  const objectPath = `${tournamentId}/${userId}/receipt.${ext}`;
  const supabase = createClient();

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(objectPath, uploadBody, {
      upsert: true,
      contentType: mimeType,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Erro ao enviar comprovante: ${uploadError.message}`);
  }

  if (previousPath && previousPath !== objectPath) {
    try {
      await supabase.storage.from(RECEIPTS_BUCKET).remove([previousPath]);
    } catch {
      // Falha ao limpar arquivo antigo não impede o novo upload
    }
  }

  return {
    path: objectPath,
    sizeKb: Math.max(1, Math.round(uploadBody.size / 1024)),
    mimeType,
  };
}
