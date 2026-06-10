import { supabase } from "../../utils/supabase";

export const fetchNextPoNumber = async () => {
  const yr = new Date().getFullYear();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("po_number")
    .order("created_at", { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (!error && data && data.length > 0 && data[0].po_number) {
    const parts = data[0].po_number.split("-");
    if (parts.length > 1) {
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
  }
  return `${yr}/PO-${String(nextSeq).padStart(2, "0")}`;
};

export const fetchPageData = async () => {
  // Execute database queries in parallel to eliminate request waterfalls
  const [
    { data: rawIndentItems, error: indentError },
    { data: rawPoData, error: poError },
    { data: vendorsData, error: vendorsError },
    { data: transpData, error: transpError },
    { data: recvData, error: recvError }
  ] = await Promise.all([
    // Query 1: Fetch pending approved items and join the indents table to resolve shop_name on the database server
    supabase
      .from("approved_indent_items")
      .select("*, indents(shop_name)")
      .eq("po_status", "pending")
      .order("id", { ascending: false }),

    // Query 2: Fetch recent purchase orders to check for existing POs (avoiding full table scan)
    supabase
      .from("purchase_orders")
      .select("indent_id, vendor_name")
      .order("created_at", { ascending: false })
      .limit(500),

    // Query 3: Fetch all vendors
    supabase
      .from("vendors")
      .select("*"),

    // Query 4: Fetch all transporters
    supabase
      .from("transporters")
      .select("*")
      .order("created_at", { ascending: false }),

    // Query 5: Fetch all receivers
    supabase
      .from("receivers")
      .select("*")
      .order("created_at", { ascending: false })
  ]);

  if (indentError) throw indentError;
  if (poError) throw poError;
  if (vendorsError) throw vendorsError;
  if (transpError) throw transpError;
  if (recvError) throw recvError;

  // Map for backward compatibility with frontend code expecting indentsData and resolved shop_name
  const enrichedIndentData = (rawIndentItems || []).map(item => ({
    ...item,
    approval_status: "approved",
    is_excluded: false,
    shop_name: item.indents?.shop_name || "Unknown"
  }));

  // Create a minimal indents list compatible with any other parts expecting it
  const indentsData = (rawIndentItems || []).map(item => ({
    id: item.indent_id,
    shop_name: item.indents?.shop_name || "Unknown"
  }));

  return {
    indentData: enrichedIndentData,
    poData: rawPoData || [],
    indentsData,
    vendorsData: vendorsData || [],
    transpData: transpData || [],
    recvData: recvData || []
  };
};

export const generateVendorId = async (activeParty) => {
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('party_name', activeParty)
    .limit(1)
    .single();

  if (vendor) {
    return `VN-${String(vendor.id).padStart(3, "0")}`;
  }
  return "VN-000";
};

export const insertPurchaseOrder = async (poData) => {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([poData])
    .select();

  if (error) throw error;
  return data;
};

export const getOrCreateVendorPortalLink = async (activeParty, currentVendorId, baseUrl) => {
  const { data: vendorRow } = await supabase
    .from("vendors")
    .select("id, portal_link")
    .eq("party_name", activeParty)
    .limit(1)
    .single();

  if (!vendorRow) return "";

  let dbPortalLink = vendorRow.portal_link;
  if (!dbPortalLink) {
    dbPortalLink = `/vendor-portal/${vendorRow.id}`;
    await supabase
      .from("vendors")
      .update({ portal_link: dbPortalLink })
      .eq("id", vendorRow.id);
  }
  return dbPortalLink.startsWith("http") ? dbPortalLink : `${baseUrl}${dbPortalLink}`;
};

export const getOrCreateTransporterPortalLink = async (selectedTransporter, transporters, baseUrl) => {
  const transporterRow = transporters.find(t => t.contact_number === selectedTransporter);
  if (!transporterRow) return "";
  let dbPortalLink = transporterRow.portal_link;
  if (!dbPortalLink) {
    dbPortalLink = `/transporter-portal/${transporterRow.id}`;
    await supabase
      .from("transporters")
      .update({ portal_link: dbPortalLink })
      .eq("id", transporterRow.id);
  }
  return dbPortalLink.startsWith("http") ? dbPortalLink : `${baseUrl}${dbPortalLink}`;
};

export const getOrCreateReceiverPortalLink = async (selectedReceiver, receivers, baseUrl) => {
  const receiverRow = receivers.find(r => r.contact_number === selectedReceiver);
  if (!receiverRow) return "";
  let dbPortalLink = receiverRow.portal_link;
  if (!dbPortalLink) {
    dbPortalLink = `/receiver-portal/${receiverRow.id}`;
    try {
      await supabase
        .from("receivers")
        .update({ portal_link: dbPortalLink })
        .eq("id", receiverRow.id);
    } catch (err) {
      console.warn("Could not save portal_link for receiver in database (column might be missing):", err);
    }
  }
  return dbPortalLink.startsWith("http") ? dbPortalLink : `${baseUrl}${dbPortalLink}`;
};

export const excludeIndentItems = async (ids, reason) => {
  const { data, error } = await supabase
    .from("approved_indent_items")
    .update({ po_status: "excluded", exclusion_reason: reason })
    .in("id", ids)
    .select();

  if (error) throw error;
  return (data || []).map(item => ({
    ...item,
    is_excluded: true,
    exclusion_reason: reason
  }));
};

/**
 * Mark approved items as ordered in approved_indent_items table.
 */
export const markApprovedItemsAsOrdered = async (uniqueIndentId, vendorName, poId) => {
  if (!uniqueIndentId || !vendorName || !poId) return;

  const { error } = await supabase
    .from("approved_indent_items")
    .update({ po_status: "ordered", po_id: poId })
    .eq("unique_indent_id", uniqueIndentId)
    .eq("party_name", vendorName);

  if (error) throw error;
};

/**
 * Deprecated: deleteIndentAfterPO is a no-op now because items are deleted from indent_items
 * immediately after approval, and archived to approved_indent_items.
 */
export const deleteIndentAfterPO = async (uniqueIndentId) => {
  console.log("deleteIndentAfterPO called (no-op). Items are managed via approved_indent_items.");
};

export const fetchItemList = async () => {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("item_list")
      .select("id, item_name, bc_s, ml_s")
      .order("item_name", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      page++;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
};

