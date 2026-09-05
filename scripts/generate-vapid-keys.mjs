// scripts/generate-vapid-keys.mjs
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const keys = webpush.generateVAPIDKeys();

let existing = '';
try { existing = fs.readFileSync(envPath, 'utf8'); } catch {}
const cleaned = existing.split('\n')
  .filter(l => !l.startsWith('NEXT_PUBLIC_VAPID_PUBLIC_KEY=') && !l.startsWith('VAPID_PRIVATE_KEY=') && !l.startsWith('VAPID_SUBJECT='))
  .join('\n');

const append = `\n\n# Web Push VAPID (auto-generated)\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=mailto:admin@shopbd.com\n`;
fs.writeFileSync(envPath, cleaned.trimEnd() + append);
console.log('VAPID keys written to .env.local');
console.log('Public Key:', keys.publicKey);
