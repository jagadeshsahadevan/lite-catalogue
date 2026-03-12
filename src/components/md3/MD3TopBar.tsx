import type { ReactNode } from 'react';

interface Props {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function MD3TopBar({ title, leading, trailing }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-frame text-on-frame safe-area-pt">
      <div className="flex items-center h-16 px-4 gap-3">
        {leading && <div className="flex-shrink-0">{leading}</div>}
        <h1 className="flex-1 text-lg font-medium truncate">{title}</h1>
        {trailing && <div className="flex-shrink-0">{trailing}</div>}
      </div>
    </header>
  );
}
