# Lite Catalogue — User Guide

**Version:** 2.1 | **Updated:** 2026-03-11

---

## Getting Started

Lite Catalogue is a mobile-first PWA for cataloguing products by scanning barcodes and taking photos. It works entirely offline — all data is stored on your device until you sync.

### Installation
1. Open the app URL in Chrome (Android) or Safari (iOS)
2. Tap "Add to Home Screen" / "Install" when prompted
3. The app works fully offline after first load

### First-Time Setup
On first launch you'll see the **Setup** screen:
1. **Capture Mode** — Choose how many photos per product:
   - **Single:** One photo per product
   - **Front-Back:** Two photos (front then back)
   - **Front-Back-More:** Two required + unlimited additional with custom tags
2. **Ask MRP** — Toggle ON to extract MRP (price) from product labels via OCR
3. **API Endpoint** — Enter your sync server URL (can be set later in Settings)
4. Tap **Start Cataloguing**

---

## Capturing Products

### Step 1: Scan Barcode
- Point your camera at a barcode — it auto-detects
- Or tap **Enter Manually** to type the barcode number
- Phone vibrates on successful scan

#### Supported Barcode Formats

**1D Barcodes:**
| Format | Common Use |
|--------|-----------|
| UPC-A | US/Canada retail products |
| UPC-E | Compressed UPC for small packages |
| EAN-13 | International retail (13-digit) |
| EAN-8 | Small packages (8-digit) |
| Code 128 | Shipping, logistics, general purpose |
| Code 39 | Automotive, defense, healthcare |
| Code 93 | Logistics, inventory |
| ITF (Interleaved 2 of 5) | Carton labels, warehousing |
| Codabar | Libraries, blood banks, parcels |
| GS1 DataBar (RSS-14) | Fresh produce, coupons, small items |
| GS1 DataBar Expanded | Variable-weight items, coupons with extra data |
| UPC/EAN Extensions | 2- or 5-digit add-ons (magazines, books) |

**2D Barcodes:**
| Format | Common Use |
|--------|-----------|
| QR Code | General purpose, URLs, product info |
| GS1 QR Code | Product traceability with GS1 Application Identifiers |
| Data Matrix | Electronics, healthcare, small-part marking |
| PDF-417 | ID cards, shipping labels, government docs |
| Aztec | Boarding passes, transport tickets |
| MaxiCode | UPS package sorting |

### Step 2: Duplicate Barcode Handling
If the scanned barcode already exists, you'll see options:
- **Merge** — Add new photos to the existing product. Photos with the same tag (e.g. "Front") replace the older version
- **Create Separate Entry** — Creates a new product entry with the same barcode
- **Cancel** — Go back to scanning

### Step 3: Take Photos
- The camera opens with a large capture button at the bottom (easy thumb reach)
- Tap the **swap icon** (left of capture button) to switch front/rear camera
- In **Front-Back** mode: you'll be prompted for Front first, then Back
- In **Front-Back-More** mode: after Front and Back, keep adding photos and tag each one. Tap **Done Adding Photos** when finished

### Step 4: Tag Photos (Front-Back-More mode)
After each extra photo, pick a tag:
- Preset tags: Front, Back, Left, Right, Top, Bottom, Label, Barcode
- Any custom tags you've added in Settings

### Step 5: MRP Extraction (if enabled)
- The app runs OCR on your first photo to find the MRP (price)
- The detected value appears pre-filled — edit if needed
- Tap **Confirm** or **Skip** to proceed

### Step 6: Confirmation
Review your captured product:
- Barcode number
- MRP value
- All photos with tags
- Tap **Save & Next** to save and scan another product
- Tap **Save & Done** to save and go to the Products list

---

## Products List

### Viewing Products
- Shows all captured products as a photo grid
- Each card shows: thumbnail, barcode, MRP, sync status badge
- Filter by status using chips at the top: **All**, **Pending**, **Synced**, **Errors**

### Opening a Product
Tap any product card to view its full details — all photos, barcode, MRP, OCR text.

### Deleting Products (Multi-Select)
1. **Long-press** any product card to enter selection mode (phone vibrates)
2. Tap more cards to add to selection
3. The header shows the count of selected items
4. Tap the red **Delete** button to delete all selected products
5. Tap **X** to exit selection mode without deleting

---

## Product Detail

### Viewing Photos
All photos are displayed with their tag labels. Scroll horizontally if many photos.

### Deleting a Photo
- Tap the red **X** button on any photo to delete it
- If you delete the last photo, the entire product is deleted automatically

### Editing Photo Tags
- Available only for **unsynced** products (Pending or Error status)
- Tap the tag label below any photo
- A tag picker appears — select the new tag
- Tags are updated immediately

### Extracted Text
If OCR was enabled, the full extracted text from the product label appears in an expandable "Extracted Text" section.

---

## Capture Log

Navigate to the **Log** tab in the bottom navigation.

### What's Logged
Every photo capture creates a log entry with:
- Barcode
- Photo tag (Front, Back, etc.)
- Image name and path
- Upload status (Pending / Success / Failed)
- Upload response (server response after sync)
- Capture date/time

### Filtering
- Set **From** and **To** dates to filter entries by capture date
- Tap **Filter** to apply

### Downloading CSV
- Tap **Download CSV** to export the filtered log as a `.csv` file
- The "Last downloaded" timestamp updates after each download

---

## Settings

Access via the **Settings** tab in the bottom navigation.

### Capture Mode
Change how many photos are taken per product (Single / Front-Back / Front-Back-More).

### Ask MRP
Toggle OCR-based MRP extraction on or off.

### API Endpoint
Set or change the server URL for syncing products.

### Custom Tags
Add custom tag names for the Front-Back-More capture mode (in addition to the 8 preset tags).

### Sync
Tap the **Sync** button to upload all pending products to your API endpoint. A progress overlay shows per-image upload status.

---

## Syncing Products

1. Configure your API endpoint in Settings
2. Tap **Sync** on the Settings page
3. The app uploads each product's images to the server
4. Progress overlay shows upload status per image
5. Products update to "Synced" on success or "Error" on failure
6. The capture log entries also update with upload status and server response

---

## Camera Permissions

If camera access is denied:
1. An error message appears with a **Grant Camera Permission** button
2. Tapping it re-requests permission from the browser
3. On Android: you may need to go to browser Settings > Site Settings > Camera
4. On iOS Safari: Settings > Safari > Camera > Allow

---

## Tips for Mobile / One-Hand Use

- The **capture button** is centered at the bottom of the screen for easy thumb reach
- **Bottom navigation** tabs are within thumb range
- **Long-press** to select products (no small checkboxes to tap)
- **Scan** is the default landing page — just open and point at a barcode
- All action buttons are placed at the bottom of their respective screens

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not starting | Check browser permissions. Tap "Grant Camera Permission" retry button |
| Barcode not scanning | Ensure good lighting. Try holding steadier. Use manual entry as fallback |
| OCR wrong MRP | Edit the value manually on the MRP screen before confirming |
| Sync failing | Check API endpoint URL in Settings. Ensure server is reachable |
| App not installing | Use Chrome on Android or Safari on iOS. Look for "Install" or "Add to Home Screen" |
