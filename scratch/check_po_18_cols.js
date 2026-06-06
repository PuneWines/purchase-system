import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select('po_number, delivered_items, trader_item_statuses, receiver_status, received_items, po_items')
    .eq('po_number', '2026/PO-18')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('PO 18 Details:');
  console.log('delivered_items:', po.delivered_items, 'type:', typeof po.delivered_items);
  console.log('trader_item_statuses:', po.trader_item_statuses, 'type:', typeof po.trader_item_statuses);
  console.log('receiver_status:', po.receiver_status);
  console.log('received_items:', po.received_items);
  console.log('po_items count:', po.po_items ? po.po_items.length : null);
}

run();
