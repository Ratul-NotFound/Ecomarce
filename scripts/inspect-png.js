const fs = require('fs');

function inspectPngChunks(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  const chunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    chunks.push({ type, len });
    pos += 12 + len;
  }
  return { file, chunks, totalSize: buf.length };
}

console.log(inspectPngChunks('public/icons/icon-192.png'));
console.log(inspectPngChunks('public/icons/icon-512.png'));
