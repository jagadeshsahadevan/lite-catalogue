import { useEffect, useState } from 'react';
import { useOcr } from '../hooks/useOcr';
import { MD3Button } from './md3/MD3Button';

interface Props {
  imageBlob: Blob;
  onSubmit: (mrp: string | null) => void;
}

export function MrpInput({ imageBlob, onSubmit }: Props) {
  const { extractMrp, isProcessing } = useOcr();
  const [value, setValue] = useState('');
  const [ocrDone, setOcrDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mrpResult = await extractMrp(imageBlob);
      if (cancelled) return;
      if (mrpResult) setValue(mrpResult);
      setOcrDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [imageBlob, extractMrp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value.trim() || null);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <h3 className="text-lg font-semibold text-on-surface mb-2">Product MRP</h3>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-3">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Extracting MRP from image...
        </div>
      )}

      {ocrDone && !value && (
        <p className="text-sm text-tertiary mb-3">
          Could not detect MRP. Please enter manually.
        </p>
      )}

      {ocrDone && value && (
        <p className="text-sm text-success mb-3">
          Detected MRP: &#8377;{value} (edit if incorrect)
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">&#8377;</span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter MRP"
            className="w-full pl-8 pr-4 py-3 border border-outline rounded-[var(--md-shape-sm)] text-lg text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
            disabled={isProcessing}
          />
        </div>

        <div className="flex gap-2">
          <MD3Button variant="outlined" onClick={() => onSubmit(null)} fullWidth>
            Skip
          </MD3Button>
          <MD3Button type="submit" variant="filled" disabled={isProcessing} fullWidth>
            Confirm
          </MD3Button>
        </div>
      </form>
    </div>
  );
}
