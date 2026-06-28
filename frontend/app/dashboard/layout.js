'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import WebSocketProvider from '../../components/providers/WebSocketProvider';
import useHeartbeat from '../../lib/useHeartbeat';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, initialized, initialize } = useAuthStore();

  useHeartbeat();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, initialized, router]);

  if (!initialized) return null;
  if (!isAuthenticated) return null;

  return (
    <WebSocketProvider>
      <div className="layout">
        <Sidebar />
        <div className="main">
          <Header />
          {children}
        </div>
      </div>
    </WebSocketProvider>
  );
}
