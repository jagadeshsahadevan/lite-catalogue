import { useState, useRef, useEffect } from 'react';
import { useOcr } from '../hooks/useOcr';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';
import type { CustomFieldDef } from '../types';

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

export interface ProductDetailsData {
  mrp: string | null;
  qty: number | null;
  brand: string | null;
  category: string | null;
  customData: Record<string, string | null>;
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
  fieldOrder: string[];
  customFields: CustomFieldDef[];
  customFieldOptionsMap?: Record<string, string[]>;
  onSubmit: (data: ProductDetailsData) => void;
  onAddMorePhotos?: () => void;
}

export function ProductDetailsInput({
  askMrp, askQty, askBrand, askCategory,
  autoMrpDetect, imageBlob, imageCount,
  brandOptions, categoryOptions,
  lastBrand, lastCategory,
  fieldOrder, customFields, customFieldOptionsMap,
  onSubmit, onAddMorePhotos,
}: Props) {
  const { extractMrp, isProcessing } = useOcr();
  const [mrp, setMrp] = useState('');
  const [qty, setQty] = useState('');
  const [brand, setBrand] = useState(lastBrand);
  const [category, setCategory] = useState(lastCategory);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
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

  const setCustomValue = (id: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [id]: value }));
  };

  const gatherData = (): ProductDetailsData => {
    const trimmedQty = qty.trim();
    const parsedQty = trimmedQty === '' ? null : parseInt(trimmedQty, 10);
    const cd: Record<string, string | null> = {};
    for (const cf of customFields) {
      if (cf.enabled) {
        const v = customValues[cf.id]?.trim();
        cd[cf.id] = v || null;
      }
    }
    return {
      mrp: askMrp ? (mrp.trim() || null) : null,
      qty: askQty ? (isNaN(parsedQty as number) ? null : parsedQty) : null,
      brand: askBrand ? (brand.trim() || null) : null,
      category: askCategory ? (category.trim() || null) : null,
      customData: cd,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(gatherData());
  };

  const handleSkip = () => {
    onSubmit({ mrp: null, qty: null, brand: null, category: null, customData: {} });
  };

  const enabledCustomFields = customFields.filter((f) => f.enabled);
  const hasAnyField = askMrp || askQty || askBrand || askCategory || enabledCustomFields.length > 0;
  if (!hasAnyField) {
    handleSkip();
    return null;
  }

  const renderField = (fieldId: string) => {
    switch (fieldId) {
      case 'mrp':
        if (!askMrp) return null;
        return (
          <div key="mrp">
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
        );

      case 'qty':
        if (!askQty) return null;
        return (
          <div key="qty">
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
        );

      case 'brand':
        if (!askBrand) return null;
        return (
          <ComboField
            key="brand"
            label="Brand"
            value={brand}
            onChange={setBrand}
            options={brandOptions}
            placeholder="e.g. Samsung, Nike..."
          />
        );

      case 'category':
        if (!askCategory) return null;
        return (
          <ComboField
            key="category"
            label="Category"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            placeholder="e.g. Electronics, Clothing..."
          />
        );

      default: {
        const cf = customFields.find((f) => f.id === fieldId);
        if (!cf || !cf.enabled) return null;
        const val = customValues[cf.id] ?? '';

        if (cf.type === 'dropdown') {
          const defOpts = cf.options ?? [];
          const extraOpts = customFieldOptionsMap?.[cf.id] ?? [];
          const mergedOpts = [...new Set([...defOpts, ...extraOpts])].sort((a, b) => a.localeCompare(b));
          return (
            <ComboField
              key={cf.id}
              label={cf.name}
              value={val}
              onChange={(v) => setCustomValue(cf.id, v)}
              options={mergedOpts}
              placeholder={`Enter ${cf.name.toLowerCase()}`}
            />
          );
        }

        if (cf.type === 'date') {
          return (
            <div key={cf.id}>
              <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-0.5">{cf.name}</label>
              <input
                type="date"
                value={val}
                onChange={(e) => setCustomValue(cf.id, e.target.value)}
                className="w-full px-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
              />
            </div>
          );
        }

        return (
          <div key={cf.id}>
            <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-0.5">{cf.name}</label>
            <input
              type="text"
              value={val}
              onChange={(e) => setCustomValue(cf.id, e.target.value)}
              placeholder={`Enter ${cf.name.toLowerCase()}`}
              className="w-full px-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
            />
          </div>
        );
      }
    }
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
        {fieldOrder.map(renderField)}

        <div className="flex gap-3 pt-1">
          <MD3Button type="button" variant="outlined" onClick={handleSkip} className="flex-1">
            Skip
          </MD3Button>
          <MD3Button type="submit" variant="filled" disabled={isProcessing} className="flex-1">
            Continue
          </MD3Button>
        </div>
      </form>
    </div>
  );
}
