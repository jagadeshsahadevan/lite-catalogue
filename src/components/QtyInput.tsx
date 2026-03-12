import { useState } from 'react';
import { MD3Button } from './md3/MD3Button';

interface Props {
  onSubmit: (qty: number | null) => void;
}

export function QtyInput({ onSubmit }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed === '') {
      onSubmit(null);
    } else {
      const num = parseInt(trimmed, 10);
      onSubmit(isNaN(num) ? null : num);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <h3 className="text-lg font-semibold text-on-surface mb-2">Quantity Available</h3>
      <p className="text-sm text-on-surface-variant mb-3">
        How many units are available? (optional)
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter quantity"
          className="w-full px-4 py-3 border border-outline rounded-[var(--md-shape-sm)] text-lg text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
          autoFocus
        />

        <div className="flex gap-2">
          <MD3Button variant="outlined" onClick={() => onSubmit(null)} fullWidth>
            Skip
          </MD3Button>
          <MD3Button type="submit" variant="filled" fullWidth>
            Confirm
          </MD3Button>
        </div>
      </form>
    </div>
  );
}
