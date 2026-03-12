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
