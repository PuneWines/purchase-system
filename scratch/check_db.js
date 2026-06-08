import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Checking database ---');
  
  // 1. Fetch count of purchase orders
  const { data: pos, error: posErr } = await supabase
    .from('purchase_orders')
    .select('id, po_number, indent_id, vendor_name, receiver_status, po_type, po_items, received_items');
    
  if (posErr) {
    console.error('Error fetching POs:', posErr);
  } else {
    console.log(`Total POs: ${pos.length}`);
    pos.forEach(po => {
      console.log(`PO: ${po.po_number}, ID: ${po.id}, IndentId: ${po.indent_id}, Vendor: ${po.vendor_name}, Type: ${po.po_type}, Status: ${po.receiver_status}`);
      console.log(`  po_items is array: ${Array.isArray(po.po_items)}, length: ${po.po_items ? po.po_items.length : 0}`);
      console.log(`  received_items:`, JSON.stringify(po.received_items));
    });
  }

  // 2. Fetch approved_indent_items
  const { data: items, error: itemsErr } = await supabase
    .from('approved_indent_items')
    .select('id, unique_indent_id, party_name, po_id, po_status');
    
  if (itemsErr) {
    console.error('Error fetching approved items:', itemsErr);
  } else {
    console.log(`Total Approved Indent Items: ${items.length}`);
    items.forEach(item => {
      console.log(`Item: ${item.id}, UniqueIndentId: ${item.unique_indent_id}, Vendor: ${item.party_name}, po_id: ${item.po_id}, status: ${item.po_status}`);
    });
  }
}

check();
