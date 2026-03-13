import { useEffect, useState, useRef } from 'react';
import { useTour } from '../context/TourContext';
import { Icon } from './md3/Icon';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const { isActive, currentStep, stepIndex, totalSteps, nextStep, prevStep, skipTour } = useTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!isActive || !currentStep) {
      setVisible(false);
      setTargetRect(null);
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
        setVisible(true);
      } else {
        setTargetRect(null);
        setVisible(true);
      }
    };

    const timer = setTimeout(findTarget, 150);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, currentStep, stepIndex]);

  if (!isActive || !currentStep || !visible) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const tooltipPosition = currentStep.position ?? 'center';

  const getTooltipStyle = (): React.CSSProperties => {
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
    <div className="fixed inset-0 z-[100]" onClick={skipTour}>
      {/* Overlay with spotlight cutout */}
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

      {/* Spotlight pulse ring */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-primary animate-pulse pointer-events-none"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={getTooltipStyle()}
        className="w-[min(340px,calc(100vw-32px))] z-[101]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-surface rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/50">
          {/* Progress bar */}
          <div className="h-1 bg-surface-container">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-r-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5 space-y-3">
            {/* Icon + step counter */}
            <div className="flex items-center justify-between">
              <span className="text-2xl">{currentStep.icon}</span>
              <span className="text-xs text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded-full">
                {stepIndex + 1} / {totalSteps}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-on-surface leading-tight">
              {currentStep.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {currentStep.description}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {!isFirst && (
                <button
                  onClick={prevStep}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container active:bg-surface-container-high"
                >
                  <Icon name="arrow-back" size={18} className="text-on-surface-variant" />
                </button>
              )}

              <button
                onClick={skipTour}
                className="text-xs text-on-surface-variant font-medium px-3 py-2 rounded-full active:bg-surface-container-high"
              >
                {isLast ? '' : 'Skip Tour'}
              </button>

              <div className="flex-1" />

              <button
                onClick={nextStep}
                className="h-10 px-5 rounded-full bg-primary text-on-primary text-sm font-medium flex items-center gap-1.5 active:brightness-90 shadow-sm"
              >
                {isLast ? 'Start Cataloguing' : 'Next'}
                {!isLast && <Icon name="chevron_right" size={16} className="text-on-primary" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
