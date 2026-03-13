import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface TourStep {
  id: string;
  page: string;
  target?: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'center';
  icon?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    page: '/capture',
    title: 'Welcome to Lite Catalogue',
    description: 'Let\'s walk through how to digitise your store inventory. This will only take a minute.',
    position: 'center',
    icon: '👋',
  },
  {
    id: 'scan-barcode',
    page: '/capture',
    target: 'barcode-scanner',
    title: 'Step 1: Scan Barcode',
    description: 'Point your camera at a product barcode. The scanner will automatically detect and read it.',
    position: 'bottom',
    icon: '📷',
  },
  {
    id: 'flash-control',
    page: '/capture',
    target: 'scanner-flash-btn',
    title: 'Use Flash',
    description: 'If lighting is poor, tap the flash icon in the top-right corner of the scanner for better visibility.',
    position: 'bottom',
    icon: '⚡',
  },
  {
    id: 'manual-entry',
    page: '/capture',
    target: 'manual-barcode-btn',
    title: 'Enter Manually',
    description: 'Can\'t scan? Tap "Enter barcode manually" to type it in. Type at least 3 characters and tap Go.',
    position: 'top',
    icon: '⌨️',
  },
  {
    id: 'take-photos',
    page: '/capture',
    title: 'Step 2: Take Photos',
    description: 'After the barcode is scanned, the camera opens. Point it at the product and tap the big white capture button.',
    position: 'center',
    icon: '📸',
  },
  {
    id: 'capture-btn',
    page: '/capture',
    title: 'Capture Button',
    description: 'This large white circle is your capture button. Tap it each time you want to take a product photo.',
    position: 'center',
    icon: '⭕',
  },
  {
    id: 'done-photos',
    page: '/capture',
    title: 'Done Taking Photos',
    description: 'Once you\'ve captured one or more photos, a green "Done" button appears. Tap it to proceed.',
    position: 'center',
    icon: '✅',
  },
  {
    id: 'product-details',
    page: '/capture',
    title: 'Step 3: Add Details',
    description: 'Fill in MRP, quantity, brand, and category — all on one page. Only fields you\'ve enabled in Settings will show.',
    position: 'center',
    icon: '📝',
  },
  {
    id: 'skip-continue',
    page: '/capture',
    title: 'Skip or Continue',
    description: 'Tap "Continue" to save the details, or "Skip" to save the product without details. You can edit them later.',
    position: 'center',
    icon: '⏭️',
  },
  {
    id: 'products-tab',
    page: '/products',
    target: 'nav-products',
    title: 'Step 4: View Products',
    description: 'Tap the Products tab to see all your captured items, sorted by most recent.',
    position: 'top',
    icon: '📦',
  },
  {
    id: 'select-products',
    page: '/products',
    title: 'Select Products',
    description: 'Each product card has a checkbox. Tap it to select products for sharing or deleting.',
    position: 'center',
    icon: '☑️',
  },
  {
    id: 'share-products',
    page: '/products',
    title: 'Step 5: Share',
    description: 'After selecting products, tap "Share" to send a zip file containing all product images and a CSV catalogue.',
    position: 'center',
    icon: '🔗',
  },
  {
    id: 'settings-tab',
    page: '/settings',
    target: 'nav-settings',
    title: 'Settings',
    description: 'Configure capture mode, toggle MRP/Quantity/Brand/Category, and manage your profile in Settings.',
    position: 'top',
    icon: '⚙️',
  },
  {
    id: 'finish',
    page: '/settings',
    title: 'You\'re All Set!',
    description: 'Start capturing products now. Tap the help icon anytime to see this guide again.',
    position: 'center',
    icon: '🎉',
  },
];

interface TourContextValue {
  isActive: boolean;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  isActive: false,
  currentStep: null,
  stepIndex: 0,
  totalSteps: 0,
  startTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  skipTour: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const currentStep = active ? TOUR_STEPS[stepIndex] ?? null : null;

  const navigateToStep = useCallback((step: TourStep) => {
    if (!location.pathname.startsWith(step.page)) {
      navigate(step.page);
    }
  }, [navigate, location.pathname]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    navigate('/capture');
  }, [navigate]);

  const nextStep = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= TOUR_STEPS.length) {
      setActive(false);
      setStepIndex(0);
      navigate('/capture');
      return;
    }
    setStepIndex(next);
    navigateToStep(TOUR_STEPS[next]);
  }, [stepIndex, navigateToStep, navigate]);

  const prevStep = useCallback(() => {
    const prev = stepIndex - 1;
    if (prev < 0) return;
    setStepIndex(prev);
    navigateToStep(TOUR_STEPS[prev]);
  }, [stepIndex, navigateToStep]);

  const skipTour = useCallback(() => {
    setActive(false);
    setStepIndex(0);
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
      totalSteps: TOUR_STEPS.length,
      startTour,
      nextStep,
      prevStep,
      skipTour,
    }}>
      {children}
    </TourContext.Provider>
  );
}
