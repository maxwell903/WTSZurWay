export type ResizedImage = {
  blob: Blob;
  url: string;
  name: string;
};

export function computeResizedDimensions(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { width, height };
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      type,
      quality,
    );
  });
}

export async function resizeImage(file: File, maxLongEdge = 1568): Promise<ResizedImage> {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);
  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;
  const { width, height } = computeResizedDimensions(sourceWidth, sourceHeight, maxLongEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D canvas context");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const mimeType = file.type?.startsWith("image/") ? file.type : "image/png";
  const blob = await canvasToBlob(canvas, mimeType, 0.92);
  const url = URL.createObjectURL(blob);
  return { blob, url, name: file.name };
}
