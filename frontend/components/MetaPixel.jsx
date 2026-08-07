'use client';
import { useEffect } from 'react';
import Script from 'next/script';
import api from '@/lib/api';

export default function MetaPixel() {
  useEffect(() => {
    api.get('/api/configuracion/public').then(({ data }) => {
      const pixelId = data.meta_pixel_id;
      if (!pixelId || typeof window === 'undefined' || window.fbq) return;

      window.fbq = function() { (window.fbq.q = window.fbq.q || []).push(arguments); };
      window._fbq = window._fbq || window.fbq;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.onload = () => {
        window.fbq('init', pixelId);
        window.fbq('track', 'PageView');
      };
      document.head.appendChild(script);
    }).catch(() => {});
  }, []);

  return null;
}
