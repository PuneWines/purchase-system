import { supabase } from "../../utils/supabase";

/**
 * Fetch a paginated chunk of purchase orders, enriched with resolved transporter/receiver names.
 */
export const fetchPipelineOrders = async ({
  limit = 20,
  offset = 0,
  shop = "All",
  status = "All",
  search = "",
  sortBy = "date-desc",
  startDate = "",
  endDate = "",
}) => {
  let query = supabase.from("purchase_orders").select("*");

  // Apply shop filter
  if (shop && shop !== "All") {
    query = query.eq("shop_name", shop);
  }

  // Apply search query filter
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(
      `po_number.ilike.${q},vendor_name.ilike.${q},shop_name.ilike.${q},first_brand_name.ilike.${q}`
    );
  }

  // Apply date range filter
  if (startDate) {
    const startLocal = new Date(`${startDate}T00:00:00`);
    query = query.gte("created_at", startLocal.toISOString());
  }
  if (endDate) {
    const endLocal = new Date(`${endDate}T23:59:59.999`);
    query = query.lte("created_at", endLocal.toISOString());
  }

  // Apply status filter mapping
  if (status && status !== "All") {
    if (status === "Completed") {
      query = query.eq("receiver_status", "yes");
    } else if (status === "Transit" || status === "In Transit") {
      query = query.eq("transporter_status", "yes").is("receiver_status", null);
    } else if (status === "Pending" || status === "Awaiting Supplier") {
      query = query.is("trader_status", null);
    } else if (status === "Issues") {
      query = query.or("trader_status.eq.no,transporter_status.eq.no,receiver_status.eq.no,trader_status.eq.yes");
    } else if (status === "Delivery Rejected") {
      query = query.eq("receiver_status", "no");
    } else if (status === "Pickup Rejected") {
      query = query.eq("transporter_status", "no");
    } else if (status === "Vendor Confirmed" || status === "Partially Accepted") {
      query = query.eq("trader_status", "yes").is("transporter_status", null);
    } else if (status === "Vendor Rejected") {
      query = query.eq("trader_status", "no");
    }
  }

  // Apply Sorting
  let orderField = "created_at";
  let orderAsc = false;
  if (sortBy === "date-asc") {
    orderAsc = true;
  } else if (sortBy === "po-asc") {
    orderField = "po_number";
    orderAsc = true;
  } else if (sortBy === "po-desc") {
    orderField = "po_number";
    orderAsc = false;
  }

  query = query
    .order(orderField, { ascending: orderAsc })
    .order("id", { ascending: true }) // Tie-breaker
    .range(offset, offset + limit - 1);

  const { data: poData, error: poError } = await query;
  if (poError) throw poError;

  if (!poData || poData.length === 0) {
    return [];
  }

  // Fetch transporters and receivers to resolve names
  const [transportersRes, receiversRes] = await Promise.all([
    supabase.from("transporters").select("name, contact_number"),
    supabase.from("receivers").select("name, contact_number"),
  ]);

  const transporterMap = (transportersRes.data || []).reduce((acc, t) => {
    if (t.contact_number) acc[t.contact_number.trim()] = t.name;
    return acc;
  }, {});

  const receiverMap = (receiversRes.data || []).reduce((acc, r) => {
    if (r.contact_number) acc[r.contact_number.trim()] = r.name;
    return acc;
  }, {});

  // Resolve shop_name for older records
  let enrichedPOs = [...poData];
  const missingShopPOs = enrichedPOs.filter((po) => !po.shop_name && po.indent_id);
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

        enrichedPOs = enrichedPOs.map((po) => {
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

  // Enrich with names
  let mapped = enrichedPOs.map((po) => {
    const transpNum = po.transporter_number ? po.transporter_number.trim() : "";
    const recvNum = po.receiver_number ? po.receiver_number.trim() : "";

    let parsedItems = po.po_items;
    if (typeof parsedItems === "string") {
      try {
        parsedItems = JSON.parse(parsedItems);
      } catch (e) {
        parsedItems = [];
      }
    }

    return {
      ...po,
      shop_name: po.shop_name || "Unknown",
      transporter_name: transporterMap[transpNum] || po.transporter_number || "—",
      receiver_name: receiverMap[recvNum] || po.receiver_number || "—",
      po_items: Array.isArray(parsedItems) ? parsedItems : [],
    };
  });

  // Client-side sub-filter for Trader partially vs fully accepted details (since both have trader_status = 'yes')
  if (status === "Partially Accepted") {
    mapped = mapped.filter((po) => {
      let traderDecisions = po.trader_item_statuses || {};
      if (typeof traderDecisions === "string") {
        try { traderDecisions = JSON.parse(traderDecisions); } catch (e) { traderDecisions = {}; }
      }
      return Object.values(traderDecisions).includes("rejected");
    });
  } else if (status === "Vendor Confirmed") {
    mapped = mapped.filter((po) => {
      let traderDecisions = po.trader_item_statuses || {};
      if (typeof traderDecisions === "string") {
        try { traderDecisions = JSON.parse(traderDecisions); } catch (e) { traderDecisions = {}; }
      }
      return !Object.values(traderDecisions).includes("rejected");
    });
  } else if (status === "Issues") {
    mapped = mapped.filter((po) => {
      if (po.trader_status === "no" || po.transporter_status === "no" || po.receiver_status === "no") return true;
      if (po.trader_status === "yes") {
        let traderDec = po.trader_item_statuses || {};
        if (typeof traderDec === "string") {
          try { traderDec = JSON.parse(traderDec); } catch (e) { traderDec = {}; }
        }
        return Object.values(traderDec).includes("rejected");
      }
      return false;
    });
  }

  return mapped;
};

/**
 * Fetch a lightweight list of PO statuses for generating global KPI cards.
 */
export const fetchPipelineStats = async ({ shop = "All", startDate = "", endDate = "" }) => {
  let query = supabase
    .from("purchase_orders")
    .select("trader_status, transporter_status, receiver_status, trader_item_statuses, shop_name");

  if (shop && shop !== "All") {
    query = query.eq("shop_name", shop);
  }

  // Apply date range filter
  if (startDate) {
    const startLocal = new Date(`${startDate}T00:00:00`);
    query = query.gte("created_at", startLocal.toISOString());
  }
  if (endDate) {
    const endLocal = new Date(`${endDate}T23:59:59.999`);
    query = query.lte("created_at", endLocal.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};
