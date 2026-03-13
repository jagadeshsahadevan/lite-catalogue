import { useEffect, useState } from 'react';
import type { Product } from '../types';
import { useProducts } from '../hooks/useProducts';
import { useSettings } from '../context/SettingsContext';
import { blobToObjectUrl, revokeObjectUrl } from '../utils/imageUtils';
import { Icon } from './md3/Icon';

interface Props {
  product: Product;
  onClick: () => void;
  onToggleSelect?: () => void;
  selected?: boolean;
}

export function ProductListRow({ product, onClick, onToggleSelect, selected = false }: Props) {
  const { getFirstImage } = useProducts();
  const { settings } = useSettings();
  const [thumbUrl, setThumbUrl] = useState('');

  const customFields = settings.customFields ?? [];
  const customData = product.customData ?? {};
  const customDisplay = customFields
    .filter((cf) => customData[cf.id])
    .map((cf) => ({ name: cf.name, value: customData[cf.id]! }));

  useEffect(() => {
    let url = '';
    if (product.id) {
      getFirstImage(product.id).then((img) => {
        if (img) {
          url = blobToObjectUrl(img.blob);
          setThumbUrl(url);
        }
      });
    }
    return () => {
      if (url) revokeObjectUrl(url);
    };
  }, [product.id, getFirstImage]);

  const formatDate = (d: Date | string) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div
      data-tour="tour-products-card"
      className={`
        bg-surface rounded-[var(--md-shape-sm)] border overflow-hidden w-full transition-all
        flex items-center gap-3 p-2 text-left
        ${selected ? 'border-primary border-2 ring-2 ring-primary/20' : 'border-outline-variant'}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center"
      >
        {selected ? (
          <span className="w-5 h-5 bg-primary rounded-[var(--md-shape-xs)] flex items-center justify-center shadow">
            <Icon name="check" size={14} className="text-on-primary" />
          </span>
        ) : (
          <span className="w-5 h-5 rounded-[var(--md-shape-xs)] border-2 border-outline" />
        )}
      </button>

      {/* Tappable content area */}
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left active:brightness-97">
        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-[var(--md-shape-xs)] bg-surface-container flex-shrink-0 overflow-hidden">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className={`w-full h-full object-cover ${selected ? 'opacity-80' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-on-surface-variant opacity-30">
              📷
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium text-on-surface truncate">{product.barcode}</span>
            {product.mrp && (
              <span className="text-xs font-semibold text-on-surface">₹{product.mrp}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-on-surface-variant">{formatDate(product.capturedAt)}</span>
            <span className="text-xs text-on-surface-variant">
              Qty: {product.qty != null ? product.qty : 0}
            </span>
            {customDisplay.slice(0, 2).map(({ name, value }) => (
              <span key={name} className="text-[10px] text-on-surface-variant truncate max-w-[70px]" title={`${name}: ${value}`}>
                {name}: {value}
              </span>
            ))}
          </div>
        </div>

        <Icon name="chevron_right" size={18} className="text-on-surface-variant flex-shrink-0" />
      </button>
    </div>
  );
}
