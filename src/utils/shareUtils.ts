import JSZip from 'jszip';
import { db } from '../db';
import type { ExportFormat } from '../types';
import { buildImageName, buildImagePath } from './imagePath';

const DELIMITER_MAP: Record<ExportFormat, string> = {
  csv: ',',
  tsv: '\t',
  psv: '|',
};

const MIME_MAP: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8;',
  tsv: 'text/tab-separated-values;charset=utf-8;',
  psv: 'text/plain;charset=utf-8;',
};

export const GMAIL_ATTACHMENT_LIMIT = 25 * 1024 * 1024; // 25 MB

function escapeField(value: string, format: ExportFormat): string {
  if (format === 'tsv') {
    return value.replace(/[\t\n\r]/g, ' ');
  }
  const delimiter = DELIMITER_MAP[format];
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a zip archive of product images for the given product IDs.
 */
export async function buildProductImageZip(productIds: number[]): Promise<Blob> {
  const zip = new JSZip();

  for (const pid of productIds) {
    const product = await db.products.get(pid);
    if (!product) continue;

    const images = await db.images.where('productId').equals(pid).toArray();
    for (const img of images) {
      const folder = product.barcode;
      const ext = 'jpg';
      const filename = `${img.positionTag || 'photo'}-${product.barcode}--${img.capturedAt instanceof Date ? img.capturedAt.getTime() : Date.now()}.${ext}`;
      zip.file(`${folder}/${filename}`, img.blob);
    }
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

/**
 * Build a delimited log file for the given product IDs.
 * Reads directly from products + images tables.
 */
export async function buildLogFile(productIds: number[], format: ExportFormat): Promise<Blob> {
  const delimiter = DELIMITER_MAP[format];
  const escape = (val: string) => escapeField(val, format);

  const headers = [
    'Barcode',
    'MRP',
    'Qty',
    'Brand',
    'Category',
    'Position Tag',
    'Image Name',
    'Image Path',
    'Captured At',
  ];

  const rows: string[][] = [];

  for (const pid of productIds) {
    const product = await db.products.get(pid);
    if (!product) continue;

    const images = await db.images.where('productId').equals(pid).toArray();

    if (images.length === 0) {
      rows.push([
        product.barcode,
        product.mrp || '',
        product.qty != null ? String(product.qty) : '',
        product.brand || '',
        product.category || '',
        '',
        '',
        '',
        product.capturedAt instanceof Date ? product.capturedAt.toISOString() : String(product.capturedAt),
      ]);
    } else {
      for (const img of images) {
        const imageName = buildImageName(img.positionTag, product.barcode);
        const imagePath = buildImagePath(product.barcode, imageName);

        rows.push([
          product.barcode,
          product.mrp || '',
          product.qty != null ? String(product.qty) : '',
          product.brand || '',
          product.category || '',
          img.positionTag,
          imageName,
          imagePath,
          img.capturedAt instanceof Date ? img.capturedAt.toISOString() : String(img.capturedAt),
        ]);
      }
    }
  }

  const lines = [
    headers.map(escape).join(delimiter),
    ...rows.map((r) => r.map(escape).join(delimiter)),
  ];

  return new Blob([lines.join('\n')], { type: MIME_MAP[format] });
}

/**
 * Calculate total size of image blobs for the given product IDs.
 */
export async function calculateImageSize(productIds: number[]): Promise<number> {
  let total = 0;
  for (const pid of productIds) {
    const images = await db.images.where('productId').equals(pid).toArray();
    for (const img of images) {
      total += img.blob.size;
    }
  }
  return total;
}

/**
 * Format byte size to human-readable string.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDateStr(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${now.getFullYear()}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

async function tryNativeShare(files: File[], title: string): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;

  try {
    if (!navigator.canShare({ files })) return false;
    await navigator.share({ files, title });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    return false;
  }
}

/**
 * Share product data. Prefers native share sheet, falls back to download.
 * Strategy: share only the CSV log first (widely supported), then attempt
 * to share the zip separately if native share is available.
 */
export async function shareProducts(
  productIds: number[],
  format: ExportFormat,
  _target: 'email' | 'gdrive' = 'email',
): Promise<{ success: boolean; error?: string }> {
  try {
    const dateStr = getDateStr();

    const logBlob = await buildLogFile(productIds, format);
    const logFile = new File(
      [logBlob],
      `catalogue-${dateStr}.${format}`,
      { type: MIME_MAP[format] },
    );

    // Attempt native share with just the log file first (most compatible)
    const shared = await tryNativeShare(
      [logFile],
      `Product Catalogue - ${dateStr}`,
    );

    if (shared) return { success: true };

    // Native share unavailable — try text-only share (works on iOS standalone)
    if (typeof navigator.share === 'function') {
      try {
        const text = await logBlob.text();
        await navigator.share({
          title: `Product Catalogue - ${dateStr}`,
          text,
        });
        return { success: true };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, error: 'Share cancelled' };
        }
        // Fall through to download
      }
    }

    // Final fallback: download
    downloadBlob(logBlob, `catalogue-${dateStr}.${format}`);
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Share cancelled' };
    }
    return { success: false, error: err instanceof Error ? err.message : 'Share failed' };
  }
}

/**
 * Share with images (zip). Tries native share, falls back to download.
 */
export async function shareProductsWithImages(
  productIds: number[],
  format: ExportFormat,
): Promise<{ success: boolean; error?: string }> {
  try {
    const dateStr = getDateStr();
    const [zipBlob, logBlob] = await Promise.all([
      buildProductImageZip(productIds),
      buildLogFile(productIds, format),
    ]);

    const zipFile = new File([zipBlob], `products-${dateStr}.zip`, { type: 'application/zip' });
    const logFile = new File([logBlob], `catalogue-${dateStr}.${format}`, { type: MIME_MAP[format] });

    // Try sharing both files
    const sharedBoth = await tryNativeShare(
      [logFile, zipFile],
      `Product Catalogue - ${dateStr}`,
    );
    if (sharedBoth) return { success: true };

    // Try sharing just the zip
    const sharedZip = await tryNativeShare(
      [zipFile],
      `Product Images - ${dateStr}`,
    );
    if (sharedZip) return { success: true };

    // Fallback: download both
    downloadBlob(zipBlob, `products-${dateStr}.zip`);
    downloadBlob(logBlob, `catalogue-${dateStr}.${format}`);
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Share cancelled' };
    }
    return { success: false, error: err instanceof Error ? err.message : 'Share failed' };
  }
}
