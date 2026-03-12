import { useEffect, useState } from 'react';
import { MD3Button } from './md3/MD3Button';
import { MD3Chip } from './md3/MD3Chip';
import { Icon } from './md3/Icon';
import {
  calculateImageSize,
  shareProducts,
  formatSize,
  GMAIL_ATTACHMENT_LIMIT,
} from '../utils/shareUtils';
import type { ExportFormat } from '../types';

const FORMAT_OPTIONS: { label: string; value: ExportFormat }[] = [
  { label: 'CSV', value: 'csv' },
  { label: 'TSV', value: 'tsv' },
  { label: 'PSV', value: 'psv' },
];

interface ShareDialogProps {
  productIds: number[];
  target: 'email' | 'gdrive';
  onClose: () => void;
}

export function ShareDialog({ productIds, target, onClose }: ShareDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [imageSize, setImageSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculateImageSize(productIds).then((size) => {
      setImageSize(size);
      setLoading(false);
    });
  }, [productIds]);

  // Estimate log size (~200 bytes per entry per product, rough estimate)
  const logSizeEstimate = productIds.length * 400;
  const totalEstimate = imageSize + logSizeEstimate;
  const overLimit = target === 'email' && totalEstimate > GMAIL_ATTACHMENT_LIMIT;

  const handleShare = async () => {
    setSharing(true);
    setError(null);
    const result = await shareProducts(productIds, format, target);
    setSharing(false);
    if (result.success) {
      onClose();
    } else if (result.error && result.error !== 'Share cancelled') {
      setError(result.error);
    }
  };

  const targetLabel = target === 'email' ? 'Email' : 'Google Drive';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="relative bg-surface rounded-t-[var(--md-shape-lg)] w-full max-w-lg p-6 space-y-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-8 h-1 bg-outline-variant rounded-full mx-auto" />

        {/* Title */}
        <h2 className="text-lg font-medium text-on-surface">
          Share {productIds.length} product{productIds.length > 1 ? 's' : ''} via {targetLabel}
        </h2>

        {/* Format picker */}
        <div className="space-y-2">
          <span className="text-xs text-on-surface-variant font-medium">Log format:</span>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((opt) => (
              <MD3Chip
                key={opt.value}
                label={opt.label}
                selected={format === opt.value}
                onClick={() => setFormat(opt.value)}
              />
            ))}
          </div>
        </div>

        {/* Size estimate */}
        <div className="bg-surface-container rounded-[var(--md-shape-sm)] p-3 space-y-1.5">
          {loading ? (
            <span className="text-sm text-on-surface-variant">Calculating size...</span>
          ) : (
            <>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Images</span>
                <span className="font-medium text-on-surface">{formatSize(imageSize)}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Log file</span>
                <span className="font-medium text-on-surface">~{formatSize(logSizeEstimate)}</span>
              </div>
              <div className="border-t border-outline-variant pt-1.5 flex justify-between text-sm">
                <span className="font-medium text-on-surface">Total</span>
                <span className="font-semibold text-on-surface">~{formatSize(totalEstimate)}</span>
              </div>
            </>
          )}
        </div>

        {/* Warning */}
        {overLimit && (
          <div className="flex items-start gap-2 bg-error-container rounded-[var(--md-shape-sm)] p-3">
            <Icon name="warning" size={18} className="text-error mt-0.5 flex-shrink-0" />
            <p className="text-sm text-on-error-container">
              Total exceeds Gmail's 25 MB limit. Consider using Google Drive instead.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-error-container rounded-[var(--md-shape-sm)] p-3">
            <Icon name="error" size={18} className="text-error mt-0.5 flex-shrink-0" />
            <p className="text-sm text-on-error-container">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <MD3Button variant="text" onClick={onClose} className="flex-1">
            Cancel
          </MD3Button>
          <MD3Button
            variant="filled"
            onClick={handleShare}
            disabled={sharing || loading || (overLimit && target === 'email')}
            className="flex-1"
          >
            <span className="flex items-center justify-center gap-2">
              {sharing ? (
                'Preparing...'
              ) : (
                <>
                  <Icon name={target === 'email' ? 'mail' : 'cloud_upload'} size={18} />
                  Share
                </>
              )}
            </span>
          </MD3Button>
        </div>
      </div>
    </div>
  );
}
