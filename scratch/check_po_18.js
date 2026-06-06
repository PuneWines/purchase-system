import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('po_number', '2026/PO-18')
    .single();

  if (error) {
    console.error('Error fetching PO 18:', error);
    return;
  }

  console.log('PO 18:', JSON.stringify(po, null, 2));
}

run();
