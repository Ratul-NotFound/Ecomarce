const https = require('https');

async function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ url, status: res.statusCode, headers: res.headers, len: data.length }));
    }).on('error', err => resolve({ url, error: err.message }));
  });
}

async function run() {
  const urls = [
    'https://ecomarce-delta.vercel.app/',
    'https://ecomarce-delta.vercel.app/manifest.json',
    'https://ecomarce-delta.vercel.app/sw.js',
    'https://ecomarce-delta.vercel.app/sw-push.js',
    'https://ecomarce-delta.vercel.app/icons/icon-192.png',
    'https://ecomarce-delta.vercel.app/icons/icon-512.png',
  ];
  for (const u of urls) {
    const r = await get(u);
    console.log(r.url, '-> Status:', r.status, 'Content-Type:', r.headers ? r.headers['content-type'] : 'none', 'Length:', r.len);
  }
}

run();
