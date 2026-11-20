import type { Metadata } from 'next';
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Numbercraft — Mathematics & Probability Game Studio',
  description:
    'Tactile mathematics and probability game studio for students aged 8 to 16 featuring Basic Arithmetic, Modular Probability, and Strategy-Based Number Theory.',
  openGraph: {
    title: 'Numbercraft — Mathematics & Probability Game Studio',
    description:
      'Tactile mathematics and probability game studio for students aged 8 to 16 featuring Basic Arithmetic, Modular Probability, and Strategy-Based Number Theory.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Numbercraft — Mathematics & Probability Game Studio',
    description:
      'Tactile mathematics and probability game studio for students aged 8 to 16.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plusJakartaSans.variable} ${ibmPlexMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#FAF8F4] text-[#1C232B] font-sans antialiased selection:bg-[#1D4ED8]/15 selection:text-[#1D4ED8]"
      >
        {children}
      </body>
    </html>
  );
}
