import { useEffect, useState, useRef, useCallback } from 'react';
import { useTour } from '../context/TourContext';
import { Icon } from './md3/Icon';
import { MD3Button } from './md3/MD3Button';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function FullTourOffer() {
  const { acceptFullTour, declineFullTour } = useTour();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={declineFullTour}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-surface rounded-2xl shadow-2xl w-[min(340px,calc(100vw-32px))] overflow-hidden border border-outline-variant/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4 text-center">
          <span className="text-3xl">🎓</span>
          <h3 className="text-base font-semibold text-on-surface">Want the full tour?</h3>
          <p className="text-sm text-on-surface-variant">
            You've seen this page's features. Would you like a complete walkthrough of the entire app?
          </p>
          <div className="flex gap-3 pt-1">
            <MD3Button variant="outlined" onClick={declineFullTour} className="flex-1">
              No thanks
            </MD3Button>
            <MD3Button variant="filled" onClick={acceptFullTour} className="flex-1">
              Show full tour
            </MD3Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TourOverlay() {
  const {
    isActive, currentStep, stepIndex, totalSteps,
    nextStep, prevStep, skipTour, showFullTourOffer,
  } = useTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null; }
    setCountdown(null);
  }, []);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setVisible(false);
      setTargetRect(null);
      clearTimers();
      return;
    }

    const findTarget = () => {
      if (!currentStep.target) {
        setTargetRect(null);
        setVisible(true);
        return;
      }
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const padding = 6;
        setTargetRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });
      } else {
        setTargetRect(null);
      }
      setVisible(true);
    };

    const timer = setTimeout(findTarget, 150);

    return () => { clearTimeout(timer); };
  }, [isActive, currentStep, stepIndex, clearTimers]);

  useEffect(() => {
    clearTimers();
    if (!isActive || !currentStep?.autoAdvanceMs) return;

    const totalMs = currentStep.autoAdvanceMs;
    const startTime = Date.now();
    setCountdown(Math.ceil(totalMs / 1000));

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, totalMs - (Date.now() - startTime));
      setCountdown(Math.ceil(remaining / 1000));
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 500);

    autoRef.current = setTimeout(() => {
      nextStep();
    }, totalMs);

    return clearTimers;
  }, [isActive, currentStep, stepIndex, nextStep, clearTimers]);

  if (showFullTourOffer) return <FullTourOffer />;
  if (!isActive || !currentStep || !visible) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;
  const isInteractive = !!currentStep.interactive;

  const getTooltipStyle = (): React.CSSProperties => {
    if (isInteractive) {
      return {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100vw - 24px)',
      };
    }

    const tooltipPosition = currentStep.position ?? 'center';

    if (!targetRect || tooltipPosition === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const viewportH = window.innerHeight;
    const style: React.CSSProperties = {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: 'calc(100vw - 32px)',
    };

    if (tooltipPosition === 'top') {
      const above = targetRect.top - 16;
      if (above > viewportH * 0.5) {
        style.bottom = `${viewportH - targetRect.top + 12}px`;
      } else {
        style.top = `${targetRect.top + targetRect.height + 12}px`;
      }
    } else {
      const below = viewportH - (targetRect.top + targetRect.height) - 16;
      if (below > 180) {
        style.top = `${targetRect.top + targetRect.height + 12}px`;
      } else {
        style.bottom = `${viewportH - targetRect.top + 12}px`;
      }
    }

    return style;
  };

  return (
    <div className="fixed inset-0 z-[100]" style={isInteractive ? { pointerEvents: 'none' } : undefined} onClick={isInteractive ? undefined : skipTour}>
      {/* Overlay — skip for interactive steps */}
      {!isInteractive && (
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.7)"
            mask="url(#tour-mask)"
            style={{ pointerEvents: 'auto' }}
          />
        </svg>
      )}

      {/* Spotlight pulse ring */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-primary animate-pulse pointer-events-none"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: isInteractive ? '0 0 12px 4px rgba(103, 80, 164, 0.5)' : undefined,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
        className="w-[min(340px,calc(100vw-24px))] z-[101]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-surface rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/50 ${isInteractive ? 'shadow-[0_0_30px_rgba(0,0,0,0.3)]' : ''}`}>
          {/* Progress bar */}
          <div className="h-1 bg-surface-container">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-r-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="px-4 py-3 space-y-2">
            {/* Header: icon + title + close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">{currentStep.icon}</span>
                <h3 className="text-sm font-semibold text-on-surface leading-tight truncate">
                  {currentStep.title}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-on-surface-variant font-medium bg-surface-container px-1.5 py-0.5 rounded-full">
                  {stepIndex + 1}/{totalSteps}
                </span>
                <button
                  onClick={skipTour}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container active:bg-surface-container-high"
                  title="Close tour"
                >
                  <Icon name="close" size={14} className="text-on-surface-variant" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {currentStep.description}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prevStep}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container active:bg-surface-container-high"
                >
                  <Icon name="arrow-back" size={16} className="text-on-surface-variant" />
                </button>
              )}

              <div className="flex-1" />

              <button
                onClick={() => { clearTimers(); nextStep(); }}
                className="h-9 px-4 rounded-full bg-primary text-on-primary text-xs font-medium flex items-center gap-1.5 active:brightness-90 shadow-sm"
              >
                {isLast ? 'Done' : countdown !== null && countdown > 0 ? `Next (${countdown}s)` : 'Next'}
                {!isLast && <Icon name="chevron_right" size={14} className="text-on-primary" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
