import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { MD3Button } from '../components/md3/MD3Button';
import { Icon } from '../components/md3/Icon';

const STEPS = [
  { icon: 'search', text: 'Scan barcode' },
  { icon: 'camera', text: 'Click picture' },
  { icon: 'edit', text: 'Detect / add price' },
  { icon: 'share', text: 'Share catalogue with anyone, any platform' },
];

export function OnboardingPage() {
  const { updateSettings } = useSettings();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [brand, setBrand] = useState('');

  const handleContinue = async () => {
    const mobile = phone.trim();
    const brandName = brand.trim();

    await updateSettings({
      phoneNumber: mobile,
      brandName,
      onboardingComplete: true,
    });

    if (mobile || brandName) {
      const payload: Record<string, string> = {};
      if (mobile) payload.mobile = mobile;
      if (brandName) payload.brand = brandName;

      fetch(
        'https://asia-south1.api.boltic.io/service/webhook/temporal/v1.0/60be8050-04fe-4c85-965c-f27b2bd5a1f5/workflows/execute/77d4d6ab-9a86-4f11-87b3-528af2476676',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      ).catch(() => {});
    }

    navigate('/setup');
  };

  return (
    <div className="h-full flex flex-col p-6 bg-surface overflow-y-auto">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-on-surface">Lite Catalogue</h1>
          <p className="text-on-surface-variant text-sm">
            Digitalise your store inventory and start selling online
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide text-center">
            How it works
          </p>
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface-container rounded-[var(--md-shape-md)] px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <Icon name={step.icon} size={16} className="text-on-primary-container" />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-primary w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm text-on-surface">{step.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5 ml-1">
              Mobile Number
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-3 border border-outline rounded-[var(--md-shape-sm)] text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5 ml-1">
              Brand / Store Name <span className="text-on-surface-variant/50">(optional)</span>
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. My Store"
              className="w-full px-4 py-3 border border-outline rounded-[var(--md-shape-sm)] text-on-surface bg-transparent focus:outline-none focus:border-primary focus:border-2"
            />
          </div>
        </div>

        <MD3Button variant="filled" fullWidth onClick={handleContinue}>
          Continue
        </MD3Button>
      </div>
    </div>
  );
}
