import { useState, useEffect, useCallback } from 'react';
import { getInstallState, setInstallDismissed, setInstallAccepted } from '../utils/installStorage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);

  useEffect(() => {
    // Check browser+device-specific persisted state
    const stored = getInstallState();
    if (stored === 'dismissed') {
      setUserDismissed(true);
      return;
    }
    if (stored === 'accepted') {
      setIsInstalled(true);
      return;
    }

    // Detect if already installed (standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setIsInstalled(true);
      setInstallAccepted();
      return;
    }

    // Detect iOS (no beforeinstallprompt, show manual instructions)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    // Detect Android (for manual instructions fallback)
    setIsAndroid(/Android/i.test(navigator.userAgent));

    if (ios) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setInstallAccepted();
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismissInstallPrompt = useCallback(() => {
    setUserDismissed(true);
    setInstallDismissed();
  }, []);

  const showInstallSection = !isInstalled && !userDismissed && (deferredPrompt || isIOS || isAndroid);

  return { deferredPrompt, isInstalled, isIOS, isAndroid, promptInstall, dismissInstallPrompt, showInstallSection };
}
