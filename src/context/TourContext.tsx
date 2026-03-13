import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface TourStep {
  id: string;
  page: string;
  target?: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'center';
  icon?: string;
  interactive?: boolean;
  autoAdvanceMs?: number;
  disableBack?: boolean;
}

const SCAN_STEP_IDS = new Set(['scan-barcode', 'flash-control', 'manual-entry', 'type-barcode']);

const CAPTURE_STEPS: TourStep[] = [
  {
    id: 'welcome',
    page: '/capture',
    title: 'Welcome to Lite Catalogue',
    description: 'Let\'s walk through how to digitise your store inventory. This only takes a minute.',
    position: 'center',
    icon: '👋',
  },
  {
    id: 'scan-barcode',
    page: '/capture',
    target: 'barcode-scanner',
    title: 'Step 1: Scan Barcode',
    description: 'Point your camera at a barcode. It will auto-detect. If not scanned, we\'ll move to the next tip automatically.',
    position: 'bottom',
    icon: '📷',
    interactive: true,
    autoAdvanceMs: 10000,
  },
  {
    id: 'flash-control',
    page: '/capture',
    target: 'scanner-flash-btn',
    title: 'Use Flash',
    description: 'Lighting poor? Tap the flash icon for better visibility.',
    position: 'bottom',
    icon: '⚡',
    interactive: true,
    autoAdvanceMs: 10000,
  },
  {
    id: 'manual-entry',
    page: '/capture',
    target: 'manual-barcode-btn',
    title: 'Enter Manually',
    description: 'Tap "Enter barcode manually" below to type the barcode yourself.',
    position: 'top',
    icon: '⌨️',
    interactive: true,
  },
  {
    id: 'type-barcode',
    page: '/capture',
    target: 'manual-barcode-input',
    title: 'Type Barcode',
    description: 'Type a barcode in the input box and tap Go. If you don\'t enter one, a demo barcode will be filled automatically.',
    position: 'bottom',
    icon: '⌨️',
    interactive: true,
    autoAdvanceMs: 30000,
    disableBack: true,
  },
  {
    id: 'capture-photos',
    page: '/capture',
    title: 'Step 2: Capture Photos',
    description: 'The camera opens after scanning. Point at the product and tap the big white capture button. Take as many shots as you need, then tap "Done".',
    position: 'center',
    icon: '📸',
  },
  {
    id: 'add-details',
    page: '/capture',
    title: 'Step 3: Add Details & Save',
    description: 'Fill in MRP, quantity, brand, or category — all on one page. Tap "Continue" to save, or "Skip" to save without details. You can edit later.',
    position: 'center',
    icon: '📝',
  },
];

const PRODUCTS_STEPS: TourStep[] = [
  {
    id: 'products-tab',
    page: '/products',
    target: 'nav-products',
    title: 'View Products',
    description: 'All your captured products appear here, sorted by most recent. Use search and filters to find items.',
    position: 'top',
    icon: '📦',
  },
  {
    id: 'select-products',
    page: '/products',
    title: 'Select & Share',
    description: 'Tap the checkbox on any product card to select it, then tap "Share" to send a zip containing product images and a CSV catalogue.',
    position: 'center',
    icon: '🔗',
  },
];

const SETTINGS_STEPS: TourStep[] = [
  {
    id: 'settings-tab',
    page: '/settings',
    target: 'nav-settings',
    title: 'Settings',
    description: 'Configure capture mode, product fields (including custom fields), reorder, profile, and haptic feedback.',
    position: 'top',
    icon: '⚙️',
  },
];

