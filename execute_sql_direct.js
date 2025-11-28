const https = require('https');
const fs = require('fs');

// Read environment variables
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Applying create_employee_coupon fix...\n');

// Execute SQL using PostgREST
async function executeSQL() {
  const sql = fs.readFileSync('fix_employee_coupon_direct.sql', 'utf8');

  // Split into statements and execute
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n${i + 1}. Executing: ${statement.substring(0, 50)}...`);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.pgrst.object+json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          query: statement
        })
      });

      const text = await response.text();

      if (response.ok) {
        console.log('✅ Success');
        if (text) console.log(`   Result: ${text.substring(0, 100)}...`);
      } else {
        console.log(`⚠️  Status: ${response.status}`);
        console.log(`   Response: ${text}`);
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }
  }

  console.log('\n✅ SQL execution complete!');
  console.log('\n📋 To verify the fix worked:');
  console.log('   Go to: https://app.supabase.com/project/nomiiqzxaxyxnxndvkbe/sql');
  console.log('   Run: SELECT proname, proconfig FROM pg_proc WHERE proname = \'create_employee_coupon\';');
  console.log('   You should see search_path in the config array');
}

// Alternative approach - Direct function creation via RPC
async function createViaRPC() {
  console.log('\n🔄 Trying alternative approach via RPC...\n');

  // Try using a direct function call
  const functionBody = `
    CREATE OR REPLACE FUNCTION public.create_employee_coupon(emp_id UUID)
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_catalog
    AS $func$
    DECLARE
        coupon_code TEXT;
    BEGIN
        coupon_code := 'EMP' || UPPER(substring(md5(emp_id || extract(epoch from now())), 1, 8));

        INSERT INTO public.employee_coupons (
            employee_id,
            code,
            discount_percent,
            is_active
        ) VALUES (
            emp_id,
            coupon_code,
            20,
            true
        );

        RETURN coupon_code;
    END;
    $func$;
  `;

  try {
    // First try to create it directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: functionBody })
    });

    if (response.ok) {
      console.log('✅ Function created via RPC!');
    } else {
      console.log('⚠️  RPC method failed, please apply manually');
    }
  } catch (err) {
    console.log('⚠️  Alternative method failed');
  }
}

// Try both approaches
executeSQL()
  .then(() => createViaRPC())
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('📋 INSTRUCTIONS FOR MANUAL APPLICATION:');
    console.log('='.repeat(60));
    console.log('\nIf the automatic fixes didn\'t work, please:');
    console.log('\n1. Open: https://app.supabase.com/project/nomiiqzxaxyxnxndvkbe/sql');
    console.log('2. Copy the SQL from fix_employee_coupon_direct.sql');
    console.log('3. Paste and execute\n');
    console.log('4. For password protection:');
    console.log('   Go to: https://app.supabase.com/project/nomiiqzxaxyxnxndvkbe/auth/security');
    console.log('   Enable "Enable breached password detection"');
  });