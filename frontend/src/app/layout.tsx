import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/context/AuthContext';
import { ToastProvider } from '@/lib/context/ToastContext';
import { OutfitsProvider } from '@/lib/context/OutfitsContext';

export const metadata: Metadata = {
  title: 'Charis — Wardrobe OS',
  description: 'The premier wardrobe operating system for the meticulous collection.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <OutfitsProvider>
            <ToastProvider>{children}</ToastProvider>
          </OutfitsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
