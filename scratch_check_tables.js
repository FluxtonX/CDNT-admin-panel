const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://eslajmbvrqbkmsolffqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  for (const table of ['roles', 'admin_users', 'admin_invites']) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table ${table} check failed/does not exist:`, error.message);
      } else {
        console.log(`Table ${table} exists. Row count:`, data.length);
      }
    } catch (e) {
      console.log(`Table ${table} error:`, e.message);
    }
  }
}

check();
