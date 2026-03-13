import { useState, useRef, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useTour } from '../context/TourContext';

import { MD3Card } from '../components/md3/MD3Card';
import { MD3Switch } from '../components/md3/MD3Switch';
import { MD3TopBar } from '../components/md3/MD3TopBar';
import { MD3Button } from '../components/md3/MD3Button';
import { Icon } from '../components/md3/Icon';
import { CustomFieldDialog } from '../components/CustomFieldDialog';
import { BuiltinFieldOptionsDialog } from '../components/BuiltinFieldOptionsDialog';
import type { CaptureMode, AppSettings, CustomFieldDef } from '../types';
import { BUILTIN_FIELD_IDS, DEFAULT_SETTINGS, SETTINGS_EXPORT_KEYS } from '../types';

const modeOptions: { value: CaptureMode; label: string }[] = [
  { value: 'single', label: 'Single Photo' },
  { value: 'front-back', label: 'Front & Back' },
  { value: 'front-back-more', label: 'Front, Back & More' },
];

const BUILTIN_META: Record<string, { label: string; desc: string }> = {
  mrp: { label: 'MRP', desc: 'Product price' },
  qty: { label: 'Quantity', desc: 'Stock quantity' },
  brand: { label: 'Brand', desc: 'Brand name' },
  category: { label: 'Category', desc: 'Product category' },
};

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { deferredPrompt, isIOS, isAndroid, promptInstall, dismissInstallPrompt, showInstallSection } = useInstallPrompt();
  const { startSettingsTour, isActive } = useTour();
  const [whyOpen, setWhyOpen] = useState(false);
  const [addToHomeOpen, setAddToHomeOpen] = useState(false);
  const [editingField, setEditingField] = useState<'phone' | 'brand' | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [importMessage, setImportMessage] = useState<'success' | 'error' | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [customFieldDialog, setCustomFieldDialog] = useState<CustomFieldDef | null | 'add'>(null);
  const [deleteFieldConfirm, setDeleteFieldConfirm] = useState<CustomFieldDef | null>(null);
  const [builtinOptionsDialog, setBuiltinOptionsDialog] = useState<'brand' | 'category' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (field: 'phone' | 'brand') => {
    setFieldValue(field === 'phone' ? settings.phoneNumber : settings.brandName);
    setEditingField(field);
  };

  const saveField = () => {
    if (!editingField) return;
    if (editingField === 'phone') {
      const trimmed = fieldValue.trim();
      if (trimmed && !/^\d{10}$/.test(trimmed)) return; // Must be empty or exactly 10 digits
    }
    const key = editingField === 'phone' ? 'phoneNumber' : 'brandName';
    updateSettings({ [key]: fieldValue.trim() });
    setEditingField(null);
  };

  const handlePhoneChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 10);
    setFieldValue(digits);
  };

  const builtinFieldOrder = ['mrp', 'qty', 'brand', 'category'] as const;

  const getFieldEnabled = (id: string): boolean => {
    if (id === 'mrp') return settings.askMrp;
    if (id === 'qty') return settings.askQty;
    if (id === 'brand') return settings.askBrand;
    if (id === 'category') return settings.askCategory;
    return false;
  };

  const toggleFieldEnabled = (id: string, value: boolean) => {
    if (id === 'mrp') { updateSettings({ askMrp: value }); return; }
    if (id === 'qty') { updateSettings({ askQty: value }); return; }
    if (id === 'brand') { updateSettings({ askBrand: value }); return; }
    if (id === 'category') { updateSettings({ askCategory: value }); return; }
  };

  const handleSaveCustomField = useCallback(
    (data: Omit<CustomFieldDef, 'id'> & { id?: string }) => {
      const customFields = settings.customFields ?? [];
      const order = settings.fieldOrder ?? [...BUILTIN_FIELD_IDS];
      if (data.id) {
        const next = customFields.map((f) =>
          f.id === data.id ? { ...f, ...data, id: f.id } : f
        );
        updateSettings({ customFields: next });
      } else {
        const id = `custom-${Date.now()}`;
        const next = [...customFields, { ...data, id }];
        updateSettings({ customFields: next, fieldOrder: [...order, id] });
      }
      setCustomFieldDialog(null);
    },
    [settings.customFields, settings.fieldOrder, updateSettings]
  );

  const handleDeleteCustomField = useCallback(() => {
    if (!deleteFieldConfirm) return;
    const id = deleteFieldConfirm.id;
    const fields = (settings.customFields ?? []).filter((f) => f.id !== id);
    const order = (settings.fieldOrder ?? []).filter((f) => f !== id);
    updateSettings({ customFields: fields, fieldOrder: order });
    setDeleteFieldConfirm(null);
  }, [deleteFieldConfirm, settings.customFields, settings.fieldOrder, updateSettings]);

  const getFullFieldOrder = useCallback(() => {
    const order = settings.fieldOrder ?? [...BUILTIN_FIELD_IDS];
    const customIds = (settings.customFields ?? []).map((f) => f.id);
    const a = [...order];
    for (const id of customIds) {
      if (!a.includes(id)) a.push(id);
    }
    return a;
  }, [settings.fieldOrder, settings.customFields]);

  const moveField = useCallback(
    (fieldId: string, dir: 'up' | 'down') => {
      const order = getFullFieldOrder().filter((id) => {
        const isBuiltin = BUILTIN_FIELD_IDS.includes(id as (typeof BUILTIN_FIELD_IDS)[number]);
        return isBuiltin || (settings.customFields ?? []).some((f) => f.id === id);
      });
      const i = order.indexOf(fieldId);
      if (i < 0) return;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      updateSettings({ fieldOrder: order });
    },
    [getFullFieldOrder, settings.customFields, updateSettings]
  );

  const exportSettings = () => {
    const toExport: Record<string, unknown> = {};
    for (const key of SETTINGS_EXPORT_KEYS) {
      const val = settings[key];
      if (val !== undefined) toExport[key] = val;
    }
    // customFields includes options (enum choices for dropdowns) — full structure is preserved
    const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lite-catalogue-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isValidSettings = (obj: unknown): obj is Partial<AppSettings> => {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    if (typeof o.captureMode !== 'string' || !['single', 'front-back', 'front-back-more'].includes(o.captureMode)) return false;
    if (o.fieldOrder !== undefined && !Array.isArray(o.fieldOrder)) return false;
    if (o.customFields !== undefined && !Array.isArray(o.customFields)) return false;
    if (o.brandOptions !== undefined && !Array.isArray(o.brandOptions)) return false;
    if (o.categoryOptions !== undefined && !Array.isArray(o.categoryOptions)) return false;
    if (o.customFields && Array.isArray(o.customFields)) {
      for (const cf of o.customFields as unknown[]) {
        if (!cf || typeof cf !== 'object') return false;
        const c = cf as Record<string, unknown>;
        if (typeof c.id !== 'string' || typeof c.name !== 'string' || typeof c.type !== 'string' || typeof c.enabled !== 'boolean') return false;
        if (c.options !== undefined && !Array.isArray(c.options)) return false;
      }
    }
    return true;
  };

  const handleResetSettings = () => {
    const toReset = { ...DEFAULT_SETTINGS };
    if (settings.id) toReset.id = settings.id;
    if (settings.setupComplete) toReset.setupComplete = true;
    if (settings.onboardingComplete) toReset.onboardingComplete = true;
    updateSettings(toReset);
    setShowResetConfirm(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setImportMessage(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Partial<AppSettings>;
        if (!isValidSettings(parsed)) {
          setImportMessage('error');
          return;
        }
        const { id: _id, ...rest } = parsed;
        const toApply: Partial<AppSettings> = {};
        for (const key of SETTINGS_EXPORT_KEYS) {
          let val = (rest as Record<string, unknown>)[key];
          if (val !== undefined) {
            if (key === 'customFields' && Array.isArray(val)) {
              val = val.map((cf: unknown) => {
                const c = cf as Record<string, unknown>;
                if (c.type === 'dropdown' && (!Array.isArray(c.options) || c.options === undefined)) {
                  return { ...c, options: c.options ?? [] };
                }
                return c;
              });
            }
            if ((key === 'brandOptions' || key === 'categoryOptions') && Array.isArray(val)) {
              val = (val as unknown[]).filter((v): v is string => typeof v === 'string' && v.trim() !== '');
            }
            (toApply as Record<string, unknown>)[key] = val;
          }
        }
        updateSettings(toApply);
        setImportMessage('success');
      } catch {
        setImportMessage('error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <MD3TopBar
        title="Settings"
        trailing={
          !isActive && (
            <button
              onClick={startSettingsTour}
              className="w-10 h-10 flex items-center justify-center rounded-full text-on-frame"
              title="Settings guide"
            >
              <Icon name="help" size={22} />
            </button>
          )
        }
      />

      <div className="p-4 space-y-6 max-w-sm mx-auto">
        {/* Profile */}
        <section className="space-y-2" data-tour="tour-settings-profile">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Profile</p>
          <MD3Card variant="outlined" className="p-0 divide-y divide-outline-variant">
            <div className="px-4 py-3">
              {editingField === 'phone' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      inputMode="tel"
                      autoFocus
                      value={fieldValue}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveField()}
                      className="flex-1 text-sm text-on-surface bg-transparent border-b-2 border-primary py-1 focus:outline-none"
                      placeholder="10 digits (optional)"
                    />
                    <button
                      onClick={saveField}
                      disabled={!!(fieldValue.trim() && fieldValue.trim().length !== 10)}
                      className="p-1 disabled:opacity-40"
                    >
                    <Icon name="check" size={20} className="text-primary" />
                  </button>
                  <button onClick={() => setEditingField(null)} className="p-1">
                    <Icon name="close" size={20} className="text-on-surface-variant" />
                  </button>
                  </div>
                  {fieldValue.trim() && fieldValue.trim().length !== 10 && (
                    <p className="text-[10px] text-error">Enter 10 digits</p>
                  )}
                </div>
              ) : (
                <button onClick={() => startEdit('phone')} className="w-full flex items-center justify-between text-left">
                  <div>
                    <p className="text-xs text-on-surface-variant">Mobile Number</p>
                    <p className="text-sm text-on-surface">{settings.phoneNumber || '—'}</p>
                  </div>
                  <Icon name="edit" size={18} className="text-on-surface-variant" />
                </button>
              )}
            </div>

            <div className="px-4 py-3">
              {editingField === 'brand' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveField()}
                    className="flex-1 text-sm text-on-surface bg-transparent border-b-2 border-primary py-1 focus:outline-none"
                    placeholder="Brand / store name"
                  />
                  <button onClick={saveField} className="p-1">
                    <Icon name="check" size={20} className="text-primary" />
                  </button>
                  <button onClick={() => setEditingField(null)} className="p-1">
                    <Icon name="close" size={20} className="text-on-surface-variant" />
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit('brand')} className="w-full flex items-center justify-between text-left">
                  <div>
                    <p className="text-xs text-on-surface-variant">Brand / Store Name</p>
                    <p className="text-sm text-on-surface">{settings.brandName || '—'}</p>
                  </div>
                  <Icon name="edit" size={18} className="text-on-surface-variant" />
                </button>
              )}
            </div>
          </MD3Card>
        </section>

        {/* Capture Mode */}
        <section className="space-y-2" data-tour="tour-settings-capture-mode">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Capture Mode</p>
          <MD3Card variant="outlined" className="p-0 divide-y divide-outline-variant">
            {modeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ captureMode: opt.value })}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm text-on-surface">{opt.label}</span>
                {settings.captureMode === opt.value && (
                  <Icon name="check" size={20} className="text-primary" />
                )}
              </button>
            ))}
          </MD3Card>
        </section>

        {/* Product Fields */}
        <section className="space-y-3" data-tour="tour-settings-field-order">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Product Fields</p>
          <p className="text-[10px] text-on-surface-variant -mt-1">
            Enable fields to collect during capture. Reorder with arrows.
          </p>

          <MD3Card variant="outlined" className="p-0 divide-y divide-outline-variant">
            {getFullFieldOrder()
            .filter((fieldId) => {
              const isBuiltin = builtinFieldOrder.includes(fieldId as typeof builtinFieldOrder[number]);
              if (isBuiltin) return true;
              return (settings.customFields ?? []).some((f) => f.id === fieldId);
            })
            .map((fieldId, idx) => {
            const isBuiltin = builtinFieldOrder.includes(fieldId as typeof builtinFieldOrder[number]);
            const cf = !isBuiltin ? (settings.customFields ?? []).find((f) => f.id === fieldId) : null;
            const label = isBuiltin ? (BUILTIN_META[fieldId]?.label ?? fieldId) : (cf?.name ?? fieldId);
            const enabled = isBuiltin ? getFieldEnabled(fieldId) : (cf?.enabled ?? false);
            const allOrder = getFullFieldOrder();
            const canMoveUp = idx > 0;
            const canMoveDown = idx < allOrder.length - 1;

              const toggleCustomEnabled = (v: boolean) => {
                const next = (settings.customFields ?? []).map((f) =>
                  f.id === fieldId ? { ...f, enabled: v } : f
                );
                updateSettings({ customFields: next });
              };

              return (
                <div key={fieldId} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="flex items-center gap-1 text-on-surface-variant">
                    <button
                      onClick={() => moveField(fieldId, 'up')}
                      disabled={!canMoveUp}
                      className="p-1 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <Icon name="arrow-up" size={18} />
                    </button>
                    <button
                      onClick={() => moveField(fieldId, 'down')}
                      disabled={!canMoveDown}
                      className="p-1 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <Icon name="arrow-down" size={18} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-sm font-medium text-on-surface">{label}</label>
                    {isBuiltin && (
                      <p className="text-[10px] text-on-surface-variant">{BUILTIN_META[fieldId]?.desc}</p>
                    )}
                  </div>
                  {isBuiltin ? (
                    <div className="flex items-center gap-1">
                      <MD3Switch checked={enabled} onChange={(v) => toggleFieldEnabled(fieldId, v)} />
                      {(fieldId === 'brand' || fieldId === 'category') && (
                        <button
                          onClick={() => setBuiltinOptionsDialog(fieldId as 'brand' | 'category')}
                          className="p-1.5 text-on-surface-variant hover:text-on-surface"
                          aria-label={`Edit ${fieldId} options`}
                          title="Edit dropdown options"
                        >
                          <Icon name="edit" size={18} />
                        </button>
                      )}
                    </div>
                  ) : cf ? (
                    <div className="flex items-center gap-1">
                      <MD3Switch checked={enabled} onChange={toggleCustomEnabled} />
                      <button
                        onClick={() => setCustomFieldDialog(cf)}
                        className="p-1.5 text-on-surface-variant hover:text-on-surface"
                        aria-label="Edit"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteFieldConfirm(cf)}
                        className="p-1.5 text-on-surface-variant hover:text-error"
                        aria-label="Delete"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </MD3Card>

          <button
            onClick={() => setCustomFieldDialog('add')}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-outline-variant rounded-[var(--md-shape-sm)] text-sm text-primary font-medium hover:bg-surface-container-low transition-colors"
            data-tour="tour-settings-add-field"
          >
            <Icon name="add" size={20} />
            Add Field
          </button>

          {settings.askMrp && (
            <MD3Card variant="outlined">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">Auto MRP Detection</p>
                  <p className="text-xs text-on-surface-variant">OCR extract price from image</p>
                </div>
                <MD3Switch
                  checked={settings.autoMrpDetection}
                  onChange={(v) => updateSettings({ autoMrpDetection: v })}
                />
              </div>
            </MD3Card>
          )}
        </section>

        {/* Misc Toggles */}
        <section className="space-y-3">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Other</p>
          <MD3Card variant="outlined">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Haptic Feedback</p>
                <p className="text-xs text-on-surface-variant">Vibrate on scan &amp; capture</p>
              </div>
              <MD3Switch
                checked={settings.hapticFeedback}
                onChange={(v) => updateSettings({ hapticFeedback: v })}
              />
            </div>
          </MD3Card>
        </section>

        {/* Export / Import */}
        <section className="space-y-2" data-tour="tour-settings-backup">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Backup &amp; Restore</p>
          <p className="text-xs text-on-surface-variant">
            Download settings to share or restore on a new device.
          </p>
          <MD3Card variant="outlined" className="p-0 divide-y divide-outline-variant">
            <button
              onClick={exportSettings}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm text-on-surface">Download settings</span>
              <Icon name="download" size={20} className="text-on-surface-variant" />
            </button>
            <div className="px-4 py-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="text-sm text-on-surface">Load settings from file</span>
                <Icon name="cloud_upload" size={20} className="text-on-surface-variant" />
              </button>
              {importMessage === 'success' && (
                <p className="text-xs text-primary mt-2">Settings loaded successfully.</p>
              )}
              {importMessage === 'error' && (
                <p className="text-xs text-error mt-2">Invalid file. Use a settings file exported from this app.</p>
              )}
            </div>
          </MD3Card>
        </section>

        {/* Add to Home Screen — visibility is browser+device specific (Safari/iOS, Chrome/Android, etc.) */}
        {showInstallSection && (
          <section className="space-y-2">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">App</p>
            <MD3Card variant="outlined" className="p-0 divide-y divide-outline-variant">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-on-surface-variant">Save to Home Screen</span>
                <button
                  onClick={dismissInstallPrompt}
                  className="text-xs text-on-surface-variant hover:text-on-surface"
                >
                  Don&apos;t show again
                </button>
              </div>
              {deferredPrompt ? (
                <button
                  onClick={() => promptInstall()}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm text-on-surface">Save to Home Screen</span>
                  <Icon name="add" size={20} className="text-primary" />
                </button>
              ) : isIOS ? (
                <>
                  <button
                    onClick={() => setAddToHomeOpen(!addToHomeOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm text-on-surface">Save to Home Screen</span>
                    <Icon name={addToHomeOpen ? 'expand-less' : 'expand-more'} size={20} className="text-on-surface-variant" />
                  </button>
                  {addToHomeOpen && (
                    <div className="px-4 py-3 text-left space-y-2">
                      <p className="text-xs text-on-surface-variant">
                        In Safari, tap the Share button <Icon name="share" size={14} className="inline align-middle" /> at the bottom, then scroll and tap &quot;Add to Home Screen&quot;.
                      </p>
                      <ol className="text-xs text-on-surface-variant list-decimal list-inside space-y-1">
                        <li>Tap Share (square with arrow)</li>
                        <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                        <li>Tap &quot;Add&quot;</li>
                      </ol>
                    </div>
                  )}
                </>
              ) : isAndroid ? (
                <>
                  <button
                    onClick={() => setAddToHomeOpen(!addToHomeOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm text-on-surface">Save to Home Screen</span>
                    <Icon name={addToHomeOpen ? 'expand-less' : 'expand-more'} size={20} className="text-on-surface-variant" />
                  </button>
                  {addToHomeOpen && (
                    <div className="px-4 py-3 text-left space-y-2">
                      <p className="text-xs text-on-surface-variant">
                        In Chrome, tap the menu (⋮) in the top right, then tap &quot;Add to Home screen&quot; or &quot;Install app&quot;.
                      </p>
                      <ol className="text-xs text-on-surface-variant list-decimal list-inside space-y-1">
                        <li>Tap the three-dot menu</li>
                        <li>Tap &quot;Add to Home screen&quot; or &quot;Install app&quot;</li>
                        <li>Tap &quot;Add&quot; or &quot;Install&quot;</li>
                      </ol>
                    </div>
                  )}
                </>
              ) : null}
            </MD3Card>
          </section>
        )}

        {/* About */}
        <section className="text-center space-y-3 pt-4">
          <p className="text-xs text-on-surface-variant">
            Lite Catalogue v1.0.0
          </p>
          <p className="text-xs text-on-surface-variant">
            A hobby project by{' '}
            <a
              href="https://www.linkedin.com/in/jagadeshsahadevan/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline"
            >
              Jagadesh
            </a>
          </p>

          <button
            onClick={() => setWhyOpen(!whyOpen)}
            className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name={whyOpen ? 'expand-less' : 'expand-more'} size={16} />
            Why I made this?
          </button>

          {whyOpen && (
            <div className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto bg-surface-container-low rounded-[var(--md-shape-md)] p-3">
              Traditional shops and brand owners often lack a digital product catalogue, which becomes the first barrier to going digital — whether it's adopting a POS system or starting e-commerce. Lite Catalogue removes that barrier, completely free. Go digital, grow big.
            </div>
          )}
        </section>

        {/* Reset */}
        <section className="space-y-2 pt-6">
          <MD3Card variant="outlined">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm text-error">Reset settings</span>
              <Icon name="refresh" size={20} className="text-error" />
            </button>
          </MD3Card>
        </section>
      </div>

      {/* Reset confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-surface rounded-[var(--md-shape-lg)] p-6 max-w-sm w-full shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <Icon name="warning" size={24} className="text-error flex-shrink-0" />
              <h3 className="text-lg font-medium text-on-surface">Reset settings?</h3>
            </div>
            <p className="text-sm text-on-surface-variant">
              All settings will be restored to defaults. Profile, capture mode, custom fields, and preferences will be reset. Your products and photos are not affected.
            </p>
            <div className="flex gap-2 justify-end">
              <MD3Button variant="text" onClick={() => setShowResetConfirm(false)}>Cancel</MD3Button>
              <MD3Button variant="filled" onClick={handleResetSettings} className="!bg-error !text-on-error">Reset</MD3Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit custom field dialog */}
      {customFieldDialog && (
        <CustomFieldDialog
          field={customFieldDialog === 'add' ? null : customFieldDialog}
          onSave={handleSaveCustomField}
          onClose={() => setCustomFieldDialog(null)}
        />
      )}

      {/* Builtin field options dialog (Brand / Category) */}
      {builtinOptionsDialog && (
        <BuiltinFieldOptionsDialog
          fieldLabel={builtinOptionsDialog === 'brand' ? 'Brand' : 'Category'}
          options={builtinOptionsDialog === 'brand' ? (settings.brandOptions ?? []) : (settings.categoryOptions ?? [])}
          onSave={(opts) => {
            if (builtinOptionsDialog === 'brand') {
              updateSettings({ brandOptions: opts });
            } else {
              updateSettings({ categoryOptions: opts });
            }
          }}
          onClose={() => setBuiltinOptionsDialog(null)}
        />
      )}

      {/* Delete custom field confirmation */}
      {deleteFieldConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteFieldConfirm(null)}>
          <div className="bg-surface rounded-[var(--md-shape-lg)] p-6 max-w-sm w-full shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <Icon name="warning" size={24} className="text-error flex-shrink-0" />
              <h3 className="text-lg font-medium text-on-surface">Delete field?</h3>
            </div>
            <p className="text-sm text-on-surface-variant">
              Remove &quot;{deleteFieldConfirm.name}&quot;? Existing product data for this field will be kept but the field will no longer appear during capture.
            </p>
            <div className="flex gap-2 justify-end">
              <MD3Button variant="text" onClick={() => setDeleteFieldConfirm(null)}>Cancel</MD3Button>
              <MD3Button variant="filled" onClick={handleDeleteCustomField} className="!bg-error !text-on-error">Delete</MD3Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
