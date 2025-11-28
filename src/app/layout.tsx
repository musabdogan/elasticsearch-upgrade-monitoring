import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/providers/AppProviders';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap'
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Elastic Upgrade Monitoring',
  description:
    'Minimal, kurumsal eşleşen bir arayüz ile Elasticsearch upgrade süreçlerini gerçek zamanlı izle.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders>
          <div className="bg-[radial-gradient(circle_at_top,_rgba(27,37,84,0.25),_transparent_60%)]">
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
