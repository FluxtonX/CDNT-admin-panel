const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data: wData } = await supabase.from('withdrawal_requests').select('*').limit(1);
  if (wData && wData.length) console.log('withdrawal_requests columns:', Object.keys(wData[0]));
  
  const { data: dData } = await supabase.from('deposit_requests').select('*').limit(1);
  if (dData && dData.length) console.log('deposit_requests columns:', Object.keys(dData[0]));
}

checkColumns();
