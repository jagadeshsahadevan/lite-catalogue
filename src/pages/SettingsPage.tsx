import { useState, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useTour } from '../context/TourContext';

import { MD3Card } from '../components/md3/MD3Card';
import { MD3Switch } from '../components/md3/MD3Switch';
import { MD3TopBar } from '../components/md3/MD3TopBar';
import { MD3Button } from '../components/md3/MD3Button';
import { Icon } from '../components/md3/Icon';
import type { CaptureMode, CustomFieldDef, CustomFieldType, AppSettings } from '../types';
import { BUILTIN_FIELD_IDS, DEFAULT_SETTINGS } from '../types';

const modeOptions: { value: CaptureMode; label: string }[] = [
  { value: 'single', label: 'Single Photo' },
  { value: 'front-back', label: 'Front & Back' },
  { value: 'front-back-more', label: 'Front, Back & More' },
];

const BUILTIN_META: Record<string, { label: string; desc: string; settingsKey: string }> = {
  mrp: { label: 'MRP', desc: 'Product price', settingsKey: 'askMrp' },
  qty: { label: 'Quantity', desc: 'Stock quantity', settingsKey: 'askQty' },
  brand: { label: 'Brand', desc: 'Brand name', settingsKey: 'askBrand' },
  category: { label: 'Category', desc: 'Product category', settingsKey: 'askCategory' },
};

const TYPE_OPTIONS: { value: CustomFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text', icon: 'text-fields' },
  { value: 'date', label: 'Date', icon: 'event' },
  { value: 'dropdown', label: 'Dropdown', icon: 'arrow-drop-down' },
];

