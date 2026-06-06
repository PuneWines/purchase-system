import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: recv, error: recvError } = await supabase
    .from('receivers')
    .select('*')
    .eq('contact_number', '8208692893')
    .single();

  if (recvError) {
    console.error('recvError:', recvError);
    return;
  }
  console.log('Receiver:', recv);

  const { data: pos, error: posError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('receiver_number', recv.contact_number);

  if (posError) {
    console.error('posError:', posError);
    return;
  }

  console.log(`Found ${pos.length} POs.`);
  pos.forEach(po => {
    console.log(`PO: ${po.po_number}`);
    console.log(`po_items type: ${typeof po.po_items}`);
    console.log(`po_items Array.isArray: ${Array.isArray(po.po_items)}`);
    console.log(`po_items value:`, po.po_items ? JSON.stringify(po.po_items).substring(0, 100) + '...' : null);
  });
}

run();
