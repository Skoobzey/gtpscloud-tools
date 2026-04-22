import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GTPS Cloud — Support',
  description: 'GTPS Cloud ticket management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
