import { useReducer, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useProducts } from '../hooks/useProducts';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { PhotoCapture } from '../components/PhotoCapture';
import { MrpInput } from '../components/MrpInput';
import { QtyInput } from '../components/QtyInput';
import { ConfirmationView } from '../components/ConfirmationView';
import { PhotoPreview } from '../components/PhotoPreview';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { MD3Button } from '../components/md3/MD3Button';
import { MD3Card } from '../components/md3/MD3Card';
import { MD3Chip } from '../components/md3/MD3Chip';
import { Icon } from '../components/md3/Icon';
import { blobToObjectUrl, revokeObjectUrl } from '../utils/imageUtils';
import { PRESET_TAGS } from '../types';
import type { CapturedImage, CaptureMode, DuplicateInfo } from '../types';

type Step = 'scanning' | 'duplicate_prompt' | 'photographing' | 'mrp_input' | 'qty_input' | 'confirming';

interface State {
  step: Step;
  barcode: string;
  images: CapturedImage[];
  mrp: string | null;
  qty: number | null;
  photoIndex: number;
  mergeTargetId: number | null;
  replaceMode: boolean;
  selectedTag: string;
  duplicates: DuplicateInfo[];
}

type Action =
  | { type: 'SCAN'; barcode: string }
  | { type: 'DUPLICATE_FOUND'; barcode: string; duplicates: DuplicateInfo[] }
  | { type: 'RESHOOT_CHOSEN'; productId: number }
  | { type: 'NEW_PRODUCT_CHOSEN' }
  | { type: 'CAPTURE'; blob: Blob; captureMode: CaptureMode; askMrp: boolean; askQty: boolean; allTags: string[] }
  | { type: 'SELECT_TAG'; tag: string }
  | { type: 'SET_MRP'; mrp: string | null; askQty: boolean }
  | { type: 'SET_QTY'; qty: number | null }
  | { type: 'DONE_ADDING'; askMrp: boolean }
  | { type: 'RESET' };

const initialState: State = {
  step: 'scanning',
  barcode: '',
  images: [],
  mrp: null,
  qty: null,
  photoIndex: 0,
  mergeTargetId: null,
  replaceMode: false,
  selectedTag: 'Front',
  duplicates: [],
};

function getNextTag(currentTag: string, allTags: string[]): string {
  const idx = allTags.indexOf(currentTag);
  if (idx < 0 || idx >= allTags.length - 1) return allTags[0];
  return allTags[idx + 1];
}

function nextStepAfterPhotos(askMrp: boolean, askQty: boolean, isReshoot: boolean): Step {
  if (isReshoot) return 'confirming'; // reshoot skips MRP & qty
  if (askMrp) return 'mrp_input';
  if (askQty) return 'qty_input';
  return 'confirming';
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SCAN':
      return { ...initialState, step: 'photographing', barcode: action.barcode };

    case 'DUPLICATE_FOUND':
      return { ...initialState, step: 'duplicate_prompt', barcode: action.barcode, duplicates: action.duplicates };

    case 'RESHOOT_CHOSEN':
      return { ...state, step: 'photographing', mergeTargetId: action.productId, replaceMode: true, duplicates: [] };

    case 'NEW_PRODUCT_CHOSEN':
      return { ...state, step: 'photographing', mergeTargetId: null, replaceMode: false, duplicates: [] };

    case 'CAPTURE': {
      const newImages = [...state.images, { blob: action.blob, tag: state.selectedTag }];
      const newIndex = state.photoIndex + 1;
      const isReshoot = !!state.mergeTargetId;
      const nextTag = getNextTag(state.selectedTag, action.allTags);

      if (action.captureMode === 'single') {
        return {
          ...state,
          images: newImages,
          photoIndex: newIndex,
          step: nextStepAfterPhotos(action.askMrp, action.askQty, isReshoot),
          selectedTag: 'Front',
        };
      }

      if (action.captureMode === 'front-back') {
        if (state.photoIndex === 0) {
          return {
            ...state,
            images: newImages,
            photoIndex: newIndex,
            step: 'photographing',
            selectedTag: nextTag,
          };
        }
        return {
          ...state,
          images: newImages,
          photoIndex: newIndex,
          step: nextStepAfterPhotos(action.askMrp, action.askQty, isReshoot),
        };
      }

      // front-back-more: keep photographing, auto-advance tag
      return {
        ...state,
        images: newImages,
        photoIndex: newIndex,
        step: 'photographing',
        selectedTag: nextTag,
      };
    }

    case 'SELECT_TAG':
      return { ...state, selectedTag: action.tag };

    case 'SET_MRP':
      return { ...state, mrp: action.mrp, step: action.askQty ? 'qty_input' : 'confirming' };

    case 'SET_QTY':
      return { ...state, qty: action.qty, step: 'confirming' };

    case 'DONE_ADDING': {
      const isReshoot = !!state.mergeTargetId;
      return { ...state, step: isReshoot ? 'confirming' : (action.askMrp ? 'mrp_input' : 'confirming') };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Small thumbnail component for duplicate prompt
function DuplicateThumb({ blob }: { blob: Blob | null }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!blob) return;
    const u = blobToObjectUrl(blob);
    setUrl(u);
    return () => revokeObjectUrl(u);
  }, [blob]);

  if (!url) {
    return (
      <div className="w-12 h-12 rounded-[var(--md-shape-xs)] bg-surface-container flex items-center justify-center text-on-surface-variant text-lg">
        📷
      </div>
    );
  }

  return <img src={url} alt="" className="w-12 h-12 rounded-[var(--md-shape-xs)] object-cover" />;
}

