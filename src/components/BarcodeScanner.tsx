import { useEffect, useRef, useState, useCallback } from 'react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useTour } from '../context/TourContext';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';

interface ScanTip {
  text: string;
  action?: 'flash' | 'manual';
}

const SCANNING_TIPS: ScanTip[] = [
  { text: 'Hold the product steady and align the barcode within the box.' },
  { text: 'Tap the flash icon ⚡ for better visibility.', action: 'flash' },
  { text: 'Still struggling? Try entering the barcode manually.', action: 'manual' },
];

const TIP_THRESHOLDS_S = [8, 18, 30];

interface Props {
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ onScan }: Props) {
  const { isActive: tourActive, currentStep, nextStep: tourNext, markScanComplete } = useTour();
  const isManualStep = currentStep?.id === 'manual-entry' || currentStep?.id === 'type-barcode';
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (tourActive && isManualStep) setManual(true);
  }, [tourActive, isManualStep]);
  const {
    start, stop, isScanning, error,
    torchOn, torchSupported, toggleTorch,
    scanStartedAt,
  } = useBarcodeScanner(onScan);
  const mountedRef = useRef(false);
  const [tipIndex, setTipIndex] = useState(-1);

  const handleManualSubmit = useCallback((barcode: string) => {
    onScan(barcode);
    if (tourActive && currentStep?.id === 'type-barcode') {
      markScanComplete();
      tourNext();
    }
  }, [onScan, tourActive, currentStep, tourNext, markScanComplete]);

  // Start scanner on mount, stop only on unmount. Keep stream alive when switching to manual
  // to avoid repeated camera permission prompts (especially on iOS).
  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      start('barcode-scanner');
    }, 100);
    return () => {
      clearTimeout(timer);
      stop();
      mountedRef.current = false;
    };
  }, [start, stop]);

  useEffect(() => {
    if (!isScanning || !scanStartedAt || tourActive) {
      setTipIndex(-1);
      return;
    }
    const timer = setInterval(() => {
      const elapsed = (Date.now() - scanStartedAt) / 1000;
      let idx = -1;
      for (let i = TIP_THRESHOLDS_S.length - 1; i >= 0; i--) {
        if (elapsed >= TIP_THRESHOLDS_S[i]) { idx = i; break; }
      }
      setTipIndex(idx);
    }, 1000);
    return () => clearInterval(timer);
  }, [isScanning, scanStartedAt, tourActive]);

  return (
    <div className="flex flex-col items-center gap-3">
      {!manual && (
        <div className="text-center">
          <h2 className="text-lg font-semibold text-on-surface">Scan Barcode</h2>
          <p className="text-sm text-on-surface-variant mt-1">Point camera at the product barcode</p>
        </div>
      )}

      {/* Scanner always in DOM; hidden off-screen when manual to keep camera stream alive and avoid re-prompting for permission */}
      <div
        className="relative w-full max-w-sm"
        style={
          manual
            ? { position: 'absolute' as const, left: -9999, width: 1, height: 1, overflow: 'hidden' as const, visibility: 'hidden' as const }
            : undefined
        }
        aria-hidden={manual}
      >
        <div
          id="barcode-scanner"
          data-tour="barcode-scanner"
          className="w-full rounded-[var(--md-shape-md)] overflow-hidden bg-black barcode-guide"
          style={{ minHeight: 250 }}
        />
        {!manual && isScanning && torchSupported && (
          <button
            data-tour="scanner-flash-btn"
            onClick={toggleTorch}
            className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
              torchOn ? 'bg-yellow-400 text-black' : 'bg-black/50 text-white'
            } ${tipIndex >= 0 && SCANNING_TIPS[tipIndex]?.action === 'flash' ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
          >
            <Icon name={torchOn ? 'flash-on' : 'flash-off'} size={20} />
          </button>
        )}
        {!manual && isScanning && (
          <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/70 pointer-events-none drop-shadow">
            Align barcode within the box
          </p>
        )}
      </div>

      {manual ? (
        <>
          <ManualBarcodeInput onSubmit={handleManualSubmit} />
          <button
            onClick={() => setManual(false)}
            className="w-full text-sm text-primary font-medium"
          >
            Switch to camera scanner
          </button>
        </>
      ) : (
        <>
          {error && (
            <div className="text-on-error-container text-sm bg-error-container p-3 rounded-[var(--md-shape-sm)] w-full max-w-sm">
              <p>{error}</p>
              <MD3Button
                variant="outlined"
                onClick={() => { stop(); start('barcode-scanner'); }}
                className="mt-2"
                icon={<Icon name="refresh" size={18} />}
              >
                Retry
              </MD3Button>
            </div>
          )}

          {!isScanning && !error && (
            <div className="text-on-surface-variant text-sm">Starting camera...</div>
          )}

          <div className="w-full max-w-sm min-h-[32px]">
            {tipIndex >= 0 && (
              <div className="text-center text-xs text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-[var(--md-shape-sm)]">
                {SCANNING_TIPS[tipIndex].text}
              </div>
            )}
          </div>

          <button
            data-tour="manual-barcode-btn"
            onClick={() => {
              setManual(true);
              if (tourActive && currentStep?.id === 'manual-entry') {
                tourNext();
              }
            }}
            className={`text-sm text-primary font-medium transition-all ${
              tipIndex >= 0 && SCANNING_TIPS[tipIndex]?.action === 'manual'
                ? 'bg-primary-container px-4 py-2 rounded-full animate-pulse shadow-sm'
                : ''
            }`}
          >
            Enter barcode manually
          </button>
        </>
      )}
    </div>
  );
}
