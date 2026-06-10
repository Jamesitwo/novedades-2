import './globals.css';

export const metadata = {
  title: 'Gestión Novedades',
  description: 'Plataforma de gestión de novedades y pedidos en oficina',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="sidebar-overlay" />
        {children}
      </body>
    </html>
  );
}