import type { ReactNode } from 'react';
import { MD3NavigationBar } from './md3/MD3NavigationBar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-surface flex flex-col">
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
      <MD3NavigationBar />
    </div>
  );
}
