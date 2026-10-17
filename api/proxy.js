const HOST = 'https://api.theresav.eu';
const API_KEY = process.env.THERESAV_API_KEY || 'fq19Z';
const ROUTES = {
  '/alightmotion/send': '/api/premium/alightmotion/send',
  '/alightmotion/verify': '/api/premium/alightmotion/verify',
  '/viu': '/api/premium/viu',
  '/stalk/mlbb': '/api/stalk/mlbb',
  '/stalk/roblox': '/api/stalk/roblox',
  '/stalk/instagram': '/api/stalk/instagram',
  '/download/tiktok': '/api/download/tiktok',
  '/download/ucdrive': '/api/download/ucdrive',
  '/search/pixiv': '/api/search/pixiv'
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ status: false, message: 'Method tidak diizinkan.' });
    return;
  }
  const url = new URL(req.url, 'http://localhost');
  const key = url.searchParams.get('p') || '';
  if (!Object.prototype.hasOwnProperty.call(ROUTES, key)) {
    res.status(404).json({ status: false, message: 'Endpoint tidak ditemukan.' });
    return;
  }
  url.searchParams.delete('p');
  const query = url.searchParams.toString();
  try {
    const upstream = await fetch(HOST + ROUTES[key] + (query ? '?' + query : ''), {
      headers: { 'x-apikey': API_KEY, Accept: 'application/json' },
      signal: AbortSignal.timeout(28000)
    });
    const body = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json; charset=utf-8').send(body);
  } catch (error) {
    const timeout = error && error.name === 'TimeoutError';
    res.status(timeout ? 504 : 502).json({
      status: false,
      message: timeout ? 'Server API terlalu lama merespons. Coba lagi.' : 'Server API tidak merespons. Coba lagi sebentar.'
    });
  }
};
