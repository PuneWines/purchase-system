-- ====================================================================
-- 1. SCHEMA CHANGES: Create approved_indent_items table and policies
-- ====================================================================

-- Create approved_indent_items table
CREATE TABLE IF NOT EXISTS public.approved_indent_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_item_id uuid, -- Reference to the original indent_items.id for trace/rollback
  indent_id uuid NOT NULL,
  party_indent_id text,
  item_name text NOT NULL,
  brand_name text,
  bcs numeric,
  mls text,
  liquor_type text,
  party_name text,
  qty_out numeric,
  closing_qty numeric,
  last_month_sale_box numeric,
  per_day_sale_last_month numeric,
  threshold_sale numeric,
  closing_qty_box numeric,
  order_box numeric, -- Approved boxes (potentially rounded/edited)
  order_qty numeric, -- Approved qty (potentially rounded/edited)
  unique_indent_id text,
  
  -- PO Tracking columns
  po_id uuid, -- Links to the generated purchase order
  po_status text NOT NULL DEFAULT 'pending'::text, -- 'pending', 'ordered', 'excluded'
  exclusion_reason text, -- E.g., 'removed_from_po'
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  approved_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT approved_indent_items_pkey PRIMARY KEY (id),
  CONSTRAINT approved_indent_items_indent_id_fkey FOREIGN KEY (indent_id) REFERENCES public.indents(id) ON DELETE CASCADE,
  CONSTRAINT approved_indent_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.approved_indent_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid duplicates)
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.approved_indent_items;
DROP POLICY IF EXISTS "Allow all modifications for authenticated users" ON public.approved_indent_items;
DROP POLICY IF EXISTS "Allow public read access" ON public.approved_indent_items;

-- RLS Policies
CREATE POLICY "Allow read for authenticated users" ON public.approved_indent_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all modifications for authenticated users" ON public.approved_indent_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
  
CREATE POLICY "Allow public read access" ON public.approved_indent_items
  FOR SELECT TO anon USING (true);


-- ====================================================================
-- 2. DATA MIGRATION: Move existing approved items and link to POs
-- ====================================================================

-- Move existing approved items from indent_items to approved_indent_items
INSERT INTO public.approved_indent_items (
  original_item_id,
  indent_id,
  party_indent_id,
  item_name,
  brand_name,
  bcs,
  mls,
  liquor_type,
  party_name,
  qty_out,
  closing_qty,
  last_month_sale_box,
  per_day_sale_last_month,
  threshold_sale,
  closing_qty_box,
  order_box,
  order_qty,
  unique_indent_id,
  created_at,
  approved_at
)
SELECT 
  id AS original_item_id,
  indent_id,
  party_indent_id,
  item_name,
  brand_name,
  bcs,
  mls,
  liquor_type,
  party_name,
  qty_out,
  closing_qty,
  last_month_sale_box,
  per_day_sale_last_month,
  threshold_sale,
  closing_qty_box,
  order_box,
  order_qty,
  unique_indent_id,
  created_at,
  created_at AS approved_at
FROM public.indent_items
WHERE approval_status = 'approved' AND is_excluded = false;

-- Link migrated items to existing purchase orders matching unique_indent_id and vendor name
UPDATE public.approved_indent_items ai
SET 
  po_id = po.id,
  po_status = 'ordered'
FROM public.purchase_orders po
WHERE ai.unique_indent_id = po.indent_id 
  AND TRIM(LOWER(ai.party_name)) = TRIM(LOWER(po.vendor_name));

-- Delete migrated approved items from indent_items
DELETE FROM public.indent_items
WHERE approval_status = 'approved' AND is_excluded = false;

-- Delete excluded/rejected items for already-approved/ordered batches (clean up)
DELETE FROM public.indent_items ii
USING public.purchase_orders po
WHERE ii.unique_indent_id = po.indent_id;
