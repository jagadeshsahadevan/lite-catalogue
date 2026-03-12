import { useState } from 'react';
import { MD3TextField } from './md3/MD3TextField';
import { MD3Button } from './md3/MD3Button';
import { filterBarcodeInput, validateBarcode, sanitizeBarcode } from '../utils/constants';

interface Props {
  onSubmit: (barcode: string) => void;
}

export function ManualBarcodeInput({ onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (raw: string) => {
    const filtered = filterBarcodeInput(raw);
    setValue(filtered);
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = sanitizeBarcode(value);
    if (!barcode) return;
    const err = validateBarcode(barcode);
    if (err) {
      setError(err);
      return;
    }
    onSubmit(barcode);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-3">
      <MD3TextField
        label="Enter barcode number"
        value={value}
        onChange={handleChange}
        placeholder="e.g. 8901234567890"
        error={error || undefined}
      />
      <p className="text-[10px] text-on-surface-variant px-1">
        A-Z 0-9 and - _ @ # + allowed
      </p>
      <MD3Button type="submit" variant="filled" fullWidth disabled={!value.trim()}>
        Go
      </MD3Button>
    </form>
  );
}
