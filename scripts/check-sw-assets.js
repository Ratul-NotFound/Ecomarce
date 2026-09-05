const https = require('https');

function check(url) {
  https.get(url, res => {
    console.log(url, 'status:', res.statusCode);
  }).on('error', e => console.error(url, e.message));
}

check('https://ecomarce-delta.vercel.app/sw.js');
check('https://ecomarce-delta.vercel.app/worker-xH02z4Hs-XqY8fYOX0kdv.js');
check('https://ecomarce-delta.vercel.app/workbox-00a24876.js');
