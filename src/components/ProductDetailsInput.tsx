import { useState, useRef, useEffect } from 'react';
import { useOcr } from '../hooks/useOcr';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';

interface ComboFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

function ComboField({ label, value, onChange, options, placeholder }: ComboFieldProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()))
    : options;

  const isNew = value.trim() && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase());
  const showDropdown = open && (filtered.length > 0 || isNew);

  return (
    <div>
      <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-0.5">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 pr-9 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="border border-outline-variant rounded-[var(--md-shape-sm)] max-h-36 overflow-y-auto bg-surface shadow-lg mt-1">
          {isNew && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-1.5 bg-primary-container/30"
            >
              <Icon name="add" size={14} className="text-primary" />
              <span className="text-primary font-medium">Add "{value.trim()}"</span>
            </button>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs text-on-surface active:bg-surface-container-high ${
                opt.toLowerCase() === value.trim().toLowerCase() ? 'bg-primary-container/20 font-medium' : ''
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  askMrp: boolean;
  askQty: boolean;
  askBrand: boolean;
  askCategory: boolean;
  autoMrpDetect: boolean;
  imageBlob: Blob | null;
  imageCount: number;
  brandOptions: string[];
  categoryOptions: string[];
  lastBrand: string;
  lastCategory: string;
  onSubmit: (data: { mrp: string | null; qty: number | null; brand: string | null; category: string | null }) => void;
  onAddMorePhotos?: () => void;
}

export function ProductDetailsInput({
  askMrp, askQty, askBrand, askCategory,
  autoMrpDetect, imageBlob, imageCount,
  brandOptions, categoryOptions,
  lastBrand, lastCategory,
  onSubmit, onAddMorePhotos,
}: Props) {
  const { extractMrp, isProcessing } = useOcr();
  const [mrp, setMrp] = useState('');
  const [qty, setQty] = useState('');
  const [brand, setBrand] = useState(lastBrand);
  const [category, setCategory] = useState(lastCategory);
  const [ocrDone, setOcrDone] = useState(!autoMrpDetect || !askMrp);

  useEffect(() => {
    if (!autoMrpDetect || !askMrp || !imageBlob) return;
    let cancelled = false;
    (async () => {
      const result = await extractMrp(imageBlob);
      if (cancelled) return;
      if (result) setMrp(result);
      setOcrDone(true);
    })();
    return () => { cancelled = true; };
  }, [autoMrpDetect, askMrp, imageBlob, extractMrp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQty = qty.trim();
    const parsedQty = trimmedQty === '' ? null : parseInt(trimmedQty, 10);
    onSubmit({
      mrp: askMrp ? (mrp.trim() || null) : null,
      qty: askQty ? (isNaN(parsedQty as number) ? null : parsedQty) : null,
      brand: askBrand ? (brand.trim() || null) : null,
      category: askCategory ? (category.trim() || null) : null,
    });
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-on-surface">Product Details</h3>
        {onAddMorePhotos && (
          <button
            type="button"
            onClick={onAddMorePhotos}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary text-primary text-xs font-medium active:bg-primary-container/30"
          >
            <Icon name="camera" size={14} />
            Add Photos ({imageCount})
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {askMrp && (
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-0.5">MRP</label>
            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Detecting...
              </div>
            )}
            {ocrDone && autoMrpDetect && mrp && (
              <p className="text-xs text-success mb-1">Detected: &#8377;{mrp}</p>
            )}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">&#8377;</span>
              <input
                type="text"
                inputMode="decimal"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="Enter MRP"
                disabled={isProcessing}
                className="w-full pl-8 pr-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {askQty && (
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-0.5">Quantity</label>
            <input
              type="text"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Enter quantity"
              className="w-full px-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
            />
          </div>
        )}

        {askBrand && (
          <ComboField
            label="Brand"
            value={brand}
            onChange={setBrand}
            options={brandOptions}
            placeholder="e.g. Samsung, Nike..."
          />
        )}

        {askCategory && (
          <ComboField
            label="Category"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            placeholder="e.g. Electronics, Clothing..."
          />
        )}

        <div className="pt-1">
          <MD3Button type="submit" variant="filled" fullWidth disabled={isProcessing}>
            Continue
          </MD3Button>
        </div>
      </form>
    </div>
  );
}
