import { useState, useRef, useEffect } from 'react';
import { Icon } from './md3/Icon';

interface InlineComboFieldProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  onSave: () => void;
  onCancel: () => void;
  inputClassName?: string;
}

export function InlineComboField({
  value,
  onChange,
  options,
  placeholder,
  onSave,
  onCancel,
  inputClassName = 'w-28 px-2 py-1 border border-primary rounded-[var(--md-shape-xs)] text-sm text-on-surface bg-transparent focus:outline-none',
}: InlineComboFieldProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()))
    : options;

  const isNew = value.trim() && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase());
  const showDropdown = open && (filtered.length > 0 || isNew);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-1.5 relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={placeholder}
          className={inputClassName}
        />
      </div>
      {showDropdown && (
        <div className="absolute left-0 top-full mt-1 z-20 border border-outline-variant rounded-[var(--md-shape-sm)] max-h-36 overflow-y-auto bg-surface shadow-lg min-w-[140px]">
          {isNew && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(value.trim());
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-1.5 bg-primary-container/30"
            >
              <Icon name="add" size={14} className="text-primary" />
              <span className="text-primary font-medium">Add &quot;{value.trim()}&quot;</span>
            </button>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs text-on-surface active:bg-surface-container-high ${
                opt.toLowerCase() === value.trim().toLowerCase() ? 'bg-primary-container/20 font-medium' : ''
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      <button onClick={onSave} className="text-primary">
        <Icon name="check" size={18} />
      </button>
      <button onClick={onCancel} className="text-on-surface-variant">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
