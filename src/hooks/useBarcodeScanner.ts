import { useRef, useCallback, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  captureFrame,
  enhanceForBarcode,
  canvasToFile,
  rotateCanvas,
  averageBrightness,
} from '../utils/barcodeImageEnhancer';

const SUPPORTED_FORMATS = [
  // 2D
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.MAXICODE,
  // 1D — EAN / UPC family
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  // 1D — Code family
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  // 1D — Other
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  // GS1 DataBar (RSS) — used for GS1-128 / GS1 DataBar barcodes
  Html5QrcodeSupportedFormats.RSS_14,
  Html5QrcodeSupportedFormats.RSS_EXPANDED,
];

const BARCODE_DETECTOR_FORMATS = [
  // 2D
  'qr_code', 'data_matrix', 'pdf417', 'aztec',
  // 1D — EAN / UPC
  'ean_13', 'ean_8', 'upc_a', 'upc_e',
  // 1D — Code family
  'code_128', 'code_39', 'code_93',
  // 1D — Other
  'itf', 'codabar',
] as const;

const ENHANCED_DECODE_MS = 250;
const LOW_BRIGHTNESS_THRESHOLD = 55;
const BRIGHTNESS_CHECK_MS = 2000;
const DUPLICATE_SUPPRESS_MS = 2000;

export interface UseBarcodeScanner {
  start: (elementId: string) => Promise<void>;
  stop: () => Promise<void>;
  isScanning: boolean;
  error: string | null;
  torchOn: boolean;
  torchSupported: boolean;
  toggleTorch: () => Promise<void>;
  scanStartedAt: number | null;
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

function getVideoElement(elementId: string): HTMLVideoElement | null {
  return document.querySelector(`#${elementId} video`) as HTMLVideoElement | null;
}

async function tryDecodeCanvas(
  canvas: HTMLCanvasElement,
  detector: BarcodeDetector | null,
  fallbackScanner: Html5Qrcode | null,
): Promise<string | null> {
  if (detector) {
    try {
      const results = await detector.detect(canvas);
      if (results.length > 0 && results[0].rawValue) return results[0].rawValue;
    } catch { /* non-fatal */ }
    return null;
  }

  if (fallbackScanner) {
    try {
      const file = await canvasToFile(canvas);
      return await fallbackScanner.scanFile(file, false);
    } catch { /* no barcode found */ }
  }
  return null;
}

export function useBarcodeScanner(onScan: (barcode: string) => void): UseBarcodeScanner {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const enhancedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const brightnessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enhancedScannerRef = useRef<Html5Qrcode | null>(null);
  const enhancedElRef = useRef<HTMLDivElement | null>(null);
  const decodingRef = useRef(false);
  const lastDecodedRef = useRef<{ text: string; time: number } | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null);

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const torchOnRef = useRef(torchOn);
  torchOnRef.current = torchOn;

  const emitDeduplicated = useCallback((text: string) => {
    const now = Date.now();
    const last = lastDecodedRef.current;
    if (last && last.text === text && now - last.time < DUPLICATE_SUPPRESS_MS) return;
    lastDecodedRef.current = { text, time: now };
    onScanRef.current(text);
  }, []);

  const cleanupEnhancedPipeline = useCallback(() => {
    if (enhancedTimerRef.current) {
      clearInterval(enhancedTimerRef.current);
      enhancedTimerRef.current = null;
    }
    if (brightnessTimerRef.current) {
      clearInterval(brightnessTimerRef.current);
      brightnessTimerRef.current = null;
    }
    enhancedScannerRef.current = null;
    if (enhancedElRef.current) {
      enhancedElRef.current.remove();
      enhancedElRef.current = null;
    }
    decodingRef.current = false;
  }, []);

