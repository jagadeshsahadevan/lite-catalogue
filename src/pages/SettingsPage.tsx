import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

import { MD3Card } from '../components/md3/MD3Card';
import { MD3Switch } from '../components/md3/MD3Switch';
import { MD3TopBar } from '../components/md3/MD3TopBar';
import { Icon } from '../components/md3/Icon';
import type { CaptureMode } from '../types';

const modeOptions: { value: CaptureMode; label: string }[] = [
  { value: 'single', label: 'Single Photo' },
  { value: 'front-back', label: 'Front & Back' },
  { value: 'front-back-more', label: 'Front, Back & More' },
];

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [whyOpen, setWhyOpen] = useState(false);
  const [editingField, setEditingField] = useState<'phone' | 'brand' | null>(null);
  const [fieldValue, setFieldValue] = useState('');

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

  return (
    <div>
      <MD3TopBar title="Settings" />

      <div className="p-4 space-y-6 max-w-sm mx-auto">
        {/* Profile */}
        <section className="space-y-2">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Profile</p>
          <MD3Card variant="outlined" className="p-0 divide-y divide-outline-variant">
            {/* Phone Number */}
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

            {/* Brand Name */}
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
        <section className="space-y-2">
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

        {/* Toggles */}
        <section className="space-y-3">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Preferences</p>

          <MD3Card variant="outlined">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Ask for MRP</p>
                <p className="text-xs text-on-surface-variant">Prompt for price after capture</p>
              </div>
              <MD3Switch
                checked={settings.askMrp}
                onChange={(v) => updateSettings({ askMrp: v })}
              />
            </div>
          </MD3Card>

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

          <MD3Card variant="outlined">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Ask for Quantity</p>
                <p className="text-xs text-on-surface-variant">Qty available per product</p>
              </div>
              <MD3Switch
                checked={settings.askQty}
                onChange={(v) => updateSettings({ askQty: v })}
              />
            </div>
          </MD3Card>

          <MD3Card variant="outlined">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Ask for Brand</p>
                <p className="text-xs text-on-surface-variant">Brand name per product</p>
              </div>
              <MD3Switch
                checked={settings.askBrand}
                onChange={(v) => updateSettings({ askBrand: v })}
              />
            </div>
          </MD3Card>

          <MD3Card variant="outlined">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Ask for Category</p>
                <p className="text-xs text-on-surface-variant">Category per product</p>
              </div>
              <MD3Switch
                checked={settings.askCategory}
                onChange={(v) => updateSettings({ askCategory: v })}
              />
            </div>
          </MD3Card>

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
            Why I made this
          </button>

          {whyOpen && (
            <div className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto bg-surface-container-low rounded-[var(--md-shape-md)] p-3">
              Traditional shops and brand owners often lack a digital product catalogue, which becomes the first barrier to going digital — whether it's adopting a POS system or starting e-commerce. Lite Catalogue removes that barrier, completely free. Go digital, grow big.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
