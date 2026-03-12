import { useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';

interface Props {
  onCapture: (blob: Blob) => void;
  label?: string;
  /** Slot rendered between the viewfinder and the capture button row */
  bottomSlot?: React.ReactNode;
}

export function PhotoCapture({ onCapture, label, bottomSlot }: Props) {
  const { videoRef, isActive, error, start, stop, capture, switchCamera, retry } = useCamera();

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  const handleCapture = async () => {
    const blob = await capture();
    if (blob) {
      if (navigator.vibrate) navigator.vibrate(50);
      onCapture(blob);
    }
  };

  return (
    <div className="flex flex-col items-center h-[calc(100vh-10rem)]">
      {label && (
        <div className="text-center py-1">
          <p className="text-sm text-primary font-medium">{label}</p>
        </div>
      )}

      <div className="camera-viewfinder relative w-full max-w-sm flex-1 min-h-0 bg-black rounded-[var(--md-shape-lg)] overflow-hidden">
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!isActive && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            Starting camera...
          </div>
        )}
      </div>

      {error && (
        <div className="text-on-error-container text-sm bg-error-container p-3 rounded-[var(--md-shape-sm)] w-full max-w-sm mt-2">
          <p>{error}</p>
          <MD3Button
            variant="outlined"
            onClick={retry}
            className="mt-2"
            icon={<Icon name="refresh" size={18} />}
          >
            Grant Camera Permission
          </MD3Button>
        </div>
      )}

      {/* Sticky bottom area: tag indicator + capture button */}
      <div className="w-full max-w-sm flex-shrink-0 pt-3 pb-1 space-y-2">
        {bottomSlot}

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center active:bg-surface-container-high"
            title="Switch camera"
          >
            <Icon name="swap-camera" size={24} className="text-on-surface-variant" />
          </button>

          <button
            onClick={handleCapture}
            disabled={!isActive}
            className="relative w-18 h-18 disabled:opacity-40"
            title="Capture photo"
          >
            <span className="absolute inset-0 rounded-full border-4 border-white bg-white/20 capture-btn-ring" />
            <span className="absolute inset-1 rounded-full bg-white border-2 border-outline-variant active:bg-surface-dim" />
          </button>

          <div className="w-12 h-12" />
        </div>
      </div>
    </div>
  );
}
