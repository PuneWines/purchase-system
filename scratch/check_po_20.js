import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('po_number', '2026/PO-20')
    .single();

  if (error) {
    console.error('Error fetching PO 20:', error);
    return;
  }

  console.log('PO 20:', po);

  if (po.indent_id) {
    const { data: items } = await supabase
      .from('indent_items')
      .select('*')
      .eq('unique_indent_id', po.indent_id);
    console.log(`Indent items count for ${po.indent_id}: ${items ? items.length : 0}`);
    console.log('Items:', items);
  }
}

run();
