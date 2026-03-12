import type { ReactNode } from 'react';
import { MD3NavigationBar } from './md3/MD3NavigationBar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full bg-surface flex flex-col">
      <main className="flex-1 min-h-0 pb-16 overflow-y-auto">{children}</main>
      <MD3NavigationBar />
    </div>
  );
}
