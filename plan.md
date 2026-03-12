# Lite Catalogue — Project Plan

**Version:** 2.2
**Last Updated:** 2026-03-11

---

## Revision Log

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-03-09 | Initial plan: MD3 redesign, CSV log, OCR, barcode formats, camera permissions, settings persistence |
| 2.0     | 2026-03-10 | Added 6 UX features: photo deletion, product deletion, barcode duplicate merge/separate, editable tags, bottom nav verification, mobile one-hand UX audit |
| 2.1     | 2026-03-11 | Added MRP column to capture log. Added cloud storage upload plan (S3/compatible). Added user documentation |
| 2.2     | 2026-03-11 | Changed file path convention to `/fynd-lite-catalog/{barcode}/{dd-mm-yyyy}/{tag}-{imagename}`. CSV log filename: `{dd-mm-yyyy}.csv`. Deferred cloud upload to later phase |

---

## 1. Architecture

- **Stack:** React 18 + TypeScript + Vite + Tailwind CSS v4
- **Storage:** IndexedDB via Dexie.js (schema v2)
- **Design System:** Material Design 3 with CSS custom properties
- **PWA:** Service worker, offline-first, installable

### Database Tables

| Table       | Indexed Fields |
|-------------|---------------|
| `settings`  | `++id` |
| `products`  | `++id, barcode, syncStatus, capturedAt` |
| `images`    | `++id, productId, positionTag` |
| `captureLog`| `++id, productId, imageId, barcode, capturedAt, uploadStatus` |

---

## 2. Implemented Features

### Phase 1 — MD3 Design System (Complete)
- CSS custom properties for MD3 color roles, shape, typography
- Reusable components: `MD3Button`, `MD3Card`, `MD3Chip`, `MD3Switch`, `MD3TextField`, `MD3TopBar`, `MD3NavigationBar`, `Icon`
- Black frame bars (top bar + bottom nav)
- Safe-area-inset handling for iOS

### Phase 2 — Core Capture Flow (Complete)
- Barcode scanning (html5-qrcode) with multi-format support: QR, EAN-13, EAN-8, UPC-A/E, Code 128/39/93, ITF, Codabar, Data Matrix, PDF-417
- Camera capture with rear-camera preference, switch camera, permission handling with retry
- Three capture modes: Single, Front-Back, Front-Back-More
- Tag selection (preset + custom tags)
- MRP extraction via Tesseract.js OCR
- Full label text extraction (OCR) stored as `ocrText`

### Phase 3 — Product Management (Complete)
- Product list with filter chips (All, Pending, Synced, Errors)
- Product detail view with photo gallery
- **Delete individual photos** from product detail (auto-deletes product if no photos remain)
- **Edit photo tags** on unsynced products (tag picker inline)
- **Multi-select product deletion** via long-press on product list
- **Barcode duplicate handling:** merge photos into existing product or create separate entry

### Phase 4 — CSV Log (Complete)
- Capture log records every photo with: barcode, tag, image name, path, upload status, response, captured date
- Log page with date-range filter and CSV download
- "Last downloaded" timestamp persisted in settings
- **Pending:** Add MRP column to log entries (see Phase 6)

### Phase 5 — Sync (Complete)
- Upload to configurable API endpoint
- Progress overlay with per-image tracking
- Sync status per product (pending/synced/error)
- Log entries updated with upload status/response after sync

---

## 3. Pending Features

### Phase 6 — MRP in Capture Log
**Status:** Planned
- Add `mrp` field to `CaptureLogEntry` type
- DB schema v3: add `mrp` column to captureLog table
- Populate MRP from product when creating log entries in `useProducts.ts`
- Add MRP column to CSV export in `useCaptureLog.ts`
- Add MRP column to CsvLogPage table display

### Phase 7 — Cloud Storage Upload (S3-Compatible)
**Status:** Planned
- Upload product images to S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces, etc.)
- Upload CSV log files to same bucket
- Image path in log updated from `local://` to actual S3 URL after upload
- Settings page: configure bucket, region, access key, endpoint
- See detailed plan in section below

---

## 4. Cloud Upload Plan (Phase 7)

### 4A. Settings & Configuration

New settings fields:
```
storageProvider: 's3' | 'minio' | 'custom'
s3Bucket: string
s3Region: string
s3AccessKey: string
s3SecretKey: string
s3Endpoint?: string          // for MinIO/custom S3-compatible
s3PathPrefix?: string        // e.g. "lite-catalogue/"
autoUploadImages: boolean    // upload on capture vs manual
```

