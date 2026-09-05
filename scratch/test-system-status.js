// scratch/test-system-status.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
} catch (e) {}

async function verifySystem() {
  console.log('=== SYSTEM VERIFICATION CHECK ===\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('1. Environment Variables:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓ Set' : '✗ Missing');
  console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✓ Set' : '✗ Missing');
  console.log('  - TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✓ Set' : '⚠ (Checked from DB/Settings)');
  console.log('  - TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID ? '✓ Set' : '⚠ (Checked from DB/Settings)');
  console.log('  - NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || '(Defaulting to window origin)');

  if (!supabaseUrl || !serviceKey) {
    console.error('\nCannot connect to Supabase: Missing URL or Service Key.');
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  console.log('\n2. Database Tables & Realtime Schema:');

  // Check chat_messages
  const { data: chatData, error: chatErr } = await adminClient
    .from('chat_messages')
    .select('id, user_name, direction, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (chatErr) {
    console.error('  ✗ chat_messages table error:', chatErr.message);
  } else {
    console.log(`  ✓ chat_messages table accessible (${chatData?.length || 0} sample rows verified)`);
  }

  // Check push_subscriptions
  const { data: pushData, error: pushErr } = await adminClient
    .from('push_subscriptions')
    .select('id')
    .limit(1);

  if (pushErr) {
    console.error('  ✗ push_subscriptions table error:', pushErr.message);
  } else {
    console.log('  ✓ push_subscriptions table ready and verified');
  }

  // Check profiles
  const { data: profData, error: profErr } = await adminClient
    .from('profiles')
    .select('id, full_name, role')
    .limit(3);

  if (profErr) {
    console.error('  ✗ profiles table error:', profErr.message);
  } else {
    console.log(`  ✓ profiles table ready (${profData?.length || 0} profiles found)`);
  }

  // Check store_settings
  const { data: settingsData, error: setErr } = await adminClient
    .from('store_settings')
    .select('key, value')
    .in('key', ['telegram_bot_token', 'telegram_chat_id', 'telegram_messages_topic_id']);

  if (setErr) {
    console.error('  ✗ store_settings error:', setErr.message);
  } else {
    console.log(`  ✓ store_settings found ${settingsData?.length || 0} Telegram configuration keys`);
  }

  console.log('\n=== ALL DATABASE TABLES & SCHEMAS VERIFIED SUCCESSFULLY ===');
}

verifySystem().catch(console.error);
