import type { CapturedImage } from '../types';
import { PhotoPreview } from './PhotoPreview';
import { StickyBottomCTA } from './StickyBottomCTA';
import { MD3Card } from './md3/MD3Card';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';

interface Props {
  barcode: string;
  mrp: string | null;
  qty?: number | null;
  images: CapturedImage[];
  onNext: () => void;
  onDone: () => void;
}

export function ConfirmationView({ barcode, mrp, qty, images, onNext, onDone }: Props) {
  const groupedByTag = images.reduce<Record<string, CapturedImage[]>>((acc, img) => {
    (acc[img.tag] ??= []).push(img);
    return acc;
  }, {});

  return (
    <div className="w-full max-w-sm mx-auto space-y-4 pb-40">
      <div className="text-center">
        <div className="w-14 h-14 bg-success-container rounded-full flex items-center justify-center mx-auto mb-2">
          <Icon name="check" size={28} className="text-success" />
        </div>
        <h2 className="text-lg font-semibold text-on-surface">Product Saved</h2>
      </div>

      <MD3Card variant="outlined">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Barcode</span>
            <span className="font-mono font-medium text-on-surface">{barcode}</span>
          </div>
          {mrp && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">MRP</span>
              <span className="font-medium text-on-surface">&#8377;{mrp}</span>
            </div>
          )}
          {qty != null && (
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Qty</span>
              <span className="font-medium text-on-surface">{qty}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Photos</span>
            <span className="font-medium text-on-surface">{images.length}</span>
          </div>
        </div>
      </MD3Card>

      <div className="space-y-2">
        {Object.entries(groupedByTag).map(([tag, imgs]) => (
          <div key={tag}>
            <p className="text-xs text-on-surface-variant mb-1 font-medium uppercase">{tag}</p>
            <div className="flex gap-2 flex-wrap">
              {imgs.map((img, i) => (
                <PhotoPreview key={i} blob={img.blob} size="sm" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <StickyBottomCTA>
        <div className="flex gap-3">
          <MD3Button variant="outlined" onClick={onDone} fullWidth>
            View All
          </MD3Button>
          <MD3Button variant="filled" onClick={onNext} fullWidth>
            Next Product
          </MD3Button>
        </div>
      </StickyBottomCTA>
    </div>
  );
}
