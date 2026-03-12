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

export function ProductListRow({ product, onClick, onLongPress, selected = false }: Props) {
  const { getFirstImage } = useProducts();
  const [thumbUrl, setThumbUrl] = useState('');
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
    }
    return () => {
      if (url) revokeObjectUrl(url);
    };
  }, [product.id, getFirstImage]);

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

  const formatDate = (d: Date | string) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' });
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
        bg-surface rounded-[var(--md-shape-sm)] border overflow-hidden w-full active:brightness-97 transition-all
        flex items-center gap-3 p-2 text-left relative
        ${selected ? 'border-primary border-2 ring-2 ring-primary/20' : 'border-outline-variant'}
      `}
    >
      {/* Selection check */}
      {selected && (
        <div className="absolute top-1.5 left-1.5 z-10 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
          <Icon name="check" size={12} className="text-on-primary" />
        </div>
      )}

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
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-on-surface-variant">{formatDate(product.capturedAt)}</span>
          <span className="text-xs text-on-surface-variant">
            Qty: {product.qty != null ? product.qty : 0}
          </span>
        </div>
      </div>

      {/* Chevron */}
      {!selected && (
        <Icon name="chevron_right" size={18} className="text-on-surface-variant flex-shrink-0" />
      )}
    </button>
  );
}
