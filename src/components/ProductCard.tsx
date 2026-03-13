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

export function ProductCard({ product, onClick, onToggleSelect, selected = false }: Props) {
  const { getFirstImage, getImageCount } = useProducts();
  const { settings } = useSettings();
  const [thumbUrl, setThumbUrl] = useState('');
  const [imageCount, setImageCount] = useState(0);

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
      getImageCount(product.id).then(setImageCount);
    }
    return () => {
      if (url) revokeObjectUrl(url);
    };
  }, [product.id, getFirstImage, getImageCount]);

  return (
    <div
      data-tour="tour-products-card"
      className={`
        bg-surface rounded-[var(--md-shape-md)] border overflow-hidden text-left w-full transition-all relative
        ${selected ? 'border-primary border-2 ring-2 ring-primary/20' : 'border-outline-variant'}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
        className="absolute top-2 left-2 z-10 w-7 h-7 flex items-center justify-center"
      >
        {selected ? (
          <span className="w-6 h-6 bg-primary rounded-[var(--md-shape-xs)] flex items-center justify-center shadow">
            <Icon name="check" size={16} className="text-on-primary" />
          </span>
        ) : (
          <span className="w-6 h-6 rounded-[var(--md-shape-xs)] border-2 border-outline bg-white/80 backdrop-blur-sm" />
        )}
      </button>

      {/* Image count badge */}
      {imageCount > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Icon name="photo_camera" size={10} />
          {imageCount}
        </div>
      )}

      <button onClick={onClick} className="w-full text-left active:brightness-97">
        <div className="aspect-square bg-surface-container">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className={`w-full h-full object-cover ${selected ? 'opacity-80' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-on-surface-variant opacity-30">
              📷
            </div>
          )}
        </div>
        <div className="p-2.5 space-y-1">
          <p className="text-xs font-mono text-on-surface-variant truncate">{product.barcode}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {product.mrp && (
              <span className="text-sm font-semibold text-on-surface">₹{product.mrp}</span>
            )}
            <span className="text-xs text-on-surface-variant">
              Qty: {product.qty != null ? product.qty : 0}
            </span>
            {customDisplay.slice(0, 2).map(({ name, value }) => (
              <span key={name} className="text-[10px] text-on-surface-variant truncate max-w-[80px]" title={`${name}: ${value}`}>
                {name}: {value}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <span className="text-[10px] text-on-surface-variant">
              {product.capturedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
