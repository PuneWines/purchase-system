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
  // Fetch approved indent items
  const { data: indentData, error: indentError } = await supabase
    .from("indent_items")
    .select("*")
    .eq("approval_status", "approved")
    .eq("is_excluded", false);

  if (indentError) throw indentError;

  // Fetch existing purchase orders
  const { data: poData, error: poError } = await supabase
    .from("purchase_orders")
    .select("indent_id, vendor_name");
  if (poError) throw poError;

  // Fetch indents to resolve shop_name
  const { data: indentsData, error: indentsError } = await supabase
    .from("indents")
    .select("id, shop_name");
  if (indentsError) throw indentsError;

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
  const { data: existingVendorData } = await supabase
    .from('purchase_orders')
    .select('vendor_id')
    .eq('vendor_name', activeParty)
    .limit(1);

  if (existingVendorData && existingVendorData.length > 0 && existingVendorData[0].vendor_id) {
    return existingVendorData[0].vendor_id;
  } else {
    const { data: allVendors } = await supabase.from('purchase_orders').select('vendor_id');
    let maxSeq = 0;
    if (allVendors) {
      allVendors.forEach(v => {
        if (v.vendor_id && v.vendor_id.startsWith('VN-')) {
          const seq = parseInt(v.vendor_id.split('-')[1], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      });
    }
    return `VN-${String(maxSeq + 1).padStart(3, "0")}`;
  }
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
    .select("portal_link")
    .eq("party_name", activeParty)
    .limit(1)
    .single();

  let dbPortalLink = vendorRow?.portal_link;
  if (!dbPortalLink) {
    dbPortalLink = `/vendor-portal/${currentVendorId}`;
    await supabase
      .from("vendors")
      .update({ portal_link: dbPortalLink })
      .eq("party_name", activeParty);
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
