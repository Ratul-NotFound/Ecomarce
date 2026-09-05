const fs = require('fs');

function checkPngColorType(file) {
  const buf = fs.readFileSync(file);
  const colorType = buf[25];
  const bitDepth = buf[24];
  const colorTypeNames = {
    0: 'Greyscale',
    2: 'Truecolor (RGB)',
    3: 'Indexed-color (Palette)',
    4: 'Greyscale + Alpha',
    6: 'Truecolor + Alpha (RGBA)',
  };
  return {
    file,
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth,
    colorType: colorTypeNames[colorType] || colorType,
    rawColorType: colorType,
  };
}

console.log(checkPngColorType('public/icons/icon-192.png'));
console.log(checkPngColorType('public/icons/icon-512.png'));
