import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from './md3/Icon';
import { MD3Button } from './md3/MD3Button';

interface Props {
  label: string;
  value: string;
  options: string[];
  onSubmit: (value: string | null) => void;
  placeholder?: string;
  skipLabel?: string;
}

export function ComboBoxInput({ label, value: initialValue, options, onSubmit, placeholder, skipLabel = 'Skip' }: Props) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()))
    : options;

  const isNewValue = value.trim() && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase());

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSelect = useCallback((opt: string) => {
    setValue(opt);
    setOpen(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value.trim() || null);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <h3 className="text-lg font-semibold text-on-surface mb-3">{label}</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-10 border border-outline rounded-[var(--md-shape-sm)] text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
          />
          {value && (
            <button
              type="button"
              onClick={() => { setValue(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && (filtered.length > 0 || isNewValue) && (
          <div className="border border-outline-variant rounded-[var(--md-shape-sm)] max-h-48 overflow-y-auto bg-surface shadow-lg">
            {isNewValue && (
              <button
                type="button"
                onClick={() => { setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 bg-primary-container/30"
              >
                <Icon name="add" size={16} className="text-primary" />
                <span className="text-primary font-medium">Add "{value.trim()}"</span>
              </button>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-2.5 text-sm text-on-surface active:bg-surface-container-high ${
                  opt.toLowerCase() === value.trim().toLowerCase()
                    ? 'bg-primary-container/20 font-medium'
                    : ''
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <MD3Button variant="outlined" onClick={() => onSubmit(null)} fullWidth>
            {skipLabel}
          </MD3Button>
          <MD3Button type="submit" variant="filled" fullWidth>
            Confirm
          </MD3Button>
        </div>
      </form>
    </div>
  );
}
