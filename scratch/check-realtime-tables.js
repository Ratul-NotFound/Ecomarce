// scratch/check-realtime-tables.js
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

async function checkRealtime() {
  const db = createClient(supabaseUrl, serviceKey);
  // Query publication tables via RPC or direct query
  const { data, error } = await db.rpc('get_realtime_tables').catch(() => ({ data: null, error: true }));
  console.log('Testing Realtime publication:');
  
  // Let's test listening to orders table
  console.log('- Checking if orders has RLS policy for select...');
  const { data: ordersData, error: ordersErr } = await db.from('orders').select('id, status, user_id').limit(1);
  if (ordersErr) console.error('  Error reading orders:', ordersErr);
  else console.log('  Orders table readable, found:', ordersData?.length);
}

checkRealtime();
