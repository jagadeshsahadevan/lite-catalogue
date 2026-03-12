import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { MD3Button } from '../components/md3/MD3Button';
import { MD3Card } from '../components/md3/MD3Card';
import { MD3Switch } from '../components/md3/MD3Switch';
import { MD3TextField } from '../components/md3/MD3TextField';
import type { CaptureMode } from '../types';

const modeOptions: { value: CaptureMode; label: string; desc: string }[] = [
  { value: 'single', label: 'Single Photo', desc: 'One photo per product' },
  { value: 'front-back', label: 'Front & Back', desc: 'Two photos per product (front + back)' },
  { value: 'front-back-more', label: 'Front, Back & More', desc: 'Multiple photos with position tags' },
];

export function SetupPage() {
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const [mode, setMode] = useState<CaptureMode>(settings.captureMode);
  const [askMrp, setAskMrp] = useState(settings.askMrp);
  const [apiEndpoint, setApiEndpoint] = useState(settings.apiEndpoint);

  const handleSave = async () => {
    await updateSettings({
      captureMode: mode,
      askMrp,
      apiEndpoint: apiEndpoint.trim(),
      setupComplete: true,
    });
    navigate('/capture');
  };

  return (
    <div className="h-full flex flex-col justify-center p-6 bg-surface overflow-y-auto">
      <div className="max-w-sm mx-auto w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-on-surface">Lite Catalogue</h1>
          <p className="text-on-surface-variant mt-1">Setup your cataloguing preferences</p>
        </div>

        {/* Capture Mode */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-on-surface-variant">Capture Mode</p>
          <div className="space-y-2">
            {modeOptions.map((opt) => (
              <MD3Card
                key={opt.value}
                variant="outlined"
                onClick={() => setMode(opt.value)}
                selected={mode === opt.value}
              >
                <p className="font-medium text-on-surface">{opt.label}</p>
                <p className="text-sm text-on-surface-variant mt-0.5">{opt.desc}</p>
              </MD3Card>
            ))}
          </div>
        </div>

        {/* MRP Toggle */}
        <MD3Card variant="outlined">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-on-surface">Ask for MRP</p>
              <p className="text-sm text-on-surface-variant">Extract MRP from product images</p>
            </div>
            <MD3Switch checked={askMrp} onChange={setAskMrp} />
          </div>
        </MD3Card>

        {/* API Endpoint */}
        <MD3TextField
          label="API Endpoint (optional)"
          value={apiEndpoint}
          onChange={setApiEndpoint}
          placeholder="https://api.example.com"
          type="url"
        />

        <MD3Button variant="filled" fullWidth onClick={handleSave}>
          Get Started
        </MD3Button>
      </div>
    </div>
  );
}
