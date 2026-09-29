import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import DemoBanner from '@/components/layout/DemoBanner';
import QueryProvider from '@/components/providers/QueryProvider';

const inter = { className: "" };

export const metadata: Metadata = {
  title: 'RIO',
  description: 'Dam-break analysis and flood inundation simulation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-slate-700 min-h-screen`}>
        <QueryProvider>
          <Navbar />
          <main className="pt-14">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
