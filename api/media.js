// AZURO media: each coin's image and its pump.fun metadata, served from the registry so they never go missing.
const L = require('./_lib');

module.exports = L.wrap(async (req, res) => {
  const qs = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const id = String(qs.i || qs.m || '').replace(/\.(png|json)$/, '');
  if (!/^[0-9a-f]{8,24}$/.test(id)) L.fail('not found', 404);
  const q = await L.ensure(); if (!q) L.fail('not found', 404);
  const [r] = await q`select mime, data, meta from az_media where id = ${id}`;
  if (!r) L.fail('not found', 404);
  if (qs.i) {
    res.statusCode = 200; res.setHeader('content-type', r.mime); res.setHeader('cache-control', 'public, max-age=31536000, immutable');
    return res.end(Buffer.from(r.data, 'base64'));
  }
  res.statusCode = 200; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'public, max-age=31536000, immutable');
  res.setHeader('access-control-allow-origin', '*');
  res.end(r.meta || '{}');
});
