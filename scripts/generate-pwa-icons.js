const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');

// Standard icon SVG (any) — rounded squircle with gradient & shopping bag + ShopBD branding
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#1e1b4b" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Background squircle -->
  <rect x="24" y="24" width="464" height="464" rx="116" fill="url(#grad)" filter="url(#shadow)"/>
  <!-- Inner subtle border -->
  <rect x="26" y="26" width="460" height="460" rx="114" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.25"/>
  <!-- Shopping bag body -->
  <path d="M148 180 L364 180 L346 400 C344 416 332 428 316 428 L196 428 C180 428 168 416 166 400 Z" fill="#ffffff" />
  <!-- Shopping bag handle -->
  <path d="M196 180 C196 112 316 112 316 180" fill="none" stroke="#ffffff" stroke-width="32" stroke-linecap="round"/>
  <!-- Bag accent: lightning bolt / spark in primary color -->
  <path d="M266 226 L230 300 L260 300 L246 366 L286 286 L254 286 Z" fill="#2563eb"/>
</svg>
`;

// Maskable icon SVG — Full bleed 512x512 with safe-zone centered icon (40% radius safe zone = 204px radius)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="maskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
  </defs>
  <!-- Full bleed background (no rounded corners so Android can mask to circle, squircle, or teardrop) -->
  <rect width="512" height="512" fill="url(#maskGrad)"/>
  <!-- Shopping bag scaled to fit strictly within the 400px safe zone (center at 256, 256) -->
  <g transform="translate(64, 64) scale(0.75)">
    <!-- Shopping bag body -->
    <path d="M148 180 L364 180 L346 400 C344 416 332 428 316 428 L196 428 C180 428 168 416 166 400 Z" fill="#ffffff" />
    <!-- Shopping bag handle -->
    <path d="M196 180 C196 112 316 112 316 180" fill="none" stroke="#ffffff" stroke-width="32" stroke-linecap="round"/>
    <!-- Bag accent bolt -->
    <path d="M266 226 L230 300 L260 300 L246 366 L286 286 L254 286 Z" fill="#2563eb"/>
  </g>
</svg>
`;

// Monochrome badge SVG (72x72 for push notifications)
const badgeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <path d="M20 26 L52 26 L49 60 C49 62 47 64 45 64 L27 64 C25 64 23 62 23 60 Z" fill="#ffffff"/>
  <path d="M27 26 C27 16 45 16 45 26" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
</svg>
`;

async function generate() {
  console.log('Generating PWA icons with sharp...');
  
  // 1. icon-512.png (purpose: any)
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png({ quality: 100, palette: false, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('✓ Created icon-512.png');

  // 2. icon-192.png (purpose: any)
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png({ quality: 100, palette: false, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('✓ Created icon-192.png');

  // 3. icon-512-maskable.png (purpose: maskable)
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 100, palette: false, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-512-maskable.png'));
  console.log('✓ Created icon-512-maskable.png');

  // 4. icon-192-maskable.png (purpose: maskable)
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png({ quality: 100, palette: false, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-192-maskable.png'));
  console.log('✓ Created icon-192-maskable.png');

  // 5. icon-180.png (Apple touch icon)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png({ quality: 100, palette: false, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'icon-180.png'));
  console.log('✓ Created icon-180.png');

  // 6. badge-72.png (push notification badge)
  await sharp(Buffer.from(badgeSvg))
    .resize(72, 72)
    .png({ quality: 100, palette: false, compressionLevel: 9 })
    .toFile(path.join(iconsDir, 'badge-72.png'));
  console.log('✓ Created badge-72.png');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
