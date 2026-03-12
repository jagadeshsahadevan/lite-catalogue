/**
 * Build image name using epoch timestamp.
 * Format: {tag}-{barcode}--{epoch}
 */
export function buildImageName(tag: string, barcode: string): string {
  const safeTag = tag || 'photo';
  return `${safeTag}-${barcode}--${Date.now()}`;
}

/**
 * Build full image path.
 * Format: /fynd-lite-catalog/{barcode}/{imageName}
 */
export function buildImagePath(barcode: string, imageName: string): string {
  return `/fynd-lite-catalog/${barcode}/${imageName}`;
}
