-- SQL Query to restore/populate the `po_items` and `shop_name` columns
-- for existing purchase orders where they are currently null.
--
-- Run this in your Supabase SQL Editor.

UPDATE purchase_orders po
SET 
  shop_name = COALESCE(po.shop_name, sub.shop_name),
  po_items = sub.po_items
FROM (
  SELECT 
    po.id AS po_id,
    MIN(i.shop_name) AS shop_name,
    jsonb_agg(
      jsonb_build_object(
        'id', ii.id,
        'indent_id', ii.indent_id,
        'party_indent_id', ii.party_indent_id,
        'item_name', ii.item_name,
        'itemName', ii.item_name,
        'fix_per_day_avg_sale', ii.fix_per_day_avg_sale,
        'qty_out', ii.qty_out,
        'closing_qty', ii.closing_qty,
        'closingQty', ii.closing_qty,
        'brand_name', ii.brand_name,
        'brandName', ii.brand_name,
        'bcs', ii.bcs,
        'mls', ii.mls,
        'liquor_type', ii.liquor_type,
        'liquorType', ii.liquor_type,
        'party_name', ii.party_name,
        'last_month_sale_box', ii.last_month_sale_box,
        'per_day_sale_last_month', ii.per_day_sale_last_month,
        'final_avg_sale', ii.final_avg_sale,
        'threshold_sale', ii.threshold_sale,
        'closing_qty_box', ii.closing_qty_box,
        'order_box', ii.order_box,
        'orderBox', COALESCE(ii.order_box, 0),
        'order_qty', ii.order_qty,
        'orderQty', COALESCE(ii.order_qty, 0),
        'created_at', ii.created_at,
        'approval_status', ii.approval_status,
        'unique_indent_id', ii.unique_indent_id,
        'is_excluded', ii.is_excluded,
        'exclusion_reason', ii.exclusion_reason,
        'shop_name', i.shop_name,
        'shopName', i.shop_name,
        'qtyType', CASE WHEN COALESCE(ii.order_box, 0) >= 0.90 THEN 'Box' ELSE 'Bottles' END,
        'displayQty', CASE WHEN COALESCE(ii.order_box, 0) >= 0.90 
                           THEN ROUND(COALESCE(ii.order_box, 0))::text 
                           ELSE CEIL(COALESCE(ii.order_qty, 0))::text 
                      END
      )
    ) AS po_items
  FROM purchase_orders po
  JOIN indent_items ii ON ii.unique_indent_id = po.indent_id AND TRIM(LOWER(ii.party_name)) = TRIM(LOWER(po.vendor_name))
  JOIN indents i ON ii.indent_id = i.id
  WHERE ii.approval_status = 'approved'
    AND ii.is_excluded = false
    AND COALESCE(ii.order_qty, 0) > 0
  GROUP BY po.id
) sub
WHERE po.id = sub.po_id AND po.po_items IS NULL;
