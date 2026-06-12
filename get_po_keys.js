import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('purchase_orders').select('*').limit(2);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample rows:', JSON.stringify(data, null, 2));
  }
}

check();
