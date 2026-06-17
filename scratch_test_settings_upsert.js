// Diagnostic: test the exact upsert the PATCH route performs
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://eslajmbvrqbkmsolffqi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Check what columns actually exist on app_settings
  console.log("\n=== Step 1: Inspect app_settings columns via a SELECT ===");
  const { data: rows, error: selErr } = await supabase
    .from("app_settings")
    .select("*")
    .limit(5);

  if (selErr) {
    console.error("SELECT error:", selErr);
  } else {
    console.log("Sample rows (up to 5):", JSON.stringify(rows, null, 2));
    if (rows && rows.length > 0) {
      console.log("Columns present:", Object.keys(rows[0]));
    } else {
      console.log("Table is empty — will attempt a test insert.");
    }
  }

  // 2. Try exact upsert the PATCH route sends
  console.log("\n=== Step 2: Test upsert with { key, value, updated_by, updated_at } ===");
  const testKey = "__diagnostic_test__";
  const { data: upData, error: upErr } = await supabase
    .from("app_settings")
    .upsert(
      {
        key: testKey,
        value: "test_value",
        updated_by: "System Admin",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (upErr) {
    console.error("UPSERT error (this is the 500 root cause):", JSON.stringify(upErr, null, 2));
  } else {
    console.log("UPSERT succeeded:", upData);
    // Clean up test row
    const { error: delErr } = await supabase
      .from("app_settings")
      .delete()
      .eq("key", testKey);
    if (delErr) console.error("Cleanup error:", delErr);
    else console.log("Test row cleaned up.");
  }

  // 3. Also check if 'id' column is required (not nullable, no default)
  console.log("\n=== Step 3: Try upsert WITHOUT updated_by / updated_at ===");
  const { data: minData, error: minErr } = await supabase
    .from("app_settings")
    .upsert({ key: "__diag2__", value: "v" }, { onConflict: "key" });

  if (minErr) {
    console.error("Minimal upsert error:", JSON.stringify(minErr, null, 2));
  } else {
    console.log("Minimal upsert succeeded:", minData);
    await supabase.from("app_settings").delete().eq("key", "__diag2__");
  }
}

main().catch(console.error);