/** Dedicated Settings page tour — initiated only from Settings page */
const SETTINGS_PAGE_TOUR: TourStep[] = [
  {
    id: 'settings-welcome',
    page: '/settings',
    title: 'Settings Guide',
    description: 'Configure capture mode, product fields, add custom fields, reorder, backup, and more.',
    position: 'center',
    icon: '⚙️',
  },
  {
    id: 'settings-profile',
    page: '/settings',
    target: 'tour-settings-profile',
    title: 'Profile',
    description: 'Add your mobile number and brand/store name. These appear in exports and help identify your catalogue.',
    position: 'bottom',
    icon: '👤',
  },
  {
    id: 'settings-capture-mode',
    page: '/settings',
    target: 'tour-settings-capture-mode',
    title: 'Capture Mode',
    description: 'Choose how many photos per product: Single, Front & Back, or Front, Back & More with position tags.',
    position: 'bottom',
    icon: '📷',
  },
  {
    id: 'settings-field-order',
    page: '/settings',
    target: 'tour-settings-field-order',
    title: 'Product Fields',
    description: 'Enable MRP, Quantity, Brand, or Category. Use arrows to reorder. Add custom fields (text, date, dropdown) with the Add Field button.',
    position: 'bottom',
    icon: '📋',
  },
  {
    id: 'settings-add-field',
    page: '/settings',
    target: 'tour-settings-add-field',
    title: 'Add Custom Field',
    description: 'Add your own fields like Size, Color, or Expiry. Choose text, date, or dropdown with options.',
    position: 'top',
    icon: '➕',
  },
  {
    id: 'settings-backup',
    page: '/settings',
    target: 'tour-settings-backup',
    title: 'Backup & Restore',
    description: 'Download settings to a file or load from a saved file. Easy to share or restore on a new device.',
    position: 'bottom',
    icon: '💾',
  },
  {
    id: 'settings-done',
    page: '/settings',
    title: 'You\'re All Set',
    description: 'Tap the help icon anytime to revisit this guide. Start capturing to build your catalogue.',
    position: 'center',
    icon: '✅',
  },
];

/** Product page tour — when page has at least one product */
const PRODUCTS_PAGE_TOUR: TourStep[] = [
  {
    id: 'products-header',
    page: '/products',
    target: 'tour-products-header',
    title: 'Products',
    description: 'All your captured products appear here, sorted by most recent.',
    position: 'bottom',
    icon: '📦',
  },
  {
    id: 'products-card-editable',
    page: '/products',
    target: 'tour-products-card',
    title: 'Product Card — Tap to Edit',
    description: 'Each card shows barcode, MRP, and qty. Tap a card to open product details. There you can edit MRP, Qty, Brand, Category, and photo position tags — tap the edit icon next to any field.',
    position: 'top',
    icon: '✏️',
  },
  {
    id: 'products-search-filter',
    page: '/products',
    target: 'tour-products-search',
    title: 'Search & Filter',
    description: 'Search by barcode or filter by date. Tap the icons to toggle search and date filters.',
    position: 'bottom',
    icon: '🔍',
  },
  {
    id: 'products-select-share',
    page: '/products',
    title: 'Select & Share',
    description: 'Tap the checkbox on any product card to select it, then tap "Share" to send a zip with images and CSV.',
    position: 'center',
    icon: '🔗',
  },
];

const FINISH_STEP: TourStep = {
  id: 'finish',
  page: '/capture',
  title: 'You\'re All Set!',
  description: 'Start capturing products now. Tap the help icon anytime to revisit this guide.',
  position: 'center',
  icon: '🎉',
};

const FULL_TOUR = [...CAPTURE_STEPS, ...PRODUCTS_STEPS, ...SETTINGS_STEPS, FINISH_STEP];

type TourMode = 'full' | 'page' | 'settings' | 'products';

