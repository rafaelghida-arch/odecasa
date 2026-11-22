import "server-only";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB por imagem
export const MAX_REQUEST_BYTES = 4_400_000; // abaixo do limite de 4,5 MB da Vercel

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export class ImageValidationError extends Error {}

/** Detecta o formato real pelos primeiros bytes (não confia no nome nem no tipo enviado). */
export function sniffImageType(bytes: Uint8Array): ImageMediaType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return "image/webp";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  return null;
}

export interface ValidImage {
  mediaType: ImageMediaType;
  base64: string;
}

export async function readImage(value: FormDataEntryValue | null): Promise<ValidImage | null> {
  if (value === null) return null;
  if (typeof value === "string") throw new ImageValidationError("Anexo inválido.");
  if (value.size === 0) return null;
  if (value.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("A foto passou de 4 MB. Tenta uma foto menor.");
  }
  const bytes = new Uint8Array(await value.arrayBuffer());
  const mediaType = sniffImageType(bytes);
  if (!mediaType) {
    throw new ImageValidationError("Formato não aceito. Envie JPG, PNG, WEBP ou GIF.");
  }
  return { mediaType, base64: Buffer.from(bytes).toString("base64") };
}
