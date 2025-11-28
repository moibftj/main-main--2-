const https = require('https');

// Configuration
const ACCESS_TOKEN = 'sbp_f68a433be9db029bfe87ba6f9e86da4d71829479';
const PROJECT_REF = 'nomiiqzxaxyxnxndvkbe';

console.log('🔧 Fixing ALL remaining SECURITY DEFINER functions...\n');

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

// List of ALL remaining functions to fix
const allRemainingFunctions = [
  {
    name: 'detect_suspicious_activity',
    sql: `CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(user_id UUID, action_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
    action_count INTEGER;
    time_window INTERVAL := '1 hour';
BEGIN
    -- Count actions in the last hour
    SELECT COUNT(*) INTO action_count
    FROM public.letter_audit_trail
    WHERE performed_by = user_id
    AND created_at > NOW() - time_window
    AND action = action_type;

    -- Flag as suspicious if more than 20 actions per hour
    RETURN action_count > 20;
END;
$function$;`
  },
  {
    name: 'get_commission_summary',
    sql: `CREATE OR REPLACE FUNCTION public.get_commission_summary(emp_id UUID)
RETURNS TABLE(total_earned NUMERIC, pending_amount NUMERIC, paid_amount NUMERIC, commission_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(commission_amount), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount,
        COUNT(*)::INTEGER as commission_count
    FROM public.commissions
    WHERE employee_id = emp_id;
END;
$function$;`
  },
  {
    name: 'reset_monthly_allowances',
    sql: `CREATE OR REPLACE FUNCTION public.reset_monthly_allowances()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
    UPDATE public.subscriptions
    SET remaining_letters = CASE
            WHEN plan_type IN ('standard_4_month', 'monthly_standard') THEN 4
            WHEN plan_type IN ('premium_8_month', 'monthly_premium') THEN 8
            ELSE remaining_letters -- one_time doesn't reset
        END,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE status = 'active'
      AND plan_type IN ('standard_4_month', 'premium_8_month', 'monthly_standard', 'monthly_premium')
      AND DATE_TRUNC('month', last_reset_at) < DATE_TRUNC('month', NOW());
END;
$function$;`
  },
  {
    name: 'log_letter_audit',
    sql: `CREATE OR REPLACE FUNCTION public.log_letter_audit(
    p_letter_id UUID,
    p_action TEXT,
    p_old_status TEXT DEFAULT NULL,
    p_new_status TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
    INSERT INTO public.letter_audit_trail (
        letter_id,
        action,
        performed_by,
        old_status,
        new_status,
        notes,
        metadata
    ) VALUES (
        p_letter_id,
        p_action,
        auth.uid(),
        p_old_status,
        p_new_status,
        p_notes,
        p_metadata
    );
END;
$function$;`
  },
  {
    name: 'log_security_event',
    sql: `CREATE OR REPLACE FUNCTION public.log_security_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        event_type,
        ip_address,
        user_agent,
        details
    ) VALUES (
        p_user_id,
        p_event_type,
        p_ip_address,
        p_user_agent,
        p_details
    );
END;
$function$;`
  },
  {
    name: 'increment_usage',
    sql: `CREATE OR REPLACE FUNCTION public.increment_usage(row_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
    UPDATE public.usage_tracking
    SET usage_count = usage_count + 1,
        last_used = NOW()
    WHERE id = row_id;

    RETURN COALESCE((SELECT usage_count FROM public.usage_tracking WHERE id = row_id), 0);
END;
$function$;`
  },
  {
    name: 'create_employee_coupon',
    sql: `CREATE OR REPLACE FUNCTION public.create_employee_coupon(emp_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
    coupon_code TEXT;
BEGIN
    -- Generate unique coupon code
    coupon_code := 'EMP' || UPPER(substring(md5(emp_id || extract(epoch from now())), 1, 8));

    INSERT INTO public.employee_coupons (
        employee_id,
        code,
        discount_percent,
        is_active
    ) VALUES (
        emp_id,
        coupon_code,
        20, -- 20% discount
        true
    );

    RETURN coupon_code;
END;
$function$;`
  },
  {
    name: 'sanitize_input',
    sql: `CREATE OR REPLACE FUNCTION public.sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
    -- Remove potentially dangerous characters
    RETURN regexp_replace(
        regexp_replace(input_text, E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', '', 'g'),
        E'[<>]', '', 'g'
    );
END;
$function$;`
  }
];

// Apply all fixes
async function fixAllFunctions() {
  let fixedCount = 0;
  let errorCount = 0;

  try {
    console.log(`📝 Found ${allRemainingFunctions.length} functions to fix\n`);

    for (const func of allRemainingFunctions) {
      console.log(`🔧 [${fixedCount + 1}/${allRemainingFunctions.length}] Fixing ${func.name}...`);
      console.log('─'.repeat(60));

      try {
        await executeSQL(func.sql);
        console.log(`✅ ${func.name} fixed successfully!\n`);
        fixedCount++;
      } catch (err) {
        console.error(`❌ Error fixing ${func.name}:`);
        console.error(`   ${err.message}\n`);
        errorCount++;
      }
    }

    // Final verification
    console.log('🔍 Final verification...\n');
    const results = await executeSQL(`
      SELECT
        p.proname as function_name,
        CASE WHEN p.proconfig IS NOT NULL AND p.proconfig::text LIKE '%search_path%'
             THEN 'YES' ELSE 'NO' END as has_search_path,
        p.prosecdef as security_definer
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.prosecdef = true
        AND n.nspname = 'public'
      ORDER BY p.proname;
    `);

    console.log('='.repeat(80));
    console.log('📊 FINAL STATUS OF ALL SECURITY DEFINER FUNCTIONS:');
    console.log('='.repeat(80));

    let totalFixed = 0;
    let totalFunctions = results.length;

    results.forEach(func => {
      const status = func.has_search_path === 'YES' ? '✅' : '❌';
      console.log(`${status} ${func.function_name.padEnd(30)} search_path: ${func.has_search_path}`);
      if (func.has_search_path === 'YES') totalFixed++;
    });

    console.log('='.repeat(80));
    console.log('\n🎉 SUMMARY:');
    console.log(`   Functions fixed in this run: ${fixedCount}`);
    console.log(`   Errors encountered: ${errorCount}`);
    console.log(`   Total SECURTY DEFINER functions: ${totalFunctions}`);
    console.log(`   Functions with secure search_path: ${totalFixed}/${totalFunctions}`);
    console.log(`   Percentage complete: ${Math.round((totalFixed/totalFunctions)*100)}%`);

    if (totalFixed === totalFunctions) {
      console.log('\n🏆 ALL FUNCTIONS ARE NOW SECURE!');
      console.log('   No more lint warnings about mutable search_path! 🎯');
    } else {
      console.log(`\n⚠️  ${totalFunctions - totalFixed} function(s) still need fixing`);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

// Run all fixes
fixAllFunctions();