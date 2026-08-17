export const dynamic = 'force-dynamic';

const BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://pizdo.info').replace(/\/+$/, '');

export async function GET() {
  try {
    const res = await fetch(`${BASE}/api/configuracion/public`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return new Response(null, { status: 204 });

    const data = await res.json();
    const url = data.favicon_url;
    if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      return new Response(null, { status: 204 });
    }

    const img = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!img.ok) return new Response(null, { status: 204 });

    const buffer = Buffer.from(await img.arrayBuffer());
    const contentType = img.headers.get('content-type') || 'image/png';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
