import JSZip from 'jszip';
import { db } from '../db';
import type { ExportFormat } from '../types';
import { buildImageName, buildImagePath } from './imagePath';

const DELIMITER_MAP: Record<ExportFormat, string> = {
  csv: ',',
  tsv: '\t',
  psv: '|',
};

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

async function buildLogContent(productIds: number[], format: ExportFormat): Promise<string> {
  const delimiter = DELIMITER_MAP[format];
  const escape = (val: string) => escapeField(val, format);

  const headers = [
    'Barcode', 'MRP', 'Qty', 'Brand', 'Category',
    'Position Tag', 'Image Name', 'Image Path', 'Captured At',
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
        '', '', '',
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

  return lines.join('\n');
}

/**
 * Build a single zip containing product images (in barcode folders)
 * AND the catalogue CSV at the root.
 */
async function buildCatalogueZip(productIds: number[], format: ExportFormat): Promise<Blob> {
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

  const logContent = await buildLogContent(productIds, format);
  const dateStr = getDateStr();
  zip.file(`catalogue-${dateStr}.${format}`, logContent);

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export interface ShareResult {
  success: boolean;
  error?: string;
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

/**
 * Share products as a single zip (images + CSV inside).
 * Tries native share first, falls back to download.
 */
export async function shareProducts(
  productIds: number[],
  format: ExportFormat = 'csv',
): Promise<ShareResult> {
  try {
    const dateStr = getDateStr();
    const zipBlob = await buildCatalogueZip(productIds, format);
    const filename = `catalogue-${dateStr}.zip`;
    const zipFile = new File([zipBlob], filename, { type: 'application/zip' });

    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      try {
        if (navigator.canShare({ files: [zipFile] })) {
          await navigator.share({ files: [zipFile], title: `Product Catalogue - ${dateStr}` });
          return { success: true };
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, error: 'Share cancelled' };
        }
      }
    }

    downloadBlob(zipBlob, filename);
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Share cancelled' };
    }
    return { success: false, error: err instanceof Error ? err.message : 'Share failed' };
  }
}
