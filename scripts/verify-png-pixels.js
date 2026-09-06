const fs = require('fs');
const zlib = require('zlib');

try {
  const buf = fs.readFileSync('public/icons/icon-192.png');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  console.log({ width, height, bitDepth, colorType, len: buf.length });

  // Find IDAT chunk
  let pos = 8;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    if (type === 'IDAT') {
      idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const idatData = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(idatData);
  console.log('Successfully decompressed IDAT bytes:', decompressed.length);
  const expectedBytes = height * (1 + width * 3);
  console.log('Expected bytes for 192x192 RGB:', expectedBytes);
  console.log('Matches expected:', decompressed.length === expectedBytes);
} catch (err) {
  console.error('Error decoding PNG:', err);
}
