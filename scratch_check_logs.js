const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data: logs, error: logsErr } = await supabase.from('security_logs').select('*').limit(1);
  if (logsErr) console.log("No security_logs table");
  else console.log("security_logs table exists");
  
  const { data: audit, error: auditErr } = await supabase.from('audit_logs').select('*').limit(1);
  if (auditErr) console.log("No audit_logs table");
  else console.log("audit_logs table exists");
}
checkTables();