// Tag step indicator — shows prev / current / next with counts
function TagStepIndicator({
  allTags,
  selectedTag,
  images,
  onChangeTag,
}: {
  allTags: string[];
  selectedTag: string;
  images: CapturedImage[];
  onChangeTag: (tag: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const tagCounts: Record<string, number> = {};
  for (const img of images) {
    tagCounts[img.tag] = (tagCounts[img.tag] || 0) + 1;
  }

  const currentIdx = allTags.indexOf(selectedTag);
  const prevTag = currentIdx > 0 ? allTags[currentIdx - 1] : null;
  const nextTag = currentIdx < allTags.length - 1 ? allTags[currentIdx + 1] : null;

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="flex items-center justify-center gap-1">
        {/* Previous tag */}
        {prevTag ? (
          <button
            onClick={() => onChangeTag(prevTag)}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-on-surface-variant/50 transition-colors"
          >
            <span>{prevTag}</span>
            {(tagCounts[prevTag] || 0) > 0 && (
              <span className="bg-surface-container-high text-on-surface-variant text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {tagCounts[prevTag]}
              </span>
            )}
          </button>
        ) : (
          <div className="w-16" />
        )}

        <Icon name="chevron_right" size={14} className="text-on-surface-variant/30" />

        {/* Current tag — highlighted, tappable to change */}
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary text-sm font-medium shadow-sm transition-all active:scale-95"
        >
          <span>{selectedTag}</span>
          {(tagCounts[selectedTag] || 0) > 0 && (
            <span className="bg-on-primary/20 text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {tagCounts[selectedTag]}
            </span>
          )}
          <Icon name="expand_more" size={14} />
        </button>

        <Icon name="chevron_right" size={14} className="text-on-surface-variant/30" />

        {/* Next tag */}
        {nextTag ? (
          <button
            onClick={() => onChangeTag(nextTag)}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-on-surface-variant/50 transition-colors"
          >
            <span>{nextTag}</span>
            {(tagCounts[nextTag] || 0) > 0 && (
              <span className="bg-surface-container-high text-on-surface-variant text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {tagCounts[nextTag]}
              </span>
            )}
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Tag picker dropdown */}
      {pickerOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 bg-surface border border-outline-variant rounded-[var(--md-shape-md)] shadow-lg p-2 min-w-[220px]">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wide mb-1.5 px-1">Change position</p>
          <div className="flex flex-wrap gap-1">
            {allTags.map((t) => (
              <MD3Chip
                key={t}
                label={`${t}${tagCounts[t] ? ` (${tagCounts[t]})` : ''}`}
                selected={selectedTag === t}
                onClick={() => {
                  onChangeTag(t);
                  setPickerOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CapturePage() {
  const { settings } = useSettings();
  const { createProduct, replaceAllImages, getDuplicateInfo } = useProducts();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);

  const { captureMode, askMrp, askQty } = settings;
  const allTags = [...PRESET_TAGS, ...settings.customTags];

  const handleScan = useCallback(async (barcode: string) => {
    if (navigator.vibrate) navigator.vibrate(100);
    const duplicates = await getDuplicateInfo(barcode);
    if (duplicates.length > 0) {
      dispatch({ type: 'DUPLICATE_FOUND', barcode, duplicates });
    } else {
      dispatch({ type: 'SCAN', barcode });
    }
  }, [getDuplicateInfo]);

  const handleCapture = useCallback(
    (blob: Blob) => {
      dispatch({ type: 'CAPTURE', blob, captureMode, askMrp, askQty, allTags });
    },
    [captureMode, askMrp, askQty, allTags],
  );

  const handleTagSelect = useCallback((tag: string) => {
    dispatch({ type: 'SELECT_TAG', tag });
  }, []);

  const handleDoneAdding = useCallback(() => {
    dispatch({ type: 'DONE_ADDING', askMrp });
  }, [askMrp]);

  const handleMrp = useCallback((mrp: string | null) => {
    dispatch({ type: 'SET_MRP', mrp, askQty });
  }, [askQty]);

  const handleQty = useCallback((qty: number | null) => {
    dispatch({ type: 'SET_QTY', qty });
  }, []);

  const handleSave = useCallback(async () => {
    if (state.replaceMode && state.mergeTargetId) {
      await replaceAllImages(state.mergeTargetId, state.images);
    } else {
      await createProduct(state.barcode, state.mrp, state.images, state.qty);
    }
  }, [createProduct, replaceAllImages, state]);

  const handleNext = useCallback(async () => {
    await handleSave();
    dispatch({ type: 'RESET' });
  }, [handleSave]);

  const handleDone = useCallback(async () => {
    await handleSave();
    navigate('/products');
  }, [handleSave, navigate]);

  const getPhotoLabel = () => {
    if (captureMode === 'single') return 'Take product photo';
    if (captureMode === 'front-back') {
      return state.photoIndex === 0 ? 'Take FRONT photo' : 'Take BACK photo';
    }
    return `Take photo (${state.images.length + 1})`;
  };

  // Build tag step indicator to pass as bottomSlot
  const tagIndicator = (
    <TagStepIndicator
      allTags={allTags}
      selectedTag={state.selectedTag}
      images={state.images}
      onChangeTag={handleTagSelect}
    />
  );

  return (
    <div className="px-4 pt-2 flex flex-col items-center h-[calc(100vh-5rem)] overflow-hidden">
      {/* Barcode + thumbnail strip — compact top bar */}
      {state.barcode && state.step !== 'scanning' && state.step !== 'duplicate_prompt' && (
        <div className="w-full max-w-sm mb-2 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-surface rounded-[var(--md-shape-sm)] px-3 py-1.5 border border-outline-variant flex-shrink-0">
            <span className="text-[10px] text-on-surface-variant uppercase">BC</span>
            <span className="text-sm font-mono font-medium text-on-surface">{state.barcode}</span>
          </div>
          {state.images.length > 0 && state.step !== 'confirming' && (
            <div className="flex gap-1.5 overflow-x-auto flex-1 min-w-0">
              {state.images.map((img, i) => (
                <PhotoPreview key={i} blob={img.blob} tag={img.tag || '?'} size="sm" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-auto">
        {state.step === 'scanning' && <BarcodeScanner onScan={handleScan} />}

        {state.step === 'duplicate_prompt' && (
          <div className="w-full max-w-sm mx-auto space-y-4 pb-40">
            <MD3Card variant="outlined">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-on-surface">
                  <Icon name="inventory" size={20} className="text-primary" />
                  <span className="font-medium">Barcode already exists</span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  <span className="font-mono font-medium">{state.barcode}</span> has {state.duplicates.length} existing product{state.duplicates.length > 1 ? 's' : ''}.
                </p>
              </div>
            </MD3Card>

            {/* Existing products list */}
            <div className="space-y-2">
              {state.duplicates.map((dup) => (
                <MD3Card key={dup.product.id} variant="outlined">
                  <div className="p-3 flex items-center gap-3">
                    <DuplicateThumb blob={dup.thumbBlob} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface">
                        {dup.product.mrp ? `₹${dup.product.mrp}` : 'No MRP'}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {dup.imageCount} photo{dup.imageCount !== 1 ? 's' : ''} · {dup.product.capturedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => dispatch({ type: 'RESHOOT_CHOSEN', productId: dup.product.id! })}
                        className="px-2.5 py-1.5 text-xs font-medium text-error bg-error-container rounded-full"
                      >
                        Reshoot
                      </button>
                      <button
                        onClick={() => navigate(`/products/${dup.product.id}`)}
                        className="px-2.5 py-1.5 text-xs font-medium text-primary bg-primary-container rounded-full"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </MD3Card>
              ))}
            </div>

            <StickyBottomCTA>
              <MD3Button
                variant="filled"
                fullWidth
                onClick={() => dispatch({ type: 'NEW_PRODUCT_CHOSEN' })}
              >
                <span className="flex items-center justify-center gap-2 text-sm">
                  <Icon name="add" size={16} />
                  New Product
                </span>
              </MD3Button>
              <MD3Button variant="text" fullWidth onClick={() => dispatch({ type: 'RESET' })}>
                Cancel
              </MD3Button>
            </StickyBottomCTA>
          </div>
        )}

        {state.step === 'photographing' && (
          <div className="w-full space-y-4">
            <PhotoCapture
              onCapture={handleCapture}
              label={getPhotoLabel()}
              bottomSlot={tagIndicator}
            />

            {captureMode === 'front-back-more' && state.images.length > 0 && (
              <div className="max-w-sm mx-auto">
                <MD3Button variant="filled" fullWidth onClick={handleDoneAdding}>
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="check" size={18} />
                    Done Adding Photos ({state.images.length} taken)
                  </span>
                </MD3Button>
              </div>
            )}
          </div>
        )}

        {state.step === 'mrp_input' && state.images.length > 0 && (
          <MrpInput imageBlob={state.images[0].blob} onSubmit={handleMrp} />
        )}

        {state.step === 'qty_input' && (
          <QtyInput onSubmit={handleQty} />
        )}

        {state.step === 'confirming' && (
          <ConfirmationView
            barcode={state.barcode}
            mrp={state.mrp}
            qty={state.qty}
            images={state.images}
            onNext={handleNext}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
}
