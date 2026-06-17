const urlW = "https://eslajmbvrqbkmsolffqi.supabase.co/rest/v1/withdrawal_requests?select=*&limit=1";
const urlD = "https://eslajmbvrqbkmsolffqi.supabase.co/rest/v1/deposit_requests?select=*&limit=1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps";

async function fetchSchema() {
  const headers = {
    "apikey": key,
    "Authorization": "Bearer " + key,
    "Content-Type": "application/json"
  };

  const resW = await fetch(urlW, { headers });
  if (resW.ok) {
    const data = await resW.json();
    console.log("withdrawal_requests:", data.length ? Object.keys(data[0]) : "empty");
  }

  const resD = await fetch(urlD, { headers });
  if (resD.ok) {
    const data = await resD.json();
    console.log("deposit_requests:", data.length ? Object.keys(data[0]) : "empty");
  }
}

fetchSchema();
