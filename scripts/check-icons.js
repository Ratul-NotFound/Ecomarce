const fs = require('fs');

function getPngInfo(file) {
  try {
    const buf = fs.readFileSync(file);
    const magic = buf.slice(0, 8).toString('hex');
    const isPng = magic === '89504e470d0a1a0a';
    if (!isPng) return { file, isPng: false, size: buf.length };
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { file, isPng: true, width, height, size: buf.length };
  } catch (err) {
    return { file, error: err.message };
  }
}

console.log(getPngInfo('public/icons/icon-192.png'));
console.log(getPngInfo('public/icons/icon-512.png'));
console.log(getPngInfo('public/icons/icon-180.png'));
console.log(getPngInfo('public/icons/badge-72.png'));
