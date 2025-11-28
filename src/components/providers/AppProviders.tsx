'use client';

import { Toaster } from 'sonner';
import type { ReactNode } from 'react';
import { MonitoringProvider } from '@/context/MonitoringProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

type Props = {
  children: ReactNode;
};

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider>
      <MonitoringProvider>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{ className: 'text-sm' }}
        />
      </MonitoringProvider>
    </ThemeProvider>
  );
}

