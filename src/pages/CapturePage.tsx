import { useReducer, useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useTour } from '../context/TourContext';
import { useProducts } from '../hooks/useProducts';
import { useDropdownSync } from '../hooks/useDropdownSync';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { PhotoCapture } from '../components/PhotoCapture';
import { ProductDetailsInput } from '../components/ProductDetailsInput';
import { ConfirmationView } from '../components/ConfirmationView';
import { PhotoPreview } from '../components/PhotoPreview';
import { StickyBottomCTA } from '../components/StickyBottomCTA';
import { MD3Button } from '../components/md3/MD3Button';
import { MD3Card } from '../components/md3/MD3Card';
import { MD3Chip } from '../components/md3/MD3Chip';
import { Icon } from '../components/md3/Icon';
import { blobToObjectUrl, revokeObjectUrl } from '../utils/imageUtils';
import { sanitizeBarcode } from '../utils/constants';
import { PRESET_TAGS } from '../types';
import type { CapturedImage, CaptureMode, DuplicateInfo } from '../types';

type Step = 'scanning' | 'duplicate_prompt' | 'photographing' | 'details_input' | 'confirming';

interface State {
  step: Step;
  barcode: string;
  images: CapturedImage[];
  mrp: string | null;
  qty: number | null;
  brand: string | null;
  category: string | null;
  customData: Record<string, string | null>;
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
  | { type: 'CAPTURE'; blob: Blob; captureMode: CaptureMode; hasDetails: boolean; allTags: string[] }
  | { type: 'SELECT_TAG'; tag: string }
  | { type: 'SET_DETAILS'; mrp: string | null; qty: number | null; brand: string | null; category: string | null; customData: Record<string, string | null> }
  | { type: 'DONE_ADDING'; hasDetails: boolean }
  | { type: 'BACK_TO_PHOTOS' }
  | { type: 'DELETE_IMAGE'; index: number }
  | { type: 'RESET' };

const initialState: State = {
  step: 'scanning',
  barcode: '',
  images: [],
  mrp: null,
  qty: null,
  brand: null,
  category: null,
  customData: {},
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

function nextStepAfterPhotos(hasDetails: boolean, isReshoot: boolean): Step {
  if (isReshoot) return 'confirming';
  if (hasDetails) return 'details_input';
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
          step: nextStepAfterPhotos(action.hasDetails, isReshoot),
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
          step: nextStepAfterPhotos(action.hasDetails, isReshoot),
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

    case 'SET_DETAILS':
      return { ...state, mrp: action.mrp, qty: action.qty, brand: action.brand, category: action.category, customData: action.customData, step: 'confirming' };

    case 'DONE_ADDING': {
      const isReshoot = !!state.mergeTargetId;
      return { ...state, step: nextStepAfterPhotos(action.hasDetails, isReshoot) };
    }

    case 'BACK_TO_PHOTOS':
      return { ...state, step: 'photographing' };

    case 'DELETE_IMAGE': {
      const newImages = state.images.filter((_, i) => i !== action.index);
      return { ...state, images: newImages, photoIndex: newImages.length };
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

const SUPPRESS_DELETE_WARN_KEY = 'liteCat_suppressDeleteWarn';

export function CapturePage() {
  const { settings } = useSettings();
  const { createProduct, replaceAllImages, getDuplicateInfo, getDistinctBrands, getDistinctCategories, getDistinctCustomFieldValues, getLastUsedBrand, getLastUsedCategory } = useProducts();
  const { registerAutoScan, startTour, isActive: tourActive } = useTour();
  const { syncDropdownValues } = useDropdownSync();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);

  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [lastBrand, setLastBrand] = useState('');
  const [lastCategory, setLastCategory] = useState('');
  const [customFieldOptionsMap, setCustomFieldOptionsMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    getDistinctBrands().then((db) => {
      const merged = [...new Set([...(settings.brandOptions ?? []), ...db])].sort((a, b) => a.localeCompare(b));
      setBrandOptions(merged);
    });
    getDistinctCategories().then((db) => {
      const merged = [...new Set([...(settings.categoryOptions ?? []), ...db])].sort((a, b) => a.localeCompare(b));
      setCategoryOptions(merged);
    });
    getLastUsedBrand().then(setLastBrand);
    getLastUsedCategory().then(setLastCategory);
    // Load DB distinct values for custom dropdown fields
    const dropdownFields = (settings.customFields ?? []).filter((f) => f.type === 'dropdown' && f.enabled);
    Promise.all(
      dropdownFields.map(async (cf) => {
        const dbVals = await getDistinctCustomFieldValues(cf.id);
        return [cf.id, dbVals] as const;
      }),
    ).then((entries) => {
      const map: Record<string, string[]> = {};
      for (const [id, vals] of entries) map[id] = vals;
      setCustomFieldOptionsMap(map);
    });
  }, [getDistinctBrands, getDistinctCategories, getDistinctCustomFieldValues, getLastUsedBrand, getLastUsedCategory, settings.brandOptions, settings.categoryOptions, settings.customFields]);

  const [selectedThumbIdx, setSelectedThumbIdx] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ index: number } | null>(null);
  const [suppressWarn, setSuppressWarn] = useState(false);
  const suppressRef = useRef(
    () => localStorage.getItem(SUPPRESS_DELETE_WARN_KEY) === 'true',
  );

  const handleThumbTap = useCallback((index: number) => {
    setSelectedThumbIdx((prev) => {
      if (prev === index) {
        if (suppressRef.current()) {
          dispatch({ type: 'DELETE_IMAGE', index });
          return null;
        }
        setDeleteConfirm({ index });
        return prev;
      }
      return index;
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    if (suppressWarn) {
      localStorage.setItem(SUPPRESS_DELETE_WARN_KEY, 'true');
      suppressRef.current = () => true;
    }
    dispatch({ type: 'DELETE_IMAGE', index: deleteConfirm.index });
    setDeleteConfirm(null);
    setSelectedThumbIdx(null);
    setSuppressWarn(false);
  }, [deleteConfirm, suppressWarn]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirm(null);
    setSelectedThumbIdx(null);
    setSuppressWarn(false);
  }, []);

  const { captureMode, askMrp, askQty, askBrand, askCategory } = settings;
  const enabledCustomFields = (settings.customFields ?? []).filter((f) => f.enabled);
  const hasDetails = askMrp || askQty || askBrand || askCategory || enabledCustomFields.length > 0;
  const allTags = [...PRESET_TAGS, ...settings.customTags];

  const handleScan = useCallback(async (raw: string) => {
    const barcode = sanitizeBarcode(raw);
    if (!barcode) return;
    if (settings.hapticFeedback && navigator.vibrate) navigator.vibrate(100);
    const duplicates = await getDuplicateInfo(barcode);
    if (duplicates.length > 0) {
      dispatch({ type: 'DUPLICATE_FOUND', barcode, duplicates });
    } else {
      dispatch({ type: 'SCAN', barcode });
    }
  }, [getDuplicateInfo, settings.hapticFeedback]);

  useEffect(() => {
    registerAutoScan((barcode: string) => {
      if (state.step === 'scanning') {
        dispatch({ type: 'SCAN', barcode });
      }
    });
  }, [registerAutoScan, state.step]);

  const handleCapture = useCallback(
    (blob: Blob) => {
      dispatch({ type: 'CAPTURE', blob, captureMode, hasDetails, allTags });
    },
    [captureMode, hasDetails, allTags],
  );

  const handleTagSelect = useCallback((tag: string) => {
    dispatch({ type: 'SELECT_TAG', tag });
  }, []);

  const handleDoneAdding = useCallback(() => {
    dispatch({ type: 'DONE_ADDING', hasDetails });
  }, [hasDetails]);

  const handleDetails = useCallback((data: { mrp: string | null; qty: number | null; brand: string | null; category: string | null; customData: Record<string, string | null> }) => {
    dispatch({ type: 'SET_DETAILS', ...data });
  }, []);

  const handleBackToPhotos = useCallback(() => {
    dispatch({ type: 'BACK_TO_PHOTOS' });
  }, []);

  const handleSave = useCallback(async () => {
    if (state.replaceMode && state.mergeTargetId) {
      await replaceAllImages(state.mergeTargetId, state.images);
    } else {
      await createProduct(state.barcode, state.mrp, state.images, state.qty, state.brand, state.category, state.customData);
    }
    syncDropdownValues({ brand: state.brand, category: state.category, customData: state.customData });
    getDistinctBrands().then((db) => {
      const merged = [...new Set([...(settings.brandOptions ?? []), ...db])].sort((a, b) => a.localeCompare(b));
      setBrandOptions(merged);
    });
    getDistinctCategories().then((db) => {
      const merged = [...new Set([...(settings.categoryOptions ?? []), ...db])].sort((a, b) => a.localeCompare(b));
      setCategoryOptions(merged);
    });
    if (state.brand) setLastBrand(state.brand);
    if (state.category) setLastCategory(state.category);
  }, [createProduct, replaceAllImages, state, getDistinctBrands, getDistinctCategories, syncDropdownValues]);

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
    <div className="relative px-4 pt-2 pb-2 flex flex-col items-center h-full overflow-hidden">
      {/* Tour help icon — top right */}
      {!tourActive && (
        <button
          onClick={startTour}
          className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full text-on-surface"
          title="Capture guide"
        >
          <Icon name="help" size={22} />
        </button>
      )}
      {/* Barcode + thumbnail strip — compact top bar */}
      {state.barcode && state.step !== 'scanning' && state.step !== 'duplicate_prompt' && (
        <div className="w-full max-w-sm mb-2 flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-surface rounded-[var(--md-shape-sm)] px-3 py-1.5 border border-outline-variant flex-shrink-0">
            <span className="text-[10px] text-on-surface-variant uppercase">BC</span>
            <span className="text-sm font-mono font-medium text-on-surface">{state.barcode}</span>
          </div>
          {state.images.length > 0 && state.step !== 'confirming' && (
            <div className="flex gap-1.5 overflow-x-auto flex-1 min-w-0">
              {state.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => handleThumbTap(i)}
                  className={`relative flex-shrink-0 rounded-[var(--md-shape-sm)] transition-all ${
                    selectedThumbIdx === i
                      ? 'ring-2 ring-error scale-95'
                      : ''
                  }`}
                >
                  <PhotoPreview blob={img.blob} tag={img.tag || '?'} size="sm" />
                  {selectedThumbIdx === i && (
                    <div className="absolute inset-0 bg-error/30 rounded-[var(--md-shape-sm)] flex items-center justify-center">
                      <Icon name="delete" size={20} className="text-white drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 flex flex-col w-full min-h-0">
        {state.step === 'scanning' && (
          <div className="flex-1 flex items-center justify-center">
            <BarcodeScanner onScan={handleScan} />
          </div>
        )}

        {state.step === 'duplicate_prompt' && (
          <div className="w-full max-w-sm mx-auto space-y-4 overflow-y-auto pb-24 pt-2">
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
          <div className="w-full flex flex-col flex-1 min-h-0">
            <PhotoCapture
              onCapture={handleCapture}
              label={getPhotoLabel()}
              bottomSlot={tagIndicator}
              onDone={
                state.images.length > 0
                  ? handleDoneAdding
                  : null
              }
              doneLabel={`Done (${state.images.length})`}
            />
          </div>
        )}

        {state.step === 'details_input' && (
          <div className="pt-4 overflow-y-auto">
            <ProductDetailsInput
              askMrp={askMrp}
              askQty={askQty}
              askBrand={askBrand}
              askCategory={askCategory}
              autoMrpDetect={settings.autoMrpDetection}
              imageBlob={state.images.length > 0 ? state.images[0].blob : null}
              imageCount={state.images.length}
              brandOptions={brandOptions}
              categoryOptions={categoryOptions}
              lastBrand={lastBrand}
              lastCategory={lastCategory}
              fieldOrder={settings.fieldOrder ?? ['mrp', 'qty', 'brand', 'category']}
              customFields={settings.customFields ?? []}
              customFieldOptionsMap={customFieldOptionsMap}
              onSubmit={handleDetails}
              onAddMorePhotos={handleBackToPhotos}
            />
          </div>
        )}

        {state.step === 'confirming' && (
          <div className="overflow-y-auto pb-24 pt-2">
            <ConfirmationView
              barcode={state.barcode}
              mrp={state.mrp}
              qty={state.qty}
              brand={state.brand}
              category={state.category}
              customData={state.customData}
              customFields={settings.customFields ?? []}
              images={state.images}
              onNext={handleNext}
              onDone={handleDone}
            />
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={cancelDelete}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-surface rounded-[var(--md-shape-lg)] w-[min(90%,320px)] p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-on-surface">Delete photo?</h3>
            <p className="text-sm text-on-surface-variant">
              This will remove the captured photo. You can retake it.
            </p>

            <label className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={suppressWarn}
                onChange={(e) => setSuppressWarn(e.target.checked)}
                className="w-5 h-5 rounded border-outline accent-primary"
              />
              <span className="text-sm text-on-surface-variant">Don't warn me again</span>
            </label>

            <div className="flex gap-3 pt-1">
              <MD3Button variant="text" onClick={cancelDelete} className="flex-1">
                Cancel
              </MD3Button>
              <MD3Button variant="filled" onClick={confirmDelete} className="flex-1 !bg-error">
                Delete
              </MD3Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
