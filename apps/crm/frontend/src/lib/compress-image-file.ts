/** Compress an image file to a JPEG data URL suitable for menu item storage. */
export async function compressImageFileToDataUrl(
  file: File,
  opts?: { maxEdge?: number; quality?: number },
): Promise<string> {
  const maxEdge = opts?.maxEdge ?? 1280;
  const quality = opts?.quality ?? 0.82;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (dataUrl.length > 2_400_000) {
    return canvas.toDataURL("image/jpeg", 0.65);
  }
  return dataUrl;
}
