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

export type ShareMode = 'both' | 'images' | 'csv';

export interface ShareResult {
  success: boolean;
  error?: string;
  needsFallback?: boolean;
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

async function tryNativeShare(files: File[], title: string): Promise<'shared' | 'unsupported' | 'cancelled'> {
  if (typeof navigator.share !== 'function') return 'unsupported';
  if (typeof navigator.canShare !== 'function') return 'unsupported';

  try {
    if (!navigator.canShare({ files })) return 'unsupported';
    await navigator.share({ files, title });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

/**
 * Share products. Default mode is 'both' (zip + CSV).
 * Returns { needsFallback: true } when native share can't handle the files,
 * so the UI can show a picker dialog.
 */
export async function shareProducts(
  productIds: number[],
  format: ExportFormat,
  mode: ShareMode = 'both',
): Promise<ShareResult> {
  try {
    const dateStr = getDateStr();

    if (mode === 'both' || mode === 'images') {
      const zipBlob = await buildProductImageZip(productIds);
      const logBlob = mode === 'both' ? await buildLogFile(productIds, format) : null;

      const zipFile = new File([zipBlob], `products-${dateStr}.zip`, { type: 'application/zip' });
      const logFile = logBlob
        ? new File([logBlob], `catalogue-${dateStr}.${format}`, { type: MIME_MAP[format] })
        : null;

      const filesToShare = logFile ? [logFile, zipFile] : [zipFile];
      const result = await tryNativeShare(filesToShare, `Product Catalogue - ${dateStr}`);

      if (result === 'shared') return { success: true };
      if (result === 'cancelled') return { success: false, error: 'Share cancelled' };

      // If sharing both failed, try just the zip
      if (logFile) {
        const zipOnly = await tryNativeShare([zipFile], `Product Images - ${dateStr}`);
        if (zipOnly === 'shared') return { success: true };
        if (zipOnly === 'cancelled') return { success: false, error: 'Share cancelled' };
      }

      // Native share unsupported for these files
      if (mode === 'both') {
        return { success: false, needsFallback: true };
      }

      // mode === 'images', download directly
      downloadBlob(zipBlob, `products-${dateStr}.zip`);
      return { success: true };
    }

    // mode === 'csv'
    const logBlob = await buildLogFile(productIds, format);
    const logFile = new File([logBlob], `catalogue-${dateStr}.${format}`, { type: MIME_MAP[format] });

    const result = await tryNativeShare([logFile], `Product Catalogue - ${dateStr}`);
    if (result === 'shared') return { success: true };
    if (result === 'cancelled') return { success: false, error: 'Share cancelled' };

    // Try text-only share (iOS standalone)
    if (typeof navigator.share === 'function') {
      try {
        const text = await logBlob.text();
        await navigator.share({ title: `Product Catalogue - ${dateStr}`, text });
        return { success: true };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, error: 'Share cancelled' };
        }
      }
    }

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
 * Download files directly (fallback when native share is unsupported).
 */
export async function downloadProducts(
  productIds: number[],
  format: ExportFormat,
  mode: ShareMode,
): Promise<void> {
  const dateStr = getDateStr();

  if (mode === 'both' || mode === 'images') {
    const zipBlob = await buildProductImageZip(productIds);
    downloadBlob(zipBlob, `products-${dateStr}.zip`);
  }

  if (mode === 'both' || mode === 'csv') {
    const logBlob = await buildLogFile(productIds, format);
    downloadBlob(logBlob, `catalogue-${dateStr}.${format}`);
  }
}