function generateId() {
  return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { deferredPrompt, isInstalled, isIOS, isAndroid, promptInstall } = useInstallPrompt();
  const { startSettingsTour, isActive } = useTour();
  const [whyOpen, setWhyOpen] = useState(false);
  const [addToHomeOpen, setAddToHomeOpen] = useState(false);
  const [editingField, setEditingField] = useState<'phone' | 'brand' | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  // Custom field creation / editing
  const [showAddField, setShowAddField] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [cfName, setCfName] = useState('');
  const [cfType, setCfType] = useState<CustomFieldType>('text');
  const [cfOptions, setCfOptions] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<'success' | 'error' | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (field: 'phone' | 'brand') => {
    setFieldValue(field === 'phone' ? settings.phoneNumber : settings.brandName);
    setEditingField(field);
  };

  const saveField = () => {
    if (!editingField) return;
    const key = editingField === 'phone' ? 'phoneNumber' : 'brandName';
    updateSettings({ [key]: fieldValue.trim() });
    setEditingField(null);
  };

  const fieldOrder = settings.fieldOrder ?? ['mrp', 'qty', 'brand', 'category'];
  const customFields = settings.customFields ?? [];

  const isBuiltin = (id: string) => (BUILTIN_FIELD_IDS as readonly string[]).includes(id);

  const getFieldEnabled = (id: string): boolean => {
    if (id === 'mrp') return settings.askMrp;
    if (id === 'qty') return settings.askQty;
    if (id === 'brand') return settings.askBrand;
    if (id === 'category') return settings.askCategory;
    const cf = customFields.find((f) => f.id === id);
    return cf?.enabled ?? false;
  };

  const toggleFieldEnabled = (id: string, value: boolean) => {
    if (id === 'mrp') { updateSettings({ askMrp: value }); return; }
    if (id === 'qty') { updateSettings({ askQty: value }); return; }
    if (id === 'brand') { updateSettings({ askBrand: value }); return; }
    if (id === 'category') { updateSettings({ askCategory: value }); return; }
    const updated = customFields.map((f) => f.id === id ? { ...f, enabled: value } : f);
    updateSettings({ customFields: updated });
  };

  const getFieldLabel = (id: string): string => {
    if (isBuiltin(id)) return BUILTIN_META[id]?.label ?? id;
    return customFields.find((f) => f.id === id)?.name ?? id;
  };

  const getFieldTypeBadge = (id: string): string | null => {
    if (isBuiltin(id)) return null;
    const cf = customFields.find((f) => f.id === id);
    return cf?.type ?? null;
  };

  const moveField = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fieldOrder.length) return;
    const newOrder = [...fieldOrder];
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    updateSettings({ fieldOrder: newOrder });
  };

  const openAddField = () => {
    setCfName('');
    setCfType('text');
    setCfOptions('');
    setEditingCustomId(null);
    setShowAddField(true);
  };

  const openEditField = (cf: CustomFieldDef) => {
    setCfName(cf.name);
    setCfType(cf.type);
    setCfOptions(cf.options?.join(', ') ?? '');
    setEditingCustomId(cf.id);
    setShowAddField(true);
  };

  const saveCustomField = () => {
    const name = cfName.trim();
    if (!name) return;
    const options = cfType === 'dropdown'
      ? cfOptions.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    if (editingCustomId) {
      const updated = customFields.map((f) =>
        f.id === editingCustomId ? { ...f, name, type: cfType, options } : f
      );
      updateSettings({ customFields: updated });
    } else {
      const id = generateId();
      const newField: CustomFieldDef = { id, name, type: cfType, enabled: true, options };
      updateSettings({
        customFields: [...customFields, newField],
        fieldOrder: [...fieldOrder, id],
      });
    }
    setShowAddField(false);
    setEditingCustomId(null);
  };

  const deleteCustomField = (id: string) => {
    const updated = customFields.filter((f) => f.id !== id);
    const newOrder = fieldOrder.filter((fid) => fid !== id);
    updateSettings({ customFields: updated, fieldOrder: newOrder });
    setDeleteConfirmId(null);
  };

  const exportSettings = () => {
    const { id: _id, ...toExport } = settings;
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
    return (
      typeof o.captureMode === 'string' &&
      ['single', 'front-back', 'front-back-more'].includes(o.captureMode)
    );
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
        updateSettings(rest);
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
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    inputMode="tel"
                    autoFocus
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveField()}
                    className="flex-1 text-sm text-on-surface bg-transparent border-b-2 border-primary py-1 focus:outline-none"
                    placeholder="Mobile number"
                  />
                  <button onClick={saveField} className="p-1">
                    <Icon name="check" size={20} className="text-primary" />
                  </button>
                  <button onClick={() => setEditingField(null)} className="p-1">
                    <Icon name="close" size={20} className="text-on-surface-variant" />
                  </button>
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

        {/* Custom Fields — prominent add section */}
        <section className="space-y-2" data-tour="tour-settings-custom-fields">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Custom Fields</p>
          <p className="text-xs text-on-surface-variant">
            Add your own fields (e.g. Color, Size, SKU) to collect during capture. Choose text, date, or dropdown type.
          </p>
          <MD3Card variant="outlined" className="p-4">
            <button
              onClick={openAddField}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border-2 border-dashed border-primary text-primary font-medium text-sm active:bg-primary-container/20"
            >
              <Icon name="add" size={20} className="text-primary" />
              Add Custom Field
            </button>
          </MD3Card>
        </section>

        {/* Product Fields — unified ordered list */}
        <section className="space-y-3" data-tour="tour-settings-field-order">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Field Order</p>
            <button
              onClick={openAddField}
              className="flex items-center gap-1 text-xs font-medium text-primary active:opacity-70"
            >
              <Icon name="add" size={16} className="text-primary" />
              Add Field
            </button>
          </div>
          <p className="text-[10px] text-on-surface-variant -mt-1">
            Reorder with arrows. Enabled fields appear during capture in this order.
          </p>

          <MD3Card variant="outlined" className="p-0 divide-y divide-outline-variant">
            {fieldOrder.map((fid, idx) => {
              const builtin = isBuiltin(fid);
              const label = getFieldLabel(fid);
              const enabled = getFieldEnabled(fid);
              const typeBadge = getFieldTypeBadge(fid);
              const cf = !builtin ? customFields.find((f) => f.id === fid) : null;

              return (
                <div key={fid} className="flex items-center gap-1 px-2 py-2.5">
                  {/* Reorder arrows */}
                  <div className="flex flex-col -my-1">
                    <button
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0}
                      className="p-0.5 text-on-surface-variant disabled:opacity-20"
                    >
                      <Icon name="arrow-up" size={14} />
                    </button>
                    <button
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === fieldOrder.length - 1}
                      className="p-0.5 text-on-surface-variant disabled:opacity-20"
                    >
                      <Icon name="arrow-down" size={14} />
                    </button>
                  </div>

                  {/* Field info */}
                  <div className="flex-1 min-w-0 ml-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-on-surface truncate">{label}</span>
                      {typeBadge && (
                        <span className="text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                          {typeBadge}
                        </span>
                      )}
                      {builtin && (
                        <span className="text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                          built-in
                        </span>
                      )}
                    </div>
                    {builtin && (
                      <p className="text-[10px] text-on-surface-variant">{BUILTIN_META[fid]?.desc}</p>
                    )}
                    {cf?.type === 'dropdown' && cf.options && cf.options.length > 0 && (
                      <p className="text-[10px] text-on-surface-variant truncate">
                        {cf.options.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Edit button for custom fields */}
                  {cf && (
                    <button onClick={() => openEditField(cf)} className="p-1.5 text-on-surface-variant">
                      <Icon name="edit" size={14} />
                    </button>
                  )}

                  {/* Delete button for custom fields */}
                  {cf && (
                    <button onClick={() => setDeleteConfirmId(fid)} className="p-1.5 text-error/70">
                      <Icon name="delete" size={14} />
                    </button>
                  )}

                  {/* Toggle */}
                  <MD3Switch
                    checked={enabled}
                    onChange={(v) => toggleFieldEnabled(fid, v)}
                  />
                </div>
              );
            })}
          </MD3Card>

          {/* Sub-option: auto MRP detection */}
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
                <span className="text-sm text-on-surface">Load from file</span>
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

        {/* Add to Home Screen */}
        {!isInstalled && (deferredPrompt || isIOS || isAndroid) && (
          <section className="space-y-2">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">App</p>
            <MD3Card variant="outlined" className="p-0 divide-y divide-outline-variant">
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

      {/* Add / Edit Custom Field Dialog */}
      {showAddField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddField(false)}>
          <div className="bg-surface rounded-[var(--md-shape-lg)] p-5 mx-4 max-w-sm w-full shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-on-surface">
              {editingCustomId ? 'Edit Field' : 'Add Custom Field'}
            </h3>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Field Name</label>
              <input
                type="text"
                value={cfName}
                onChange={(e) => setCfName(e.target.value)}
                placeholder="e.g. Color, Size, SKU..."
                autoFocus
                className="w-full px-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Data Type</label>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCfType(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-colors ${
                      cfType === opt.value
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-transparent text-on-surface-variant border-outline-variant'
                    }`}
                  >
                    <Icon name={opt.icon} size={14} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {cfType === 'dropdown' && (
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Options <span className="font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={cfOptions}
                  onChange={(e) => setCfOptions(e.target.value)}
                  placeholder="e.g. Red, Blue, Green"
                  className="w-full px-3 py-2.5 border border-outline rounded-[var(--md-shape-sm)] text-sm text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
                />
                <p className="text-[10px] text-on-surface-variant mt-1">Users can also add new values during capture.</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <MD3Button variant="text" onClick={() => setShowAddField(false)} className="flex-1">
                Cancel
              </MD3Button>
              <MD3Button variant="filled" onClick={saveCustomField} className="flex-1" disabled={!cfName.trim()}>
                {editingCustomId ? 'Save' : 'Add'}
              </MD3Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-surface rounded-[var(--md-shape-lg)] p-6 mx-6 max-w-sm w-full shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <Icon name="warning" size={24} className="text-error flex-shrink-0" />
              <h3 className="text-lg font-medium text-on-surface">Delete Field</h3>
            </div>
            <p className="text-sm text-on-surface-variant">
              Delete "{getFieldLabel(deleteConfirmId)}"? Existing product data for this field will be kept but won't be visible.
            </p>
            <div className="flex gap-2 justify-end">
              <MD3Button variant="text" onClick={() => setDeleteConfirmId(null)}>Cancel</MD3Button>
              <MD3Button variant="filled" onClick={() => deleteCustomField(deleteConfirmId)} className="!bg-error !text-on-error">Delete</MD3Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
