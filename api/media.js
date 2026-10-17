const REFERERS = {
  'i.pximg.net': 'https://www.pixiv.net/',
  'www.tikwm.com': 'https://www.tikwm.com/',
  'tikwm.com': 'https://www.tikwm.com/'
};
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const fail = (res, status, message) => res.status(status).json({ status: false, message });

const allowed = target =>
  target.protocol === 'https:' && !target.port && !target.username && !target.password &&
  Object.prototype.hasOwnProperty.call(REFERERS, target.hostname);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    fail(res, 405, 'Method tidak diizinkan.');
    return;
  }
  let target;
  try {
    target = new URL(new URL(req.url, 'http://localhost').searchParams.get('u'));
  } catch {
    fail(res, 400, 'Parameter u tidak valid.');
    return;
  }
  if (!allowed(target)) {
    fail(res, 400, 'Host gambar tidak diizinkan.');
    return;
  }
  try {
    let upstream;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      upstream = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
        headers: {
          Referer: REFERERS[target.hostname],
          Accept: 'image/*',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
        }
      });
      if (upstream.status < 300 || upstream.status >= 400) break;
      const location = upstream.headers.get('location');
      if (!location) break;
      target = new URL(location, target);
      if (!allowed(target)) {
        fail(res, 502, 'Pengalihan ke host yang tidak diizinkan: ' + target.hostname);
        return;
      }
    }
    if (!upstream.ok) {
      fail(res, 502, 'Sumber gambar menolak permintaan (' + upstream.status + ').');
      return;
    }
    const type = upstream.headers.get('content-type') || '';
    if (!/^image\//i.test(type) || /svg/i.test(type)) {
      fail(res, 415, 'Sumber bukan gambar yang didukung.');
      return;
    }
    if (Number(upstream.headers.get('content-length')) > MAX_BYTES) {
      fail(res, 413, 'Gambar terlalu besar.');
      return;
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      fail(res, 413, 'Gambar terlalu besar.');
      return;
    }
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.status(200).send(buffer);
  } catch (error) {
    fail(res, 502, error && error.name === 'TimeoutError' ? 'Sumber gambar terlalu lama merespons.' : 'Gagal mengambil gambar.');
  }
};
