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

  return (
    <div>
      <MD3TopBar title="Settings" />

      <div className="p-4 space-y-6 max-w-sm mx-auto">
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

        {/* MRP Toggle */}
        <section>
          <MD3Card variant="outlined">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Ask for MRP</p>
                <p className="text-xs text-on-surface-variant">OCR extraction from images</p>
              </div>
              <MD3Switch
                checked={settings.askMrp}
                onChange={(v) => updateSettings({ askMrp: v })}
              />
            </div>
          </MD3Card>
        </section>

        {/* Qty Toggle */}
        <section>
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