### 4B. New Files

| File | Purpose |
|------|---------|
| `src/services/storageService.ts` | S3 upload logic using presigned URLs or direct PUT |
| `src/hooks/useCloudUpload.ts` | Hook wrapping storageService with progress/status |
| `src/components/CloudUploadButton.tsx` | Upload trigger with progress indicator |

### 4C. Upload Strategy

**Option A — Direct Browser Upload (Recommended for simplicity)**
- Use `@aws-sdk/client-s3` browser bundle (~50KB gzipped)
- Upload directly from browser to S3 using configured credentials
- Pros: no backend needed, works offline-first (queue uploads)
- Cons: credentials stored client-side (acceptable for internal/personal tool)

**Option B — Presigned URL via API**
- Backend endpoint generates presigned PUT URLs
- Browser uploads directly to S3 using presigned URL
- Pros: credentials never leave server
- Cons: requires backend

### 4D. Image Upload Flow

1. User captures product (images stored in IndexedDB)
2. On sync trigger (manual or auto):
   - For each image: upload blob to S3 at `{prefix}/{barcode}/{imageName}`
   - On success: update `captureLog` entry with `imagePath = s3Url`, `uploadStatus = 'success'`
   - On failure: set `uploadStatus = 'failed'`, `uploadResponse = errorMessage`
3. Product `syncStatus` updated to `'synced'` when all images succeed

### 4E. CSV Log Upload

1. User clicks "Upload Log" on Log page (or auto after image uploads)
2. Generate CSV from captureLog entries (with MRP column)
3. Upload CSV to `{prefix}/logs/capture-log-{date}.csv`
4. Update `lastCsvDownloadDate` in settings

### 4F. S3 Bucket Structure
```
{bucket}/
  {prefix}/
    {barcode}/
      {barcode}_Front_1710123456789_0.jpg
      {barcode}_Back_1710123456789_1.jpg
    logs/
      capture-log-2026-03-11.csv
      capture-log-2026-03-12.csv
```

### 4G. Implementation Order
1. Add MRP to capture log (Phase 6) — prerequisite
2. Add storage settings to types + settings page
3. Implement `storageService.ts` with S3 upload
4. Wire into sync flow (`useSync.ts`)
5. Add CSV log upload to CsvLogPage
6. Add upload progress UI

---

## 5. File Map

### New Files (MD3 + Features)
```
src/components/md3/MD3Switch.tsx
src/components/md3/MD3Button.tsx
src/components/md3/MD3Card.tsx
src/components/md3/MD3Chip.tsx
src/components/md3/MD3TopBar.tsx
src/components/md3/MD3NavigationBar.tsx
src/components/md3/MD3TextField.tsx
src/components/md3/Icon.tsx
src/pages/CsvLogPage.tsx
src/hooks/useCaptureLog.ts
```

### Key Modified Files
```
src/index.css              — MD3 tokens
src/db/index.ts            — Schema v2
src/types/index.ts         — Product, CaptureLogEntry, AppSettings
src/App.tsx                — Routes
src/components/Layout.tsx  — MD3 frame bars
src/pages/CapturePage.tsx  — Duplicate merge/separate flow
src/pages/ProductListPage.tsx — Multi-select deletion
src/pages/ProductDetailPage.tsx — Photo delete + tag edit
src/components/ProductCard.tsx — Long-press selection
src/hooks/useProducts.ts   — deleteImage, updateImageTag, findByBarcode, mergeProducts
src/hooks/useCamera.ts     — Permission handling
src/hooks/useBarcodeScanner.ts — Multi-format support
src/hooks/useOcr.ts        — Full text extraction
```

---

## 6. Verification Checklist

- [x] All pages render with MD3 styling
- [x] Black top bar + black bottom nav on all pages
- [x] Settings toggles align correctly
- [x] Barcode scanner supports QR + EAN + UPC + Code128 + more
- [x] OCR extracts MRP + full text
- [x] Camera permission error shows retry button
- [x] CSV log page with date filter + download
- [x] Delete individual photos from product detail
- [x] Edit photo tags on unsynced products
- [x] Multi-select and delete products from list (long-press)
- [x] Duplicate barcode: merge or create separate entry
- [x] Bottom nav works on mobile
- [x] `npm run build` passes clean
- [ ] MRP column in capture log
- [ ] Cloud storage upload (S3)
- [ ] CSV log upload to cloud
