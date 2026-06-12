const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials", { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWallets() {
  const { data, error } = await supabase.from('platform_wallets').select('*');
  if (error) {
    console.error('Error fetching platform_wallets:', error);
  } else {
    console.log('platform_wallets count:', data.length);
    console.dir(data, { depth: null });
  }
}

checkWallets();