interface TourContextValue {
  isActive: boolean;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  tourMode: TourMode;
  showFullTourOffer: boolean;
  startTour: () => void;
  startPageTour: () => void;
  startSettingsTour: () => void;
  startProductsTour: (hasProducts: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  acceptFullTour: () => void;
  declineFullTour: () => void;
  registerAutoScan: (cb: (barcode: string) => void) => void;
  registerProductsCount: (count: number) => void;
  markScanComplete: () => void;
}

const TourContext = createContext<TourContextValue>({
  isActive: false,
  currentStep: null,
  stepIndex: 0,
  totalSteps: 0,
  tourMode: 'full',
  showFullTourOffer: false,
  startTour: () => {},
  startPageTour: () => {},
  startSettingsTour: () => {},
  startProductsTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  skipTour: () => {},
  acceptFullTour: () => {},
  declineFullTour: () => {},
  registerAutoScan: () => {},
  registerProductsCount: () => {},
  markScanComplete: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>(FULL_TOUR);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourMode, setTourMode] = useState<TourMode>('full');
  const [showFullTourOffer, setShowFullTourOffer] = useState(false);
  const autoScanRef = useRef<((barcode: string) => void) | null>(null);
  const scanCompleteRef = useRef(false);
  const productsCountRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  const currentStep = active ? steps[stepIndex] ?? null : null;

  const navigateToStep = useCallback((step: TourStep) => {
    if (!location.pathname.startsWith(step.page)) {
      navigate(step.page);
    }
  }, [navigate, location.pathname]);

  const startTour = useCallback(() => {
    scanCompleteRef.current = false;
    setSteps(FULL_TOUR);
    setStepIndex(0);
    setTourMode('full');
    setShowFullTourOffer(false);
    setActive(true);
    navigate('/capture');
  }, [navigate]);

  const startSettingsTour = useCallback(() => {
    scanCompleteRef.current = false;
    setSteps(SETTINGS_PAGE_TOUR);
    setStepIndex(0);
    setTourMode('settings');
    setShowFullTourOffer(false);
    setActive(true);
    if (!location.pathname.startsWith('/settings')) {
      navigate('/settings');
    }
  }, [navigate, location.pathname]);

  const startProductsTour = useCallback((hasProducts: boolean) => {
    scanCompleteRef.current = false;
    if (hasProducts) {
      setSteps(PRODUCTS_PAGE_TOUR);
      setStepIndex(0);
      setTourMode('products');
      setShowFullTourOffer(false);
      setActive(true);
      if (!location.pathname.startsWith('/products')) {
        navigate('/products');
      }
    } else {
      startTour();
    }
  }, [navigate, location.pathname, startTour]);

  const startPageTour = useCallback(() => {
    if (location.pathname.startsWith('/capture')) {
      startTour();
      return;
    }
    if (location.pathname.startsWith('/settings')) {
      startSettingsTour();
      return;
    }
    if (location.pathname.startsWith('/products')) {
      startProductsTour(productsCountRef.current > 0);
      return;
    }
  }, [location.pathname, startTour, startSettingsTour, startProductsTour]);

  const registerProductsCount = useCallback((count: number) => {
    productsCountRef.current = count;
  }, []);

  const markScanComplete = useCallback(() => {
    scanCompleteRef.current = true;
  }, []);

  const injectAutoScanIfNeeded = useCallback(() => {
    if (scanCompleteRef.current) return;
    const step = steps[stepIndex];
    if (!step) return;
    if (SCAN_STEP_IDS.has(step.id) && autoScanRef.current) {
      autoScanRef.current(String(Date.now()));
    }
  }, [steps, stepIndex]);

  const nextStep = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= steps.length) {
      if (tourMode === 'settings') {
        setActive(false);
        setShowFullTourOffer(false);
        return;
      }
      if (tourMode === 'products' || tourMode === 'page') {
        setActive(false);
        setShowFullTourOffer(true);
        return;
      }
      setActive(false);
      setStepIndex(0);
      navigate('/capture');
      return;
    }

    const nextS = steps[next];
    const currentS = steps[stepIndex];
    const isScanRelated = SCAN_STEP_IDS.has(currentS?.id ?? '');
    const nextIsScanRelated = SCAN_STEP_IDS.has(nextS?.id ?? '');

    if (isScanRelated && !nextIsScanRelated) {
      injectAutoScanIfNeeded();
    }

    setStepIndex(next);
    navigateToStep(nextS);
  }, [stepIndex, steps, tourMode, navigateToStep, navigate, injectAutoScanIfNeeded]);

  const prevStep = useCallback(() => {
    const prev = stepIndex - 1;
    if (prev < 0) return;
    const currentS = steps[stepIndex];
    if (currentS?.disableBack) return;
    setStepIndex(prev);
    navigateToStep(steps[prev]);
  }, [stepIndex, steps, navigateToStep]);

  const skipTour = useCallback(() => {
    scanCompleteRef.current = false;
    setActive(false);
    setStepIndex(0);
    setShowFullTourOffer(false);
  }, []);

  const acceptFullTour = useCallback(() => {
    scanCompleteRef.current = false;
    setShowFullTourOffer(false);
    setSteps(FULL_TOUR);
    setStepIndex(0);
    setTourMode('full');
    setActive(true);
    navigate('/capture');
  }, [navigate]);

  const declineFullTour = useCallback(() => {
    setShowFullTourOffer(false);
  }, []);

  const registerAutoScan = useCallback((cb: (barcode: string) => void) => {
    autoScanRef.current = cb;
  }, []);

  useEffect(() => {
    if (active && currentStep) {
      navigateToStep(currentStep);
    }
  }, [active, currentStep, navigateToStep]);

  return (
    <TourContext.Provider value={{
      isActive: active,
      currentStep,
      stepIndex,
      totalSteps: steps.length,
      tourMode,
      showFullTourOffer,
      startTour,
      startPageTour,
      startSettingsTour,
      startProductsTour,
      nextStep,
      prevStep,
      skipTour,
      acceptFullTour,
      declineFullTour,
      registerAutoScan,
      registerProductsCount,
      markScanComplete,
    }}>
      {children}
    </TourContext.Provider>
  );
}
