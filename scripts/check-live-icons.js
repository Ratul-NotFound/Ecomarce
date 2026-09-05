const https = require('https');

function checkUrl(url) {
  https.get(url, (res) => {
    console.log(url, 'Status:', res.statusCode, 'Content-Type:', res.headers['content-type'], 'Size:', res.headers['content-length']);
  }).on('error', err => console.error(url, err.message));
}

checkUrl('https://ecomarce-delta.vercel.app/icons/icon-192.png');
checkUrl('https://ecomarce-delta.vercel.app/icons/icon-512.png');
checkUrl('https://ecomarce-delta.vercel.app/icons/icon-180.png');
