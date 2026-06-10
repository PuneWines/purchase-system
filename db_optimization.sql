-- ====================================================================
-- DATABASE PERFORMANCE OPTIMIZATION INDEXES
-- ====================================================================

-- 1. Indexes for approved_indent_items
-- Optimizes queries filtering by po_status ('pending', 'ordered', 'excluded')
CREATE INDEX IF NOT EXISTS idx_approved_indent_items_po_status 
ON public.approved_indent_items(po_status);

-- Optimizes joins with the indents table
CREATE INDEX IF NOT EXISTS idx_approved_indent_items_indent_id 
ON public.approved_indent_items(indent_id);

-- Optimizes filtering by unique_indent_id / batching checks
CREATE INDEX IF NOT EXISTS idx_approved_indent_items_unique_indent_id 
ON public.approved_indent_items(unique_indent_id);

-- Optimizes filtering by vendor/party name
CREATE INDEX IF NOT EXISTS idx_approved_indent_items_party_name 
ON public.approved_indent_items(party_name);


-- 2. Indexes for indent_items
-- Optimizes queries filtering for pending approval items
CREATE INDEX IF NOT EXISTS idx_indent_items_approval_status 
ON public.indent_items(approval_status);

-- Optimizes joins with indents
CREATE INDEX IF NOT EXISTS idx_indent_items_indent_id 
ON public.indent_items(indent_id);

-- Optimizes matching unique_indent_id
CREATE INDEX IF NOT EXISTS idx_indent_items_unique_indent_id 
ON public.indent_items(unique_indent_id);


-- 3. Indexes for purchase_orders
-- Optimizes joins and duplicate checks on indent_id
CREATE INDEX IF NOT EXISTS idx_purchase_orders_indent_id 
ON public.purchase_orders(indent_id);

-- Optimizes queries filtering by vendor_name
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_name 
ON public.purchase_orders(vendor_name);

-- Optimizes history/sorting queries ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at 
ON public.purchase_orders(created_at DESC);


-- 4. Indexes for indents
-- Optimizes filtering/sorting indents by shop_name
CREATE INDEX IF NOT EXISTS idx_indents_shop_name 
ON public.indents(shop_name);

-- Optimizes sorting by created_at DESC
CREATE INDEX IF NOT EXISTS idx_indents_created_at 
ON public.indents(created_at DESC);
