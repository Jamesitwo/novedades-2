'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LucidSalesPedidoPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace('/lucidsales');
  }, [router]);

  return (
    <div className="content" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
      Redirigiendo al listado de pedidos...
    </div>
  );
}
