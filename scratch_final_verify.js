// Final end-to-end test: simulate exactly what the PATCH route now does
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://eslajmbvrqbkmsolffqi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const adminName = "System Admin";
  const testKey = "__final_diag__";
  const newValue = "test_value";
  const oldValue = "null";

  const results = await Promise.all([
    supabase.from("app_settings").upsert(
      { key: testKey, value: newValue, updated_by: adminName, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    ),
    supabase.from("security_logs").insert({
      action: "Settings Updated",
      category: "System",
      severity: "Info",
      user_name: adminName,
      user_id: "SYSTEM",          // <-- the fix
      ip_address: "127.0.0.1",
      details: `Updated setting '${testKey}' from '${oldValue}' to '${newValue}'`,
      user_agent: "System Admin Panel",
      performed_by_admin: true,
    }),
  ]);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error("STILL FAILING:", errors.map(e => e.error));
  } else {
    console.log("✅ Both upsert + security_logs insert succeeded. 500 is fixed.");
  }

  // Cleanup
  await supabase.from("app_settings").delete().eq("key", testKey);
}

main().catch(console.error);
