import './globals.css';

export const metadata = {
  title: 'Gestión Novedades',
  description: 'Plataforma de gestión de novedades y pedidos en oficina',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`
        }} />
      </head>
      <body>
        <div className="sidebar-overlay" />
        {children}
      </body>
    </html>
  );
}