const PROCESS_WIDTH = 640;

export function captureFrame(
  video: HTMLVideoElement,
  maxWidth = PROCESS_WIDTH,
): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return canvas;
}

/**
 * In-place contrast stretch + unsharp mask to improve decode rate
 * on faded, low-contrast, and slightly blurred barcodes.
 */
export function enhanceForBarcode(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  const n = width * height;

  // BT.601 grayscale using integer arithmetic
  const gray = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    gray[i] = (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
  }

  // Histogram-based contrast stretch (1 % clip at each tail)
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[gray[i]]++;

  const clip = Math.max(1, (n * 0.01) | 0);
  let lo = 0;
  let hi = 255;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= clip) { lo = i; break; }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc >= clip) { hi = i; break; }
  }

  if (hi - lo > 10) {
    const s = 255 / (hi - lo);
    for (let i = 0; i < n; i++) {
      const v = ((gray[i] - lo) * s) | 0;
      gray[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }

  // 3x3 box blur (input for unsharp mask)
  const blur = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y < height - 1 ? y + 1 : y;
    for (let x = 0; x < width; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < width - 1 ? x + 1 : x;
      let sum = 0;
      let cnt = 0;
      for (let r = y0; r <= y1; r++) {
        const row = r * width;
        for (let c = x0; c <= x1; c++) {
          sum += gray[row + c];
          cnt++;
        }
      }
      blur[y * width + x] = (sum / cnt) | 0;
    }
  }

  // Unsharp mask: enhanced = original + strength * (original - blurred)
  const strength = 1.5;
  for (let i = 0; i < n; i++) {
    const v = gray[i] + strength * (gray[i] - blur[i]);
    const c = v < 0 ? 0 : v > 255 ? 255 : v | 0;
    const o = i << 2;
    d[o] = c;
    d[o + 1] = c;
    d[o + 2] = c;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Fast average brightness of the video feed (sampled at very low resolution).
 * Returns 0-255; values below ~55 indicate a low-light scene.
 */
export function averageBrightness(video: HTMLVideoElement): number {
  if (!video.videoWidth) return 128;
  const w = 80;
  const h = Math.max(1, Math.round(video.videoHeight * (w / video.videoWidth)));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 128;
  ctx.drawImage(video, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 16) {
    sum += (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    count++;
  }
  return count > 0 ? sum / count : 128;
}

export function canvasToFile(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(new File([blob], 'frame.jpg', { type: 'image/jpeg' }));
        else reject(new Error('Failed to convert canvas to blob'));
      },
      'image/jpeg',
      0.85,
    );
  });
}

export function rotateCanvas(
  source: HTMLCanvasElement,
  degrees: number,
): HTMLCanvasElement {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = Math.round(source.width * cos + source.height * sin);
  const h = Math.round(source.width * sin + source.height * cos);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return out;
}
