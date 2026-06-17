const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://eslajmbvrqbkmsolffqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const adminName = "System Admin";

  const res1 = await supabase
    .from("app_settings")
    .upsert(
      { key: "platformName", value: "Test Name", updated_by: adminName, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  
  if (res1.error) console.error("Upsert error:", res1.error);
  else console.log("Upsert ok");

  const res2 = await supabase.from("security_logs").insert({
    user_id: "SYSTEM",
    action: "Settings Updated",
    ip_address: "127.0.0.1",
    details: `Updated setting`,
    status: "success",
    risk_level: "low",
  });

  if (res2.error) console.error("Log error:", res2.error);
  else console.log("Log ok");
}
run();
