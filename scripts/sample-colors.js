const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('public/icons/icon-192.png');
const width = 192, height = 192;
let pos = 8;
const idatChunks = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.slice(pos + 4, pos + 8).toString('ascii');
  if (type === 'IDAT') idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
const colors = new Set();
for (let y = 0; y < height; y++) {
  const rowStart = y * (1 + width * 3) + 1;
  for (let x = 0; x < width; x++) {
    const r = decompressed[rowStart + x * 3];
    const g = decompressed[rowStart + x * 3 + 1];
    const b = decompressed[rowStart + x * 3 + 2];
    colors.add(`${r},${g},${b}`);
  }
}
console.log('Unique colors in icon-192.png:', Array.from(colors));
