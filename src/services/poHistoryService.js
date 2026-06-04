import { supabase } from "../../utils/supabase";

const PAGE_SIZE = 1000;

/**
 * Fetch all purchase orders, paginated, ordered by newest first.
 * Returns the full list for client-side filtering/search.
 */
export const fetchAllPurchaseOrders = async () => {
  let allData = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      page++;
      if (data.length < PAGE_SIZE) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  return allData;
};

/**
 * Fetch a single purchase order by ID.
 */
export const fetchPurchaseOrderById = async (id) => {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};
