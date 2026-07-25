import './globals.css';

export const metadata = {
  metadataBase: new URL('https://pizdo.info'),
  title: {
    default: 'Pizdo — Herramientas Industriales de Calidad Profesional',
    template: '%s | Pizdo'
  },
  verification: { google: 'HpRjJhdHiDUIJ22y3ZGdblE6N6z7hbm5wKDvFV94hFU' },
  description: 'Catálogo de herramientas industriales profesionales. Taladros, amoladoras, sets de mecánica y más. Calidad garantizada con envíos a toda Colombia. Compra ahora.',
  keywords: ['herramientas', 'industriales', 'taladro', 'amoladora', 'herramientas eléctricas', 'Pizdo', 'ferretería', 'Colombia'],
  authors: [{ name: 'Pizdo Industrial Tools' }],
  creator: 'Pizdo Industrial Tools',
  publisher: 'Pizdo Industrial Tools',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://pizdo.info',
    siteName: 'Pizdo Industrial Tools',
    title: 'Pizdo — Herramientas Industriales de Calidad Profesional',
    description: 'Catálogo de herramientas industriales profesionales. Taladros, amoladoras, sets de mecánica y más. Calidad garantizada.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Pizdo Industrial Tools' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pizdo — Herramientas Industriales',
    description: 'Catálogo de herramientas industriales profesionales.',
    images: ['/og-image.jpg']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true }
  },
  alternates: { canonical: 'https://pizdo.info' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`
        }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Pizdo Industrial Tools',
              url: 'https://pizdo.info',
              description: 'Herramientas industriales de calidad profesional.',
              contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: '+57-300-000-0000', availableLanguage: 'es' }
            })
          }}
        />
      </head>
      <body>
        <div className="sidebar-overlay" />
        {children}
      </body>
    </html>
  );
}
