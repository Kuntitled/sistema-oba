import { createClient } from "@/lib/supabase/client";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_DIMENSION = 400;
const AVATAR_QUALITY = 0.75;
const MAX_INPUT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB antes de comprimir

interface ImageDimensions {
  width: number;
  height: number;
  draw: (
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dw: number,
    dh: number
  ) => void;
  cleanup: () => void;
}

async function loadImageSource(file: File): Promise<ImageDimensions> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, sx, sy, sw, sh, dw, dh) => {
          ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
        },
        cleanup: () => {
          bitmap.close();
        },
      };
    } catch {
      // Fallback para HTMLImageElement caso createImageBitmap falhe neste formato
    }
  }

  return await new Promise<ImageDimensions>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: (ctx, sx, sy, sw, sh, dw, dh) => {
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
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

export async function compressAvatarToBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido (JPG, PNG ou WebP).");
  }

  if (file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error("A imagem original excede o limite de 10 MB.");
  }

  const source = await loadImageSource(file);

  try {
    const side = Math.min(source.width, source.height);
    if (side <= 0) {
      throw new Error("Dimensões da imagem inválidas.");
    }

    const sx = Math.floor((source.width - side) / 2);
    const sy = Math.floor((source.height - side) / 2);
    const targetSize = Math.min(side, MAX_AVATAR_DIMENSION);

    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Seu navegador não suporta processamento de imagem via Canvas.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    source.draw(ctx, sx, sy, side, side, targetSize, targetSize);

    const webpBlob = await canvasToBlob(canvas, "image/webp", AVATAR_QUALITY);
    if (webpBlob && webpBlob.type === "image/webp") {
      return webpBlob;
    }

    const jpegBlob = await canvasToBlob(canvas, "image/jpeg", AVATAR_QUALITY);
    if (jpegBlob) {
      return jpegBlob;
    }

    throw new Error("Falha ao converter a imagem para envio.");
  } finally {
    source.cleanup();
  }
}

export async function uploadBladerAvatar(
  userId: string,
  file: File
): Promise<{ publicUrl: string; sizeKb: number }> {
  const compressedBlob = await compressAvatarToBlob(file);
  const supabase = createClient();
  const objectPath = `${userId}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, compressedBlob, {
      upsert: true,
      contentType: compressedBlob.type || "image/webp",
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Erro ao enviar foto: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(objectPath);

  const separator = data.publicUrl.includes("?") ? "&" : "?";
  return {
    publicUrl: `${data.publicUrl}${separator}v=${Date.now()}`,
    sizeKb: Math.max(1, Math.round(compressedBlob.size / 1024)),
  };
}
