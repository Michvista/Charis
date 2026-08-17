'use client';

import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#fff8f5]">
      <Sidebar />
      <main className="flex-1 ml-[64px] min-w-0 p-6 md:p-12">
        {children}
      </main>
    </div>
  );
}
