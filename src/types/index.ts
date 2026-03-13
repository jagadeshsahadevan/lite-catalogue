export type CaptureMode = 'single' | 'front-back' | 'front-back-more';
export type ExportFormat = 'csv' | 'tsv' | 'psv';
export type ViewMode = 'grid' | 'list';
export type DateFilterOp = 'equal' | 'gte' | 'between';
export type CustomFieldType = 'text' | 'date' | 'dropdown';

export interface DateFilter {
  op: DateFilterOp;
  date: string;
  dateTo?: string;
}

export interface CustomFieldDef {
  id: string;
  name: string;
  type: CustomFieldType;
  enabled: boolean;
  options?: string[];
}

export const BUILTIN_FIELD_IDS = ['mrp', 'qty', 'brand', 'category'] as const;
export type BuiltinFieldId = (typeof BUILTIN_FIELD_IDS)[number];

export interface AppSettings {
  id?: number;
  captureMode: CaptureMode;
  askMrp: boolean;
  askQty: boolean;
  askBrand: boolean;
  askCategory: boolean;
  apiEndpoint: string;
  customTags: string[];
  setupComplete: boolean;
  onboardingComplete: boolean;
  brandName: string;
  phoneNumber: string;
  hapticFeedback: boolean;
  autoMrpDetection: boolean;
  lastCsvDownloadDate?: string | null;
  customFields: CustomFieldDef[];
  fieldOrder: string[];
}

/** Keys included in settings download/load (capture mode, field config, field order, field enum, haptic, etc.) */
export const SETTINGS_EXPORT_KEYS: (keyof Omit<AppSettings, 'id'>)[] = [
  'captureMode',
  'askMrp',
  'askQty',
  'askBrand',
  'askCategory',
  'fieldOrder',
  'customFields', // includes field enum (dropdown options)
  'hapticFeedback',
  'autoMrpDetection',
  'customTags',
  'brandName',
  'phoneNumber',
  'apiEndpoint',
  'setupComplete',
  'onboardingComplete',
  'lastCsvDownloadDate',
];

export interface Product {
  id?: number;
  barcode: string;
  mrp: string | null;
  qty?: number | null;
  brand?: string | null;
  category?: string | null;
  customData?: Record<string, string | null>;
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
  captureMode: 'front-back-more',
  askMrp: true,
  askQty: false,
  askBrand: false,
  askCategory: false,
  apiEndpoint: '',
  customTags: [],
  setupComplete: false,
  onboardingComplete: false,
  brandName: '',
  phoneNumber: '',
  hapticFeedback: true,
  autoMrpDetection: false,
  lastCsvDownloadDate: null,
  customFields: [],
  fieldOrder: ['mrp', 'qty', 'brand', 'category'],
};

export const PRESET_TAGS = ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom', 'Label', 'Barcode'];
