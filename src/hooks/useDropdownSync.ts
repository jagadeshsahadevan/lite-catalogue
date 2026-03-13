import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Syncs new dropdown values back to settings so they appear in future dropdowns.
 * Handles brand, category, and custom dropdown fields.
 */
export function useDropdownSync() {
  const { settings, updateSettings } = useSettings();

  const syncDropdownValues = useCallback(
    (data: {
      brand?: string | null;
      category?: string | null;
      customData?: Record<string, string | null>;
    }) => {
      const updates: Partial<typeof settings> = {};

      if (data.brand?.trim()) {
        const val = data.brand.trim();
        const current = settings.brandOptions ?? [];
        if (!current.some((o) => o.toLowerCase() === val.toLowerCase())) {
          updates.brandOptions = [...current, val].sort((a, b) => a.localeCompare(b));
        }
      }

      if (data.category?.trim()) {
        const val = data.category.trim();
        const current = settings.categoryOptions ?? [];
        if (!current.some((o) => o.toLowerCase() === val.toLowerCase())) {
          updates.categoryOptions = [...current, val].sort((a, b) => a.localeCompare(b));
        }
      }

      if (data.customData) {
        const customFields = settings.customFields ?? [];
        let cfUpdated = false;
        const nextCustomFields = customFields.map((cf) => {
          if (cf.type !== 'dropdown') return cf;
          const val = data.customData?.[cf.id]?.trim();
          if (!val) return cf;
          const opts = cf.options ?? [];
          if (opts.some((o) => o.toLowerCase() === val.toLowerCase())) return cf;
          cfUpdated = true;
          return { ...cf, options: [...opts, val].sort((a, b) => a.localeCompare(b)) };
        });
        if (cfUpdated) {
          updates.customFields = nextCustomFields;
        }
      }

      if (Object.keys(updates).length > 0) {
        updateSettings(updates);
      }
    },
    [settings.brandOptions, settings.categoryOptions, settings.customFields, updateSettings],
  );

  return { syncDropdownValues };
}
