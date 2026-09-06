const https = require('https');

https.get('https://ecomarce-delta.vercel.app', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const headMatch = body.match(/<head[\s\S]*?<\/head>/i);
    if (headMatch) {
      console.log('--- HEAD CONTENT ---');
      const lines = headMatch[0].split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach(l => {
        if (l.includes('manifest') || l.includes('icon') || l.includes('theme') || l.includes('script')) {
          console.log(l);
        }
      });
    } else {
      console.log('No head match found');
    }
  });
}).on('error', err => console.error(err));
