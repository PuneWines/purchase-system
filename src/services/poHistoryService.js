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
      .order("id", { ascending: true })
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

  // Resolve shop_name for older records
  const missingShopPOs = allData.filter((po) => !po.shop_name && po.indent_id);
  if (missingShopPOs.length > 0) {
    const parentIndentIds = [
      ...new Set(
        missingShopPOs
          .map((po) => {
            const parts = po.indent_id.split("::");
            return parts[0];
          })
          .filter(Boolean)
      ),
    ];

    if (parentIndentIds.length > 0) {
      const { data: indents, error: indentsError } = await supabase
        .from("indents")
        .select("id, shop_name")
        .in("id", parentIndentIds);

      if (!indentsError && indents) {
        const indentMap = indents.reduce((acc, ind) => {
          acc[ind.id] = ind.shop_name;
          return acc;
        }, {});

        allData = allData.map((po) => {
          if (!po.shop_name) {
            const parts = (po.indent_id || "").split("::");
            const parentId = parts[0];
            return {
              ...po,
              shop_name: indentMap[parentId] || "Unknown",
            };
          }
          return po;
        });
      }
    }
  }

  return allData.map((po) => ({
    ...po,
    shop_name: po.shop_name || "Unknown",
  }));
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

  if (data && !data.shop_name && data.indent_id) {
    const parentId = data.indent_id.split("::")[0];
    const { data: indent } = await supabase
      .from("indents")
      .select("shop_name")
      .eq("id", parentId)
      .single();
    if (indent) {
      data.shop_name = indent.shop_name;
    }
  }

  if (data) {
    data.shop_name = data.shop_name || "Unknown";
  }

  return data;
};
