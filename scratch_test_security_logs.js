// Diagnostic: test the security_logs insert the PATCH route performs
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://eslajmbvrqbkmsolffqi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Inspect security_logs columns
  console.log("\n=== Step 1: Inspect security_logs columns ===");
  const { data: rows, error: selErr } = await supabase
    .from("security_logs")
    .select("*")
    .limit(1);

  if (selErr) {
    console.error("SELECT error:", JSON.stringify(selErr, null, 2));
  } else {
    console.log("Columns present:", rows && rows.length > 0 ? Object.keys(rows[0]) : "(table empty)");
    if (rows && rows.length > 0) console.log("Sample row:", JSON.stringify(rows[0], null, 2));
  }

  // 2. Try the exact insert the PATCH route sends
  console.log("\n=== Step 2: Test exact security_logs insert from PATCH route ===");
  const { data: insData, error: insErr } = await supabase
    .from("security_logs")
    .insert({
      action: "Settings Updated",
      category: "System",
      severity: "Info",
      user_name: "System Admin",
      user_id: null,
      ip_address: "127.0.0.1",
      details: "Updated setting 'testKey' from 'null' to 'testValue'",
      user_agent: "System Admin Panel",
      performed_by_admin: true,
    });

  if (insErr) {
    console.error("\n*** SECURITY_LOGS INSERT ERROR (this is likely the 500 root cause) ***");
    console.error(JSON.stringify(insErr, null, 2));
  } else {
    console.log("security_logs insert succeeded:", insData);
  }

  // 3. Check if a simpler insert works (omit optional fields)
  console.log("\n=== Step 3: Minimal insert (action only) ===");
  const { data: minData, error: minErr } = await supabase
    .from("security_logs")
    .insert({ action: "Test", category: "System", severity: "Info" });

  if (minErr) {
    console.error("Minimal insert error:", JSON.stringify(minErr, null, 2));
  } else {
    console.log("Minimal insert succeeded:", minData);
  }
}

main().catch(console.error);