  const stop = useCallback(async () => {
    cleanupEnhancedPipeline();
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
      trackRef.current = null;
      setIsScanning(false);
      setTorchOn(false);
      setTorchSupported(false);
      setScanStartedAt(null);
    }
  }, [cleanupEnhancedPipeline]);

  const applyAdvancedTrackConstraints = useCallback(async (track: MediaStreamTrack) => {
    try {
      const caps = track.getCapabilities?.() as Record<string, unknown> | undefined;
      const advanced: Record<string, unknown> = {};
      if (caps?.focusMode) advanced.focusMode = 'continuous';
      if (caps?.exposureMode) advanced.exposureMode = 'continuous';
      if (caps?.whiteBalanceMode) advanced.whiteBalanceMode = 'continuous';
      if (Object.keys(advanced).length > 0) {
        await track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] });
      }
    } catch {
      // Not all browsers/devices support these constraints
    }
  }, []);

  const enableTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track || torchOnRef.current) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
      setTorchOn(true);
    } catch {
      // torch not available
    }
  }, []);

  const startEnhancedPipeline = useCallback((elementId: string) => {
    let detector: BarcodeDetector | null = null;
    if ('BarcodeDetector' in window) {
      try {
        detector = new BarcodeDetector({ formats: [...BARCODE_DETECTOR_FORMATS] });
      } catch { /* BarcodeDetector unavailable or unsupported formats */ }
    }

    if (!detector) {
      const el = document.createElement('div');
      el.id = 'enhanced-scanner-hidden';
      el.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(el);
      enhancedElRef.current = el;
      try {
        enhancedScannerRef.current = new Html5Qrcode('enhanced-scanner-hidden', {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
      } catch {
        return;
      }
    }

    let frameCount = 0;

    enhancedTimerRef.current = setInterval(async () => {
      if (decodingRef.current) return;
      decodingRef.current = true;

      try {
        const video = getVideoElement(elementId);
        if (!video || video.readyState < 2) return;

        const frame = captureFrame(video);
        if (!frame) return;
        enhanceForBarcode(frame);

        const decoded = await tryDecodeCanvas(frame, detector, enhancedScannerRef.current);
        if (decoded) {
          emitDeduplicated(decoded);
          return;
        }

        // Try slight rotations every 4th frame (~1/sec) for curved barcodes
        frameCount++;
        if (frameCount % 4 === 0) {
          for (const angle of [2, -2, 4, -4]) {
            const rotated = rotateCanvas(frame, angle);
            const result = await tryDecodeCanvas(rotated, detector, enhancedScannerRef.current);
            if (result) {
              emitDeduplicated(result);
              return;
            }
          }
        }
      } catch {
        // Enhanced pipeline errors are non-fatal
      } finally {
        decodingRef.current = false;
      }
    }, ENHANCED_DECODE_MS);

    brightnessTimerRef.current = setInterval(() => {
      if (torchOnRef.current) {
        if (brightnessTimerRef.current) {
          clearInterval(brightnessTimerRef.current);
          brightnessTimerRef.current = null;
        }
        return;
      }
      const video = getVideoElement(elementId);
      if (!video || video.readyState < 2) return;
      if (averageBrightness(video) < LOW_BRIGHTNESS_THRESHOLD) {
        enableTorch();
      }
    }, BRIGHTNESS_CHECK_MS);
  }, [emitDeduplicated, enableTorch]);

  const start = useCallback(
    async (elementId: string) => {
      await stop();
      setError(null);

      try {
        // Pre-warm camera permission so it persists (avoids re-prompting on every start)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          // Ignore - will retry with scanner
        }

        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
              width: Math.min(Math.floor(viewfinderWidth * 0.9), 420),
              height: Math.min(Math.floor(viewfinderHeight * 0.35), 120),
            }),
            aspectRatio: 1.777,
            disableFlip: true,
          },
          (decodedText) => {
            emitDeduplicated(decodedText);
          },
          () => {},
        );
        setIsScanning(true);
        setScanStartedAt(Date.now());

        try {
          const videoEl = getVideoElement(elementId);
          const stream = videoEl?.srcObject as MediaStream | null;
          const track = stream?.getVideoTracks()[0] ?? null;
          trackRef.current = track;
          if (track) {
            const caps = track.getCapabilities?.() as Record<string, unknown> | undefined;
            setTorchSupported(!!caps?.torch);
            await applyAdvancedTrackConstraints(track);
          }
        } catch {
          setTorchSupported(false);
        }

        startEnhancedPipeline(elementId);
      } catch (err) {
        setError(parsePermissionError(err));
        setIsScanning(false);
      }
    },
    [stop, emitDeduplicated, applyAdvancedTrackConstraints, startEnhancedPipeline],
  );

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // torch not available on this track
    }
  }, [torchOn]);

  return { start, stop, isScanning, error, torchOn, torchSupported, toggleTorch, scanStartedAt };
}
