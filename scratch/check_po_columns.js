import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: pos, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error(error);
    return;
  }
  
  if (pos && pos.length > 0) {
    console.log('Columns and values for first PO:', pos[0]);
  } else {
    console.log('No POs found');
  }
}

check();
