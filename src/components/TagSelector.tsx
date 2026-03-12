import { useState } from 'react';
import { PRESET_TAGS } from '../types';
import { useSettings } from '../context/SettingsContext';
import { MD3Chip } from './md3/MD3Chip';
import { MD3TextField } from './md3/MD3TextField';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';

interface Props {
  onSelect: (tag: string) => void;
  usedTags?: string[];
}

export function TagSelector({ onSelect, usedTags = [] }: Props) {
  const { settings } = useSettings();
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const allTags = [...PRESET_TAGS, ...settings.customTags];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed) {
      onSelect(trimmed);
      setCustomInput('');
      setShowCustom(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <h3 className="text-sm font-medium text-on-surface-variant mb-3">Select position tag</h3>

      <div className="flex flex-wrap gap-2 mb-3">
        {allTags.map((tag) => {
          const count = usedTags.filter((t) => t === tag).length;
          return (
            <MD3Chip
              key={tag}
              label={count > 0 ? `${tag} (${count})` : tag}
              onClick={() => onSelect(tag)}
            />
          );
        })}

        <MD3Chip
          label="+ Custom"
          onClick={() => setShowCustom(!showCustom)}
          icon={<Icon name="add" size={16} />}
        />
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <div className="flex-1">
            <MD3TextField
              label="Tag name"
              value={customInput}
              onChange={setCustomInput}
              placeholder="Tag name..."
            />
          </div>
          <MD3Button
            type="submit"
            variant="filled"
            disabled={!customInput.trim()}
            className="self-start mt-1"
          >
            Add
          </MD3Button>
        </form>
      )}
    </div>
  );
}
