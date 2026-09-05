const fs = require('fs');

// Read PNG and check color palette or dump first 100 bytes
const buf = fs.readFileSync('public/icons/icon-192.png');
console.log('Hex dump of icon-192.png:');
console.log(buf.slice(0, 120).toString('hex'));
