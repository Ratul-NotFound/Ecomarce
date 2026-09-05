const https = require('https');

https.get('https://ecomarce-delta.vercel.app', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    const hasManifest = body.includes('manifest.json');
    const hasEarlyScript = body.includes('__pwaInstall');
    console.log('Has manifest.json:', hasManifest);
    console.log('Has early script:', hasEarlyScript);
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
