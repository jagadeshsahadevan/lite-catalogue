import { useEffect, useRef, useState } from 'react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';

interface Props {
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ onScan }: Props) {
  const [manual, setManual] = useState(false);
  const { start, stop, isScanning, error } = useBarcodeScanner(onScan);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!manual && !mountedRef.current) {
      mountedRef.current = true;
      const timer = setTimeout(() => {
        start('barcode-scanner');
      }, 100);
      return () => {
        clearTimeout(timer);
        stop();
        mountedRef.current = false;
      };
    }
    return () => {
      if (mountedRef.current) {
        stop();
        mountedRef.current = false;
      }
    };
  }, [manual, start, stop]);

  if (manual) {
    return (
      <div>
        <ManualBarcodeInput onSubmit={onScan} />
        <button
          onClick={() => setManual(false)}
          className="mt-3 w-full text-sm text-primary font-medium"
        >
          Switch to camera scanner
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-on-surface">Scan Barcode</h2>
        <p className="text-sm text-on-surface-variant mt-1">Point camera at the product barcode</p>
      </div>

      <div
        id="barcode-scanner"
        className="w-full max-w-sm rounded-[var(--md-shape-md)] overflow-hidden bg-black"
        style={{ minHeight: 250 }}
      />

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

      <button
        onClick={() => {
          stop();
          setManual(true);
        }}
        className="text-sm text-primary font-medium"
      >
        Enter barcode manually
      </button>
    </div>
  );
}
