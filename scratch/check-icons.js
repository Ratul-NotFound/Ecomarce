// scratch/check-icons.js
const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.toString('ascii', 1, 4) === 'PNG') {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
  } catch (e) {
    return null;
  }
  return null;
}

const icons = ['icon-192.png', 'icon-512.png', 'icon-180.png', 'badge-72.png'];
icons.forEach(name => {
  const p = path.join(__dirname, '..', 'public', 'icons', name);
  const exists = fs.existsSync(p);
  const dims = exists ? getPngDimensions(p) : null;
  console.log(`- ${name}: exists=${exists}, size=${exists ? fs.statSync(p).size : 0} bytes, dimensions=${dims ? `${dims.width}x${dims.height}` : 'unknown/svg'}`);
});
