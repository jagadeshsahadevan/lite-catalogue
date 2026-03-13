import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { db } from '../db';
import { DEFAULT_SETTINGS, type AppSettings } from '../types';

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.settings.toArray().then((rows) => {
      if (rows.length > 0) {
        const stored = rows[0];
        const merged = { ...DEFAULT_SETTINGS, ...stored };
        if (merged.setupComplete && merged.onboardingComplete === undefined) {
          merged.onboardingComplete = true;
        }
        // Ensure customFields and fieldOrder exist (migration for older DB)
        if (!Array.isArray(merged.customFields)) {
          merged.customFields = DEFAULT_SETTINGS.customFields;
        }
        if (!Array.isArray(merged.fieldOrder)) {
          merged.fieldOrder = [...DEFAULT_SETTINGS.fieldOrder];
        }
        if (!Array.isArray(merged.brandOptions)) {
          merged.brandOptions = [];
        }
        if (!Array.isArray(merged.categoryOptions)) {
          merged.categoryOptions = [];
        }
        setSettings(merged);
      }
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...updates };
      (async () => {
        if (merged.id) {
          await db.settings.update(merged.id, updates);
        } else {
          const id = await db.settings.add(merged);
          setSettings((s) => ({ ...s, id }));
        }
      })();
      return merged;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
