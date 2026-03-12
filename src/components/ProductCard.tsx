import { useEffect, useState, useRef, useCallback } from 'react';
import type { Product } from '../types';
import { useProducts } from '../hooks/useProducts';
import { blobToObjectUrl, revokeObjectUrl } from '../utils/imageUtils';
import { Icon } from './md3/Icon';

interface Props {
  product: Product;
  onClick: () => void;
  onLongPress?: () => void;
  selected?: boolean;
}

export function ProductCard({ product, onClick, onLongPress, selected = false }: Props) {
  const { getFirstImage, getImageCount } = useProducts();
  const [thumbUrl, setThumbUrl] = useState('');
  const [imageCount, setImageCount] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

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

  const startLongPress = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      onLongPress?.();
    }, 500);
  }, [onLongPress]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = () => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      className={`
        bg-surface rounded-[var(--md-shape-md)] border overflow-hidden text-left w-full active:brightness-97 transition-all relative
        ${selected ? 'border-primary border-2 ring-2 ring-primary/20' : 'border-outline-variant'}
      `}
    >
      {/* Selection check */}
      {selected && (
        <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow">
          <Icon name="check" size={14} className="text-on-primary" />
        </div>
      )}

      {/* Image count badge */}
      {imageCount > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Icon name="photo_camera" size={10} />
          {imageCount}
        </div>
      )}

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
        <div className="flex items-center gap-2">
          {product.mrp && (
            <span className="text-sm font-semibold text-on-surface">₹{product.mrp}</span>
          )}
          <span className="text-xs text-on-surface-variant">
            Qty: {product.qty != null ? product.qty : 0}
          </span>
        </div>
        <div className="flex items-center justify-end">
          <span className="text-[10px] text-on-surface-variant">
            {product.capturedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
          </span>
        </div>
      </div>
    </button>
  );
}
