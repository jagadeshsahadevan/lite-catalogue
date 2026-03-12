import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Sticky bottom CTA container that sits above the 64px navigation bar.
 * Uses frosted glass effect for layering over content.
 */
export function StickyBottomCTA({ children, className = '' }: Props) {
  return (
    <div
      className={`
        fixed bottom-16 left-0 right-0 z-40
        px-4 py-3
        bg-surface/95 backdrop-blur-sm
        border-t border-outline-variant
        flex flex-col gap-2
        ${className}
      `}
    >
      {children}
    </div>
  );
}
