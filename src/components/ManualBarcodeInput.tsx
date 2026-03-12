import { useState } from 'react';
import { MD3TextField } from './md3/MD3TextField';
import { MD3Button } from './md3/MD3Button';

interface Props {
  onSubmit: (barcode: string) => void;
}

export function ManualBarcodeInput({ onSubmit }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-3">
      <MD3TextField
        label="Enter barcode number"
        value={value}
        onChange={setValue}
        placeholder="e.g. 8901234567890"
      />
      <MD3Button type="submit" variant="filled" fullWidth disabled={!value.trim()}>
        Go
      </MD3Button>
    </form>
  );
}
