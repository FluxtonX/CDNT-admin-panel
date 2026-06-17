const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data: wData, error: wErr } = await supabase.from('withdrawal_requests').select('*').limit(1);
  if (wData) console.log('withdrawal_requests columns:', Object.keys(wData[0] || {}));
  
  const { data: dData, error: dErr } = await supabase.from('deposit_requests').select('*').limit(1);
  if (dData) console.log('deposit_requests columns:', Object.keys(dData[0] || {}));

  const { data: wlData, error: wlErr } = await supabase.from('wallet_ledger').select('*').limit(1);
  if (wlData) console.log('wallet_ledger columns:', Object.keys(wlData[0] || {}));
}

checkColumns();
