async function verifyAll() {
  const urls = [
    'https://ecomarce-delta.vercel.app/manifest.json',
    'https://ecomarce-delta.vercel.app/manifest.webmanifest',
    'https://ecomarce-delta.vercel.app/sw.js',
    'https://ecomarce-delta.vercel.app/sw-push.js',
    'https://ecomarce-delta.vercel.app/icons/icon-192.png',
    'https://ecomarce-delta.vercel.app/icons/icon-512.png',
    'https://ecomarce-delta.vercel.app/icons/icon-192-maskable.png',
    'https://ecomarce-delta.vercel.app/icons/icon-512-maskable.png',
    'https://ecomarce-delta.vercel.app/icons/badge-72.png',
    'https://ecomarce-delta.vercel.app/icons/icon-180.png',
  ];

  console.log('=== VERIFYING LIVE ASSETS ===');
  for (const u of urls) {
    const res = await fetch(u, { cache: 'no-cache' });
    const ct = res.headers.get('content-type') || '';
    const cl = res.headers.get('content-length') || '';
    console.log(`${res.status} | ${u.split('/').slice(-2).join('/')} (${ct}, ${cl} bytes)`);
  }

  // Check manifest JSON content
  const mfRes = await fetch('https://ecomarce-delta.vercel.app/manifest.json', { cache: 'no-cache' });
  const mf = await mfRes.json();
  console.log('\nManifest check:');
  console.log('- id:', mf.id);
  console.log('- start_url:', mf.start_url);
  console.log('- display:', mf.display);
  console.log('- icons count:', mf.icons.length);
  console.log('- icons:', mf.icons.map(i => `${i.src} (${i.purpose})`).join(', '));

  // Check home HTML head
  const htmlRes = await fetch('https://ecomarce-delta.vercel.app/', { cache: 'no-cache' });
  const html = await htmlRes.text();
  const manifestMatches = [...html.matchAll(/<link[^>]+rel=["']manifest["'][^>]*>/gi)];
  console.log('\nHTML <head> manifest links count:', manifestMatches.length);
  manifestMatches.forEach(m => console.log('  ', m[0]));
}
verifyAll();
