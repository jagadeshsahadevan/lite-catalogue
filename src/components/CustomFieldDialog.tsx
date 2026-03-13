import { useState, useEffect } from 'react';
import { MD3Button } from './md3/MD3Button';
import { MD3Switch } from './md3/MD3Switch';
import { Icon } from './md3/Icon';
import type { CustomFieldDef, CustomFieldType } from '../types';

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
];

interface Props {
  field: CustomFieldDef | null;
  onSave: (field: Omit<CustomFieldDef, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

export function CustomFieldDialog({ field, onSave, onClose }: Props) {
  const isEdit = !!field;
  const [name, setName] = useState(field?.name ?? '');
  const [type, setType] = useState<CustomFieldType>(field?.type ?? 'text');
  const [enabled, setEnabled] = useState(field?.enabled ?? true);
  const [optionsText, setOptionsText] = useState(
    (field?.options ?? []).join('\n')
  );

  useEffect(() => {
    if (field) {
      setName(field.name);
      setType(field.type);
      setEnabled(field.enabled);
      setOptionsText((field.options ?? []).join('\n'));
    } else {
      setName('');
      setType('text');
      setEnabled(true);
      setOptionsText('');
    }
  }, [field]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const options =
      type === 'dropdown'
        ? optionsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    onSave({
      ...(field ? { id: field.id } : {}),
      name: trimmed,
      type,
      enabled,
      options,
    });
    onClose();
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
            {isEdit ? 'Edit Field' : 'Add Field'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">
            Field name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Size, Color, Expiry"
            className="w-full px-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">
            Type
          </label>
          <div className="flex gap-2">
            {FIELD_TYPES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`flex-1 px-3 py-2 rounded-[var(--md-shape-sm)] text-sm font-medium transition-colors ${
                  type === opt.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'dropdown' && (
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">
              Options (one per line)
            </label>
            <textarea
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Small&#10;Medium&#10;Large"
              rows={4}
              className="w-full px-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2 resize-none"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">Enabled</span>
          <MD3Switch checked={enabled} onChange={setEnabled} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <MD3Button variant="text" onClick={onClose}>
            Cancel
          </MD3Button>
          <MD3Button
            variant="filled"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {isEdit ? 'Save' : 'Add'}
          </MD3Button>
        </div>
      </div>
    </div>
  );
}
