const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://eslajmbvrqbkmsolffqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function safeFetch(table, query) {
  const { data, error } = await supabaseAdmin.from(table).select("*").match(query);
  if (error) {
    console.log(`Error for ${table}:`, error.message);
    return [];
  }
  return data || [];
}

async function run() {
  const userId = "1e430be7-6b4b-451e-be52-b002227a17c4";
  console.log(`Fetching support_threads for user_id: ${userId}`);
  
  const threads = await safeFetch("support_threads", { user_id: userId });
  console.log("Raw query result for support_threads:");
  console.log(JSON.stringify(threads, null, 2));

  // Also simulate enrichedThreads
  const enrichedThreads = await Promise.all(
    (threads || []).map(async (t) => {
      const { data: msgs, error } = await supabaseAdmin
        .from("support_messages")
        .select("text")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) {
         console.log(`Error fetching msgs for thread ${t.id}:`, error.message);
      }
      return { ...t, last_message_preview: msgs && msgs.length > 0 ? msgs[0].text : "No messages" };
    })
  );

  console.log("Enriched Threads:");
  console.log(JSON.stringify(enrichedThreads, null, 2));
}
run();
