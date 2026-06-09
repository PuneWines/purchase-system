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
  const pageSize = 1000;

  // Fetch approved indent items paginated from approved_indent_items
  let indentData = [];
  let indentPage = 0;
  let indentHasMore = true;

  while (indentHasMore) {
    const { data: pageData, error: indentError } = await supabase
      .from("approved_indent_items")
      .select("*")
      .eq("po_status", "pending")
      .order("id", { ascending: false })
      .range(indentPage * pageSize, (indentPage + 1) * pageSize - 1);

    if (indentError) throw indentError;
    if (pageData && pageData.length > 0) {
      // Map for backward compatibility with frontend code expecting approval_status & is_excluded
      const mappedData = pageData.map(item => ({
        ...item,
        approval_status: "approved",
        is_excluded: false
      }));
      indentData = [...indentData, ...mappedData];
      indentPage++;
      if (pageData.length < pageSize) {
        indentHasMore = false;
      }
    } else {
      indentHasMore = false;
    }
  }

  // Fetch existing purchase orders paginated
  let poData = [];
  let poPage = 0;
  let poHasMore = true;

  while (poHasMore) {
    const { data: pageData, error: poError } = await supabase
      .from("purchase_orders")
      .select("indent_id, vendor_name")
      .order("id", { ascending: false })
      .range(poPage * pageSize, (poPage + 1) * pageSize - 1);

    if (poError) throw poError;
    if (pageData && pageData.length > 0) {
      poData = [...poData, ...pageData];
      poPage++;
      if (pageData.length < pageSize) {
        poHasMore = false;
      }
    } else {
      poHasMore = false;
    }
  }

  // Fetch indents to resolve shop_name paginated
  let indentsData = [];
  let indentsPage = 0;
  let indentsHasMore = true;

  while (indentsHasMore) {
    const { data: pageData, error: indentsError } = await supabase
      .from("indents")
      .select("id, shop_name")
      .order("id", { ascending: false })
      .range(indentsPage * pageSize, (indentsPage + 1) * pageSize - 1);

    if (indentsError) throw indentsError;
    if (pageData && pageData.length > 0) {
      indentsData = [...indentsData, ...pageData];
      indentsPage++;
      if (pageData.length < pageSize) {
        indentsHasMore = false;
      }
    } else {
      indentsHasMore = false;
    }
  }

  // Fetch vendors
  const { data: vendorsData, error: vendorsError } = await supabase
    .from("vendors")
    .select("*");
  if (vendorsError) throw vendorsError;

  // Fetch transporters
  const { data: transpData, error: transpError } = await supabase
    .from("transporters")
    .select("*")
    .order("created_at", { ascending: false });
  if (transpError) throw transpError;

  // Fetch receivers
  const { data: recvData, error: recvError } = await supabase
    .from("receivers")
    .select("*")
    .order("created_at", { ascending: false });
  if (recvError) throw recvError;

  return {
    indentData,
    poData,
    indentsData,
    vendorsData,
    transpData,
    recvData
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
  const { data, error } = await supabase
    .from("item_list")
    .select("id, item_name, bc_s, ml_s")
    .order("item_name", { ascending: true });
  if (error) throw error;
  return data;
};

