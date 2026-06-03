import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRecords() {
  console.log('Fetching all purchase orders...');
  const { data: pos, error: posError } = await supabase
    .from('purchase_orders')
    .select('id, po_number, indent_id, vendor_name, total_order_qty, total_order_box');

  if (posError) {
    console.error('Error fetching POs:', posError);
    return;
  }

  console.log(`Found ${pos.length} purchase orders. Processing...`);

  for (const po of pos) {
    if (!po.indent_id || !po.vendor_name) {
      console.log(`Skipping PO ${po.po_number || po.id} due to missing indent_id or vendor_name`);
      continue;
    }

    // Fetch matching approved items for this PO
    const { data: items, error: itemsError } = await supabase
      .from('indent_items')
      .select('id, order_qty, order_box, party_name')
      .eq('unique_indent_id', po.indent_id)
      .eq('approval_status', 'approved')
      .eq('is_excluded', false);

    if (itemsError) {
      console.error(`Error fetching items for PO ${po.po_number}:`, itemsError);
      continue;
    }

    // Filter items by vendor name (case-insensitive)
    const filteredItems = (items || []).filter(
      item => item.party_name?.trim().toLowerCase() === po.vendor_name?.trim().toLowerCase()
    );

    if (filteredItems.length === 0) {
      console.log(`No items found for PO ${po.po_number} / Vendor: ${po.vendor_name}`);
      continue;
    }

    let calculatedQty = 0;
    let calculatedBox = 0;

    filteredItems.forEach(item => {
      const orderBox = item.order_box !== null ? parseFloat(item.order_box) : 0;
      const orderQty = item.order_qty !== null ? parseFloat(item.order_qty) : 0;
      const qtyType = orderBox >= 0.90 ? "Box" : "Bottles";

      if (qtyType === "Box") {
        calculatedBox += Math.round(orderBox);
      } else {
        calculatedQty += Math.ceil(orderQty);
      }
    });

    const currentQty = po.total_order_qty === null ? null : parseFloat(po.total_order_qty);
    const currentBox = po.total_order_box === null ? null : parseFloat(po.total_order_box);

    if (currentQty !== calculatedQty || currentBox !== calculatedBox) {
      console.log(`PO ${po.po_number}: Updating totals. Old: Qty=${po.total_order_qty}, Box=${po.total_order_box} -> New: Qty=${calculatedQty}, Box=${calculatedBox}`);
      
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          total_order_qty: calculatedQty,
          total_order_box: calculatedBox
        })
        .eq('id', po.id);

      if (updateError) {
        console.error(`Failed to update PO ${po.po_number}:`, updateError);
      } else {
        console.log(`Successfully updated PO ${po.po_number}`);
      }
    } else {
      console.log(`PO ${po.po_number} is already correct (Qty=${calculatedQty}, Box=${calculatedBox}).`);
    }
  }

  console.log('Migration completed!');
}

fixRecords();
