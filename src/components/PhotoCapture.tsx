import { useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useSettings } from '../context/SettingsContext';
import { MD3Button } from './md3/MD3Button';
import { Icon } from './md3/Icon';

interface Props {
  onCapture: (blob: Blob) => void;
  label?: string;
  /** Slot rendered between the viewfinder and the capture button row */
  bottomSlot?: React.ReactNode;
  /** If provided, shows a "Done" button to the left of the capture button */
  onDone?: (() => void) | null;
  doneLabel?: string;
}

export function PhotoCapture({ onCapture, label, bottomSlot, onDone, doneLabel }: Props) {
  const { videoRef, isActive, error, torchOn, torchSupported, start, stop, capture, switchCamera, retry, toggleTorch } = useCamera();
  const { settings } = useSettings();

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  const handleCapture = async () => {
    const blob = await capture();
    if (blob) {
      if (settings.hapticFeedback && navigator.vibrate) navigator.vibrate(50);
      onCapture(blob);
    }
  };

  return (
    <div className="flex flex-col items-center flex-1 min-h-0">
      {label && (
        <p className="text-sm text-primary font-medium py-1 flex-shrink-0">{label}</p>
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
        {/* Torch inside camera view */}
        {torchSupported && (
          <button
            onClick={toggleTorch}
            className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md ${
              torchOn ? 'bg-yellow-400 text-black' : 'bg-black/50 text-white'
            }`}
            title={torchOn ? 'Flash off' : 'Flash on'}
          >
            <Icon name={torchOn ? 'flash-on' : 'flash-off'} size={20} />
          </button>
        )}
      </div>

      {error && (
        <div className="text-on-error-container text-sm bg-error-container p-3 rounded-[var(--md-shape-sm)] w-full max-w-sm mt-2 flex-shrink-0">
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

      {/* Bottom controls: tag indicator + capture button row */}
      <div className="w-full max-w-sm flex-shrink-0 pt-2 pb-1 space-y-1">
        {bottomSlot}

        <div className="flex items-center justify-center gap-4">
          {/* Left slot: Done button or switch-camera */}
          {onDone ? (
            <button
              onClick={onDone}
              className="h-11 px-3 rounded-full bg-primary flex items-center justify-center gap-1.5 active:brightness-90"
              title="Done"
            >
              <Icon name="check" size={18} className="text-on-primary" />
              <span className="text-xs font-medium text-on-primary">{doneLabel || 'Done'}</span>
            </button>
          ) : (
            <button
              onClick={switchCamera}
              className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center active:bg-surface-container-high"
              title="Switch camera"
            >
              <Icon name="swap-camera" size={22} className="text-on-surface-variant" />
            </button>
          )}

          {/* Capture button */}
          <button
            onClick={handleCapture}
            disabled={!isActive}
            className="relative w-16 h-16 disabled:opacity-40"
            title="Capture photo"
          >
            <span className="absolute inset-0 rounded-full border-4 border-white bg-white/20 capture-btn-ring" />
            <span className="absolute inset-1 rounded-full bg-white border-2 border-outline-variant active:bg-surface-dim" />
          </button>

          {/* Right slot: switch-camera (when Done is shown) or spacer */}
          {onDone ? (
            <button
              onClick={switchCamera}
              className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center active:bg-surface-container-high"
              title="Switch camera"
            >
              <Icon name="swap-camera" size={22} className="text-on-surface-variant" />
            </button>
          ) : (
            <div className="w-11 h-11" />
          )}
        </div>
      </div>
    </div>
  );
}
