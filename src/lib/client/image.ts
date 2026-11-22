"use client";

const MAX_SIDE = 1600;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_CLIENT_BYTES = 4 * 1024 * 1024;

export class ClientImageError extends Error {}

/**
 * Reduz a foto no navegador (até 1600 px, JPEG) antes do envio.
 * Isso também remove metadados como localização (EXIF).
 */
export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new ClientImageError("Esse arquivo não é uma imagem. Envie JPG, PNG ou WEBP.");
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("no-blob");
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    // Não deu para converter (ex.: HEIC em navegador sem suporte).
    if (ACCEPTED.includes(file.type) && file.size <= MAX_CLIENT_BYTES) return file;
    throw new ClientImageError("Não consegui abrir essa foto. Tenta outra em JPG ou PNG.");
  }
}

/** Indica se há câmera no aparelho. Em caso de dúvida, assume que sim. */
export async function hasCamera(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return true;
    const devices = await navigator.mediaDevices.enumerateDevices();
    if (devices.length === 0) return true;
    return devices.some((d) => d.kind === "videoinput");
  } catch {
    return true;
  }
}
