import { useRef, useCallback, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
];

interface UseBarcodeScanner {
  start: (elementId: string) => Promise<void>;
  stop: () => Promise<void>;
  isScanning: boolean;
  error: string | null;
}

function parsePermissionError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
    return 'Camera permission denied. Please allow camera access in your browser settings and try again.';
  }
  if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
    return 'No camera found on this device.';
  }
  if (msg.includes('NotReadableError') || msg.includes('Could not start video source')) {
    return 'Camera is already in use by another app. Close other apps using the camera and try again.';
  }
  return msg || 'Failed to start scanner';
}

export function useBarcodeScanner(onScan: (barcode: string) => void): UseBarcodeScanner {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, []);

  const start = useCallback(
    async (elementId: string) => {
      await stop();
      setError(null);

      try {
        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            onScanRef.current(decodedText);
          },
          () => {
            // Scan failure per frame - ignore
          },
        );
        setIsScanning(true);
      } catch (err) {
        setError(parsePermissionError(err));
        setIsScanning(false);
      }
    },
    [stop],
  );

  return { start, stop, isScanning, error };
}
