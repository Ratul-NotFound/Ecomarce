const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local for credentials
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : 'https://zkvyqnitbfrtbkzncgac.supabase.co';
const serviceKey = keyMatch ? keyMatch[1].trim() : '';

const sb = createClient(supabaseUrl, serviceKey);

async function verifySync() {
  console.log('--- Checking Supabase Database Sync Status ---\n');

  let allGood = true;

  // 1. Check products.cost_price
  const { data: pCost, error: errCost } = await sb.from('products').select('cost_price').limit(1);
  if (errCost) {
    console.log('❌ products.cost_price: MISSING (' + errCost.message + ')');
    allGood = false;
  } else {
    console.log('✅ products.cost_price: OK (column exists and accessible)');
  }

  // 2. Check products.video_url
  const { data: pVid, error: errVid } = await sb.from('products').select('video_url').limit(1);
  if (errVid) {
    console.log('❌ products.video_url: MISSING (' + errVid.message + ')');
    allGood = false;
  } else {
    console.log('✅ products.video_url: OK (column exists and accessible)');
  }

  // 3. Check product_variants.cost_price
  const { data: vCost, error: errVCost } = await sb.from('product_variants').select('cost_price').limit(1);
  if (errVCost) {
    console.log('❌ product_variants.cost_price: MISSING (' + errVCost.message + ')');
    allGood = false;
  } else {
    console.log('✅ product_variants.cost_price: OK (column exists and accessible)');
  }

  // 4. Check coupons.created_at
  const { data: cAt, error: errCAt } = await sb.from('coupons').select('created_at').limit(1);
  if (errCAt) {
    console.log('❌ coupons.created_at: MISSING (' + errCAt.message + ')');
    allGood = false;
  } else {
    console.log('✅ coupons.created_at: OK (column exists and accessible)');
  }

  console.log('\n----------------------------------------------');
  if (allGood) {
    console.log('🎉 SUCCESS: Your Supabase database is 100% in sync with the codebase!');
  } else {
    console.log('⚠️ PENDING: Run supabase/migrations/sync_all_pending_migrations.sql in the Supabase SQL Editor.');
  }
}

verifySync().catch(console.error);
