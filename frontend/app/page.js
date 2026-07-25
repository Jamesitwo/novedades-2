import ClientLayout from './ClientLayout';

export default function Home() {
  return (
    <ClientLayout>
      <div style={{ padding: '80px 24px', textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: '#0b1c30', marginBottom: 16 }}>Pizdo</h1>
        <p style={{ fontSize: 18, color: '#564334', maxWidth: 500 }}>Herramientas industriales de calidad profesional.</p>
        <a href="/admin/login" style={{ display: 'inline-block', marginTop: 32, padding: '12px 24px', background: '#ff8c00', color: '#fff', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
          Admin
        </a>
      </div>
    </ClientLayout>
  );
}
