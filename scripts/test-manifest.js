const http = require('http');

// Check if dev server is up or test static build
console.log('Testing manifest files existence and format...');
const fs = require('fs');

const manifestJson = fs.readFileSync('public/manifest.json', 'utf8');
console.log('public/manifest.json parsed:');
const parsed = JSON.parse(manifestJson);
console.log(JSON.stringify(parsed, null, 2));
