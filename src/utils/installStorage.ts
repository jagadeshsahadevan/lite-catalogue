/**
 * Browser + device specific key for PWA install/dismiss state.
 * Ensures "Save to Home Screen" visibility is tracked per browser (Safari, Chrome, etc.)
 * and per device (iOS, Android, desktop).
 */
export function getInstallStorageKey(): string {
  const ua = navigator.userAgent;
  let device: string;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    device = 'ios';
  } else if (/Android/i.test(ua)) {
    device = 'android';
  } else {
    device = 'desktop';
  }

  let browser: string;
  if (/Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua)) {
    browser = 'safari';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'chrome';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'edge';
  } else {
    browser = 'other';
  }

  return `pwa-install-${device}-${browser}`;
}

const INSTALL_DISMISSED = 'dismissed';
const INSTALL_ACCEPTED = 'accepted';

export function getInstallState(): 'dismissed' | 'accepted' | null {
  try {
    const val = localStorage.getItem(getInstallStorageKey());
    if (val === INSTALL_DISMISSED || val === INSTALL_ACCEPTED) return val;
    return null;
  } catch {
    return null;
  }
}

export function setInstallDismissed(): void {
  try {
    localStorage.setItem(getInstallStorageKey(), INSTALL_DISMISSED);
  } catch {
    // ignore
  }
}

export function setInstallAccepted(): void {
  try {
    localStorage.setItem(getInstallStorageKey(), INSTALL_ACCEPTED);
  } catch {
    // ignore
  }
}
