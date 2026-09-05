const https = require('https');

https.get('https://ecomarce-delta.vercel.app', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Contains header-install-pill:', body.includes('header-install-pill'));
    console.log('Contains pwa-install-btn:', body.includes('pwa-install-btn'));
  });
}).on('error', err => console.error(err));
