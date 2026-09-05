const https = require('https');

https.get('https://ecomarce-delta.vercel.app/manifest.json', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Manifest status:', res.statusCode);
    console.log('Manifest Content-Type:', res.headers['content-type']);
    try {
      const json = JSON.parse(body);
      console.log('Manifest parsed successfully!');
      console.log('name:', json.name);
      console.log('icons:', json.icons);
    } catch (e) {
      console.error('Failed to parse manifest JSON:', e.message);
      console.log('Body:', body.slice(0, 300));
    }
  });
}).on('error', err => console.error(err));
