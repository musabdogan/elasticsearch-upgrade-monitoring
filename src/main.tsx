import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/context/ThemeProvider';
import { MonitoringProvider } from '@/context/MonitoringProvider';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MonitoringProvider>
        <App />
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{ className: 'text-sm' }}
        />
      </MonitoringProvider>
    </ThemeProvider>
  </React.StrictMode>
);

