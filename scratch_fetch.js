const url = "https://eslajmbvrqbkmsolffqi.supabase.co/rest/v1/platform_wallets?select=*";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGFqbWJ2cnFia21zb2xmZnFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM2OTYwMCwiZXhwIjoyMDk1OTQ1NjAwfQ.S50IUQvwMH9gZa3LM2NCFOjaG9_eU0gK26oteNpKBps";

async function fetchWallets() {
  const res = await fetch(url, {
    headers: {
      "apikey": key,
      "Authorization": "Bearer " + key,
      "Content-Type": "application/json"
    }
  });
  
  if (!res.ok) {
    console.error("Error:", await res.text());
  } else {
    const data = await res.json();
    console.log("Count:", data.length);
    console.log(data);
  }
}

fetchWallets();
