import ClientLayout from './ClientLayout';

export const metadata = {
  metadataBase: new URL('https://pizdo.info'),
  title: {
    default: 'Pizdo — Herramientas Industriales de Calidad Profesional',
    template: '%s | Pizdo'
  },
  description: 'Catálogo de herramientas industriales profesionales. Taladros, amoladoras, sets de mecánica y más. Calidad garantizada con envíos a toda Colombia. Compra ahora.',
  keywords: ['herramientas', 'industriales', 'taladro', 'amoladora', 'herramientas eléctricas', 'Pizdo', 'ferretería', 'Colombia'],
  authors: [{ name: 'Pizdo Industrial Tools' }],
  creator: 'Pizdo Industrial Tools',
  publisher: 'Pizdo Industrial Tools',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://pizdo.info/tienda',
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
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: 'https://pizdo.info/tienda' }
};

export default function TiendaLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Pizdo Industrial Tools',
    url: 'https://pizdo.info/tienda',
    logo: 'https://pizdo.info/og-image.jpg',
    description: 'Herramientas industriales de calidad profesional. Compra taladros, amoladoras, sets de mecánica con envío a toda Colombia.',
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: '+57-300-000-0000', availableLanguage: 'es' },
    sameAs: ['https://pizdo.info/tienda']
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ClientLayout>{children}</ClientLayout>
    </>
  );
}
