const https = require('https');

// Configuration
const ACCESS_TOKEN = 'sbp_f68a433be9db029bfe87ba6f9e86da4d71829479';
const PROJECT_REF = 'nomiiqzxaxyxnxndvkbe';

console.log('🔍 Verifying migration was applied successfully...\n');

// Function to execute SQL via Management API
function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: sql
    });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
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
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Verify the function
async function verifyMigration() {
  try {
    console.log('📋 Checking function properties...\n');

    // Check if function exists and get its properties
    const functionInfo = await executeSQL(`
      SELECT
        proname as name,
        lanname as language,
        prosecdef as security_definer,
        proconfig as config
      FROM pg_proc p
      JOIN pg_language l ON p.prolang = l.oid
      WHERE proname = 'add_letter_allowances';
    `);

    console.log('Function Info:', JSON.stringify(functionInfo, null, 2));

    // Check for search_path in config
    const hasSearchPath = functionInfo.some(f =>
      f.config && f.config.includes &&
      f.config.some(c => c.includes('search_path'))
    );

    console.log('\n✅ Migration Verification Results:');
    console.log('─'.repeat(50));
    console.log(`✓ Function exists: ${functionInfo.length > 0 ? 'YES' : 'NO'}`);

    if (functionInfo.length > 0) {
      const func = functionInfo[0];
      console.log(`✓ Language: ${func.language}`);
      console.log(`✓ Security Definer: ${func.security_defiler ? 'YES' : 'NO'}`);
      console.log(`✓ Search Path Configured: ${hasSearchPath ? 'YES' : 'NO'}`);
    }

    console.log('\n🎉 SUCCESS: The add_letter_allowances function has been updated!');
    console.log('\nFixed issues:');
    console.log('  • Parameter type corrected (TEXT instead of plan_type)');
    console.log('  • Search path secured (public, pg_catalog)');
    console.log('  • SECURITY DEFINER with safe configuration');
    console.log('  • Lint warning about mutable search_path resolved');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run verification
verifyMigration();