import { IBM_Plex_Sans_Thai, IBM_Plex_Sans, IBM_Plex_Mono, Noto_Serif_Thai } from 'next/font/google';
import SessionProvider from '@/components/SessionProvider';
import ImpersonationBanner from '@/components/ui/ImpersonationBanner';
import './globals.css';

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-plex-sans-thai',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const notoSerifThai = Noto_Serif_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-noto-serif-thai',
  display: 'swap',
});

export const metadata = {
  title: 'Digital Learning Space SMAC',
  description: 'พื้นที่เรียนรู้ดิจิทัลเกี่ยวกับสาระสำคัญทางการพยาบาล',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${ibmPlexSansThai.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${notoSerifThai.variable}`}>
      <body>
        <SessionProvider>
          <ImpersonationBanner />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

