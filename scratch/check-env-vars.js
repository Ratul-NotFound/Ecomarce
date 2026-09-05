// scratch/check-env-vars.js
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  console.log('=== .env.local Variable Presence Check ===');
  lines.forEach(l => {
    const trimmed = l.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const key = trimmed.split('=')[0].trim();
      const val = trimmed.split('=')[1]?.trim() || '';
      const masked = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : '(set)';
      console.log(`- ${key}: ${key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN') ? '(secret masked)' : val}`);
    }
  });
} else {
  console.log('.env.local does not exist');
}
