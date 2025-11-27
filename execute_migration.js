const https = require('https');
const fs = require('fs');
const querystring = require('querystring');

// Read the environment variables
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

// Function to execute SQL via PostgREST
function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });

    const options = {
      hostname: 'nomiiqzxaxyxnxndvkbe.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Alternative: Use a more direct approach
async function applyMigrationDirectly() {
  console.log('Creating a function to execute our SQL...');

  // First, create a temporary function that will execute our SQL
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION temp_migration_fix()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_catalog
    AS $$
    BEGIN
      DROP FUNCTION IF EXISTS add_letter_allowances(UUID, TEXT);

      CREATE FUNCTION add_letter_allowances(sub_id UUID, plan TEXT)
      RETURNS VOID
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $$
      DECLARE
          letters_to_add INT;
      BEGIN
          IF plan = 'one_time' THEN
              letters_to_add := 1;
          ELSIF plan = 'standard_4_month' THEN
              letters_to_add := 4;
          ELSIF plan = 'premium_8_month' THEN
              letters_to_add := 8;
          ELSE
              RAISE EXCEPTION 'Invalid plan type: %', plan;
          END IF;

          UPDATE public.subscriptions
          SET remaining_letters = letters_to_add,
              last_reset_at = NOW(),
              updated_at = NOW()
          WHERE id = sub_id;
      END;
      $$;
    END;
    $$;
  `;

  try {
    // Use fetch with the RPC endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.pgrst.object+json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: createFunctionSQL
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('Response status:', response.status);
      console.log('Error creating function:', error);

      // Try using cURL as a fallback
      console.log('\nAttempting to execute with cURL...\n');

      const curlCommand = `curl -X POST '${supabaseUrl}/rest/v1/rpc/' \\
        -H "Authorization: Bearer ${serviceKey}" \\
        -H "apikey: ${serviceKey}" \\
        -H "Content-Type: application/json" \\
        -d '{
          "query": "SELECT 1"
        }'`;

      console.log('Test connection command:');
      console.log(curlCommand);

    } else {
      console.log('Function created successfully!');

      // Now execute the function
      const execResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/temp_migration_fix`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json'
        }
      });

      if (execResponse.ok) {
        console.log('✓ Migration applied successfully!');

        // Clean up
        await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: 'DROP FUNCTION IF EXISTS temp_migration_fix();'
          })
        });

        console.log('✓ Temporary function cleaned up');
      } else {
        console.error('Error executing migration:', await execResponse.text());
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Run the migration
applyMigrationDirectly();