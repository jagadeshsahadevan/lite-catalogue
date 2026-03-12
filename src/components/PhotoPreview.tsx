import { useEffect, useState } from 'react';
import { blobToObjectUrl, revokeObjectUrl } from '../utils/imageUtils';

interface Props {
  blob: Blob;
  tag?: string;
  size?: 'sm' | 'md' | 'lg';
  onRemove?: () => void;
}

export function PhotoPreview({ blob, tag, size = 'md', onRemove }: Props) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const objectUrl = blobToObjectUrl(blob);
    setUrl(objectUrl);
    return () => revokeObjectUrl(objectUrl);
  }, [blob]);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-full aspect-square max-w-[200px]',
  };

  return (
    <div className="relative inline-block">
      {url && (
        <img
          src={url}
          alt={tag || 'Product photo'}
          className={`${sizeClasses[size]} object-cover rounded-[var(--md-shape-sm)] border border-outline-variant`}
        />
      )}
      {tag && (
        <span className="absolute bottom-0 left-0 right-0 text-center text-xs bg-black/60 text-white py-0.5 rounded-b-[var(--md-shape-sm)]">
          {tag}
        </span>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-error text-on-error rounded-full text-xs flex items-center justify-center"
        >
          X
        </button>
      )}
    </div>
  );
}
