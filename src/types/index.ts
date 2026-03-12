export type CaptureMode = 'single' | 'front-back' | 'front-back-more';
export type ExportFormat = 'csv' | 'tsv' | 'psv';
export type ViewMode = 'grid' | 'list';
export type DateFilterOp = 'equal' | 'gte' | 'between';

export interface DateFilter {
  op: DateFilterOp;
  date: string;
  dateTo?: string;
}

export interface AppSettings {
  id?: number;
  captureMode: CaptureMode;
  askMrp: boolean;
  askQty: boolean;
  apiEndpoint: string;
  customTags: string[];
  setupComplete: boolean;
  lastCsvDownloadDate?: string | null;
}

export interface Product {
  id?: number;
  barcode: string;
  mrp: string | null;
  qty?: number | null;
  capturedAt: Date;
}

export interface ProductImage {
  id?: number;
  productId: number;
  blob: Blob;
  positionTag: string;
  capturedAt: Date;
}

export interface CapturedImage {
  blob: Blob;
  tag: string;
}

export interface DuplicateInfo {
  product: Product;
  thumbBlob: Blob | null;
  imageCount: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  captureMode: 'single',
  askMrp: true,
  askQty: false,
  apiEndpoint: '',
  customTags: [],
  setupComplete: false,
  lastCsvDownloadDate: null,
};

export const PRESET_TAGS = ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom', 'Label', 'Barcode'];
