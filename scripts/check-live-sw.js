const https = require('https');

https.get('https://ecomarce-delta.vercel.app/sw.js', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('SW status:', res.statusCode);
    console.log('SW Content-Type:', res.headers['content-type']);
    console.log('SW snippet:', body.slice(0, 300));
  });
}).on('error', err => console.error(err));
