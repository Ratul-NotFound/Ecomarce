const https = require('https');

https.get('https://ecomarce-delta.vercel.app/manifest.webmanifest', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Body:');
    console.log(body);
  });
}).on('error', err => console.error(err));
