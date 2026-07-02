import './globals.css';
import AuthHeartbeat from '@/components/providers/AuthHeartbeat';

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
        <AuthHeartbeat>{children}</AuthHeartbeat>
      </body>
    </html>
  );
}