import { useState, useRef } from 'react';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';

interface Props {
  fieldLabel: string;
  options: string[];
  onSave: (options: string[]) => void;
  onClose: () => void;
}

export function BuiltinFieldOptionsDialog({ fieldLabel, options, onSave, onClose }: Props) {
  const [items, setItems] = useState<string[]>([...options]);
  const [newValue, setNewValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addItem = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (!items.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      setItems((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
    }
    setNewValue('');
    inputRef.current?.focus();
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[var(--md-shape-lg)] p-6 max-w-sm w-full shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-on-surface">
            {fieldLabel} Options
          </h3>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface">
            <Icon name="close" size={24} />
          </button>
        </div>

        <p className="text-xs text-on-surface-variant">
          Pre-defined dropdown values for the {fieldLabel.toLowerCase()} field. New values entered during capture or editing are auto-added here.
        </p>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder={`Add ${fieldLabel.toLowerCase()} value`}
            className="flex-1 px-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
            autoFocus
          />
          <MD3Button variant="tonal" onClick={addItem} disabled={!newValue.trim()}>
            <Icon name="add" size={18} />
          </MD3Button>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1">
          {items.length === 0 && (
            <p className="text-xs text-on-surface-variant text-center py-4">No options yet</p>
          )}
          {items.map((item, idx) => (
            <div key={`${item}-${idx}`} className="flex items-center justify-between px-3 py-2 rounded-[var(--md-shape-sm)] bg-surface-container-low">
              <span className="text-sm text-on-surface">{item}</span>
              <button
                onClick={() => removeItem(idx)}
                className="p-1 text-on-surface-variant hover:text-error"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <MD3Button variant="text" onClick={onClose}>Cancel</MD3Button>
          <MD3Button variant="filled" onClick={() => { onSave(items); onClose(); }}>
            Save
          </MD3Button>
        </div>
      </div>
    </div>
  );
}
