'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';

export default function ApiKeyLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, initialized, usuario, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) {
      router.push('/login');
    } else if (usuario?.rol !== 'admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, initialized, usuario, router]);

  if (!initialized) return null;
  if (!isAuthenticated || usuario?.rol !== 'admin') return null;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Header />
        {children}
      </div>
    </div>
  );
}
