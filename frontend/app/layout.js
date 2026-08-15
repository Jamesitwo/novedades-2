import './globals.css';
import MetaPixel from '../components/MetaPixel';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f1117'
};

export const metadata = {
  metadataBase: new URL('https://pizdo.info'),
  title: {
    default: 'Pizdo — Herramientas Industriales de Calidad Profesional',
    template: '%s | Pizdo'
  },
  verification: { google: 'HpRjJhdHiDUIJ22y3ZGdblE6N6z7hbm5wKDvFV94hFU' },
  description: 'Catálogo de herramientas industriales profesionales. Taladros, amoladoras, sets de mecánica y más. Calidad garantizada con envíos a toda Colombia. Compra ahora.',
  keywords: ['herramientas', 'industriales', 'taladro', 'amoladora', 'herramientas eléctricas', 'Pizdo', 'ferretería', 'Colombia'],
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://pizdo.info',
    siteName: 'Pizdo Industrial Tools',
    title: 'Pizdo — Herramientas Industriales de Calidad Profesional',
    description: 'Catálogo de herramientas industriales profesionales.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Pizdo Industrial Tools' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pizdo — Herramientas Industriales',
    description: 'Catálogo de herramientas industriales profesionales.',
    images: ['/og-image.jpg']
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: 'https://pizdo.info' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})()` }} />
      </head>
      <body>
        <MetaPixel />
        <div className="sidebar-overlay" />
        {children}
      </body>
    </html>
  );
}
