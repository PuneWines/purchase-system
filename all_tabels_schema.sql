-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  gstin text NOT NULL,
  contact text NOT NULL,
  email text NOT NULL,
  terms ARRAY NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT company_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.indent_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  indent_id uuid NOT NULL,
  party_indent_id text,
  item_name text NOT NULL,
  fix_per_day_avg_sale numeric,
  qty_out numeric,
  closing_qty numeric,
  brand_name text,
  bcs numeric,
  mls text,
  liquor_type text,
  party_name text,
  last_month_sale_box numeric,
  per_day_sale_last_month numeric,
  final_avg_sale numeric,
  threshold_sale numeric,
  closing_qty_box numeric,
  order_box numeric,
  order_qty numeric,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  approval_status text DEFAULT 'pending'::text,
  unique_indent_id text,
  is_excluded boolean NOT NULL DEFAULT false,
  exclusion_reason text,
  CONSTRAINT indent_items_pkey PRIMARY KEY (id),
  CONSTRAINT indent_items_indent_id_fkey FOREIGN KEY (indent_id) REFERENCES public.indents(id)
);
CREATE TABLE public.indents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shop_name text NOT NULL,
  status text DEFAULT 'Pending'::text CHECK (status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text])),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  indent_number text,
  CONSTRAINT indents_pkey PRIMARY KEY (id),
  CONSTRAINT indents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.masterItem (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shop_id text NOT NULL CHECK (shop_id = ANY (ARRAY['friends'::text, 'vishal'::text, 'kunal'::text, 'madhura'::text, 'balaji'::text])),
  item_name text NOT NULL,
  avg_sale numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT masterItem_pkey PRIMARY KEY (id)
);
CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  vendor_name text NOT NULL,
  vendor_id text NOT NULL,
  trader_pdf_url text,
  receiver_pdf_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  indent_id text,
  first_brand_name text,
  total_order_qty numeric,
  total_order_box numeric,
  trader_status text,
  dispatch_date text,
  remarks text,
  transporter_number text,
  receiver_number text,
  transporter_status text,
  pickup_date text,
  delivery_date text,
  transporter_remarks text,
  receiver_status text,
  receiver_remarks text,
  received_items jsonb,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.receivers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_number text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT receivers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.transporters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_number text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT transporters_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'user'::text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vendors (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  party_name text NOT NULL,
  address text,
  gstin text,
  contact_name text,
  contact text,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT vendors_pkey PRIMARY KEY (id)
);