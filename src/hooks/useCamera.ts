import { useRef, useCallback, useState, useEffect } from 'react';
import { resizeImageBlob } from '../utils/imageUtils';

interface UseCamera {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  error: string | null;
  torchOn: boolean;
  torchSupported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  capture: () => Promise<Blob | null>;
  switchCamera: () => Promise<void>;
  retry: () => Promise<void>;
  toggleTorch: () => Promise<void>;
}

function parseCameraError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('NotAllowedError') || msg.includes('Permission denied') || msg.includes('not allowed')) {
    return 'Camera permission denied. Please allow camera access in your browser/device settings and try again.';
  }
  if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
    return 'No camera found on this device.';
  }
  if (msg.includes('NotReadableError') || msg.includes('Could not start video source')) {
    return 'Camera is already in use by another app. Close other apps using the camera and try again.';
  }
  if (msg.includes('OverconstrainedError')) {
    return 'Camera does not support the requested resolution. Trying with default settings...';
  }
  return msg || 'Camera access denied';
}

export function useCamera(): UseCamera {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startWithMode = useCallback(
    async (mode: 'environment' | 'user') => {
      stop();
      setError(null);

      // Pre-check permission if API available
      try {
        if (navigator.permissions?.query) {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (result.state === 'denied') {
            setError('Camera permission denied. Please allow camera access in your browser/device settings and try again.');
            return;
          }
        }
      } catch {
        // permissions.query not supported, proceed with getUserMedia
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsActive(true);
        setTorchOn(false);

        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            const caps = track.getCapabilities?.() as Record<string, unknown> | undefined;
            setTorchSupported(!!caps?.torch);
          } catch {
            setTorchSupported(false);
          }
        }
      } catch (err) {
        setError(parseCameraError(err));
      }
    },
    [stop],
  );

  const start = useCallback(() => startWithMode(facingMode), [startWithMode, facingMode]);

  const retry = useCallback(async () => {
    setError(null);
    await startWithMode(facingMode);
  }, [startWithMode, facingMode]);

  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (isActive) {
      await startWithMode(newMode);
    }
  }, [facingMode, isActive, startWithMode]);

  const capture = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !isActive) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          try {
            const resized = await resizeImageBlob(blob);
            resolve(resized);
          } catch {
            resolve(blob);
          }
        },
        'image/jpeg',
        0.9,
      );
    });
  }, [isActive]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // torch not supported on this track
    }
  }, [torchOn]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { videoRef, isActive, error, torchOn, torchSupported, start, stop, capture, switchCamera, retry, toggleTorch };
}
