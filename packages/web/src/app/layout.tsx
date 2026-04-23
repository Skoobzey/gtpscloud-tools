import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GTPS Cloud Tools',
  description: 'GTPS Cloud Operational Tools Dashboard',
  icons: {
    icon: '/logos/logo.png',
    shortcut: '/logos/logo.png',
    apple: '/logos/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
