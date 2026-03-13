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
}

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
    description: 'Lighting poor? Tap the flash icon for better visibility. Still auto-advancing if not scanned...',
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
    description: 'Tap "Enter barcode manually" to type it. Or tap Next to auto-fill a demo barcode and continue.',
    position: 'top',
    icon: '⌨️',
    interactive: true,
  },
  {
    id: 'take-photos',
    page: '/capture',
    title: 'Step 2: Take Photos',
    description: 'After scanning, the camera opens. Point at the product and tap the big white capture button to photograph it.',
    position: 'center',
    icon: '📸',
  },
  {
    id: 'done-photos',
    page: '/capture',
    title: 'Done Taking Photos',
    description: 'Once you have enough photos, tap the "Done" button to proceed. You can always add more later.',
    position: 'center',
    icon: '✅',
  },
  {
    id: 'product-details',
    page: '/capture',
    title: 'Step 3: Add Details',
    description: 'Fill in MRP, quantity, brand, category — all on one page. Only fields enabled in Settings will appear.',
    position: 'center',
    icon: '📝',
  },
  {
    id: 'skip-continue',
    page: '/capture',
    title: 'Skip or Continue',
    description: 'Tap "Continue" to save details, or "Skip" to save without. You can always edit them later from the product page.',
    position: 'center',
    icon: '⏭️',
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
    title: 'Select Products',
    description: 'Each product card has a checkbox. Tap it to select one or more products for sharing or deleting.',
    position: 'center',
    icon: '☑️',
  },
  {
    id: 'share-products',
    page: '/products',
    title: 'Share',
    description: 'After selecting, tap "Share" to send a single zip file containing all product images and a CSV catalogue.',
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
    description: 'Configure capture mode, toggle MRP/Quantity/Brand/Category fields, manage your profile, and control haptic feedback.',
    position: 'top',
    icon: '⚙️',
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

type TourMode = 'full' | 'page';

interface TourContextValue {
  isActive: boolean;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  tourMode: TourMode;
  showFullTourOffer: boolean;
  startTour: () => void;
  startPageTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  acceptFullTour: () => void;
  declineFullTour: () => void;
  registerAutoScan: (cb: (barcode: string) => void) => void;
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
  nextStep: () => {},
  prevStep: () => {},
  skipTour: () => {},
  acceptFullTour: () => {},
  declineFullTour: () => {},
  registerAutoScan: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

function getPageSteps(pathname: string): TourStep[] {
  if (pathname.startsWith('/products')) return PRODUCTS_STEPS;
  if (pathname.startsWith('/settings')) return SETTINGS_STEPS;
  return CAPTURE_STEPS;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>(FULL_TOUR);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourMode, setTourMode] = useState<TourMode>('full');
  const [showFullTourOffer, setShowFullTourOffer] = useState(false);
  const autoScanRef = useRef<((barcode: string) => void) | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const currentStep = active ? steps[stepIndex] ?? null : null;

  const navigateToStep = useCallback((step: TourStep) => {
    if (!location.pathname.startsWith(step.page)) {
      navigate(step.page);
    }
  }, [navigate, location.pathname]);

  const startTour = useCallback(() => {
    setSteps(FULL_TOUR);
    setStepIndex(0);
    setTourMode('full');
    setShowFullTourOffer(false);
    setActive(true);
    navigate('/capture');
  }, [navigate]);

  const startPageTour = useCallback(() => {
    const isCapturePage = location.pathname.startsWith('/capture');
    if (isCapturePage) {
      startTour();
      return;
    }
    const pageSteps = getPageSteps(location.pathname);
    setSteps(pageSteps);
    setStepIndex(0);
    setTourMode('page');
    setShowFullTourOffer(false);
    setActive(true);
  }, [location.pathname, startTour]);

  const injectAutoScanIfNeeded = useCallback(() => {
    const step = steps[stepIndex];
    if (!step) return;
    const isScanRelated = step.id === 'scan-barcode' || step.id === 'flash-control' || step.id === 'manual-entry';
    if (isScanRelated && autoScanRef.current) {
      autoScanRef.current(String(Date.now()));
    }
  }, [steps, stepIndex]);

  const nextStep = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= steps.length) {
      if (tourMode === 'page') {
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
    const isScanRelated = currentS?.id === 'scan-barcode' || currentS?.id === 'flash-control' || currentS?.id === 'manual-entry';
    const nextIsScanRelated = nextS?.id === 'scan-barcode' || nextS?.id === 'flash-control' || nextS?.id === 'manual-entry';

    if (isScanRelated && !nextIsScanRelated) {
      injectAutoScanIfNeeded();
    }

    setStepIndex(next);
    navigateToStep(nextS);
  }, [stepIndex, steps, tourMode, navigateToStep, navigate, injectAutoScanIfNeeded]);

  const prevStep = useCallback(() => {
    const prev = stepIndex - 1;
    if (prev < 0) return;
    setStepIndex(prev);
    navigateToStep(steps[prev]);
  }, [stepIndex, steps, navigateToStep]);

  const skipTour = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    setShowFullTourOffer(false);
  }, []);

  const acceptFullTour = useCallback(() => {
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
      nextStep,
      prevStep,
      skipTour,
      acceptFullTour,
      declineFullTour,
      registerAutoScan,
    }}>
      {children}
    </TourContext.Provider>
  );
}
