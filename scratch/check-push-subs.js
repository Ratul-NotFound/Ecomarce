// scratch/check-push-subs.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, serviceKey;
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(l => {
    if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = l.split('=')[1].trim();
    if (l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = l.split('=')[1].trim();
  });
}

async function checkSubs() {
  const db = createClient(supabaseUrl, serviceKey);
  const { data, error } = await db.from('push_subscriptions').select('*');
  console.log('=== PUSH SUBSCRIPTIONS IN DATABASE ===');
  if (error) {
    console.error('Error fetching subscriptions:', error);
  } else {
    console.log(`Total active subscriptions: ${data.length}`);
    data.forEach(s => {
      console.log(`- ID: ${s.id}, User ID: ${s.user_id}, Created: ${s.created_at}, User Agent: ${s.user_agent?.slice(0, 50)}...`);
    });
  }
}

checkSubs();
