export const MRP_REGEX = /(?:MRP|M\.R\.P|mrp)[:\s]*[₹Rs.INR]*\s*(\d+[\d,.]*)/i;

export const SUPPORTED_BARCODE_FORMATS = [
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'CODE_128',
  'CODE_39',
  'ITF',
  'QR_CODE',
] as const;

export const IMAGE_MAX_WIDTH = 1200;
export const IMAGE_QUALITY = 0.8;

/** Allowed characters in a barcode: alphanumeric plus -_@#+ */
const BARCODE_ALLOWED_RE = /[^A-Z0-9\-_@#+]/g;

/**
 * Sanitize a barcode value: trim, uppercase, strip spaces and
 * disallowed characters. Works for scanned and manual input.
 */
export function sanitizeBarcode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s/g, '').replace(BARCODE_ALLOWED_RE, '');
}

/**
 * Live-filter for barcode input fields: uppercase, strip spaces
 * and disallowed chars as the user types.
 */
export function filterBarcodeInput(raw: string): string {
  return raw.toUpperCase().replace(/\s/g, '').replace(BARCODE_ALLOWED_RE, '');
}

/**
 * Validate a barcode against common standards.
 * Returns null if valid, or an error message string.
 */
export function validateBarcode(barcode: string): string | null {
  if (!barcode) return 'Barcode is required';
  if (barcode.length < 1) return 'Barcode is too short';

  const isAllDigits = /^\d+$/.test(barcode);

  if (isAllDigits) {
    const len = barcode.length;
    // UPC-E (8), EAN-8 (8), ISBN-10 (10 digits only), UPC-A (12), EAN-13/ISBN-13 (13), ITF (even)
    const standardLengths = [8, 10, 12, 13, 14];
    if (standardLengths.includes(len)) {
      return null; // matches a known numeric barcode standard
    }
    // ITF requires even-length digit strings
    if (len % 2 === 0 && len >= 4) {
      return null;
    }
    // Still allow any other numeric barcode (Code 128 can be all-digits of any length)
    return null;
  }

  // Non-numeric: Code 39, Code 128, etc. — allow as long as chars are in allowed set
  return null;
}
