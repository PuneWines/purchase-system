import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { 
  FileText, CheckCircle2, Loader2, AlertCircle, 
  ChevronDown, ChevronUp, Check, X, Calendar, 
  Hash, MessageSquare, ArrowRight, ShoppingBag 
} from "lucide-react";
import html2pdf from "html2pdf.js";
import "../styles/PurchaseOrder.css"; // Kept solely for off-screen PDF styling

const COMPANY = {
  name: "DRINQKART",
  address: "10/212 Anna Nagar , Tirupattur - 635601",
  gstin: "33AAPSDF1ZV",
  contact: "+91-9047077124",
  email: "[EMAIL_ADDRESS]",
};

const TERMS = [
  "We reserve the right to cancel the purchase order anytime before product shipment.",
  "Invoice raised to us should contain the details of purchase order with date mentioned.",
  "Adherence to agreed product specifications is a must. Any deviation during delivery will result in cancellation of PO.",
  "Packing and shipping charges are to be borne by the supplier.",
  "Delivery should be strictly done within 5 days from the date of purchase order.",
];

const formatForDateOnly = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const pad = (num) => String(num).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${year}-${month}-${day}`;
  } catch (e) {
    return "";
  }
};

const combineDateWithCurrentTime = (dateStr) => {
  if (!dateStr) return null;
  const now = new Date();
  const [year, month, day] = dateStr.split("-").map(Number);
  const combined = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
  return combined.toISOString();
};

const VendorPortal = () => {
  const { vendorId } = useParams();
  const [vendorName, setVendorName] = useState("Vendor");
  const [poList, setPoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Expanded PO Tracking
  const [expandedPoId, setExpandedPoId] = useState(null);
  
  // Cache for PO items to avoid multiple fetches
  const [poItems, setPoItems] = useState({});
  const [loadingItems, setLoadingItems] = useState({});
  
  // Form input states mapped by poId
  const [tpNumbers, setTpNumbers] = useState({});
  const [dispatchDates, setDispatchDates] = useState({});
  const [remarks, setRemarks] = useState({});
  
  // Item approvals mapped by poId: { [poId]: { [itemId]: "approved" | "rejected" } }
  const [itemStatuses, setItemStatuses] = useState({});
  
  // Form submission tracking
  const [submittingPoId, setSubmittingPoId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [successPoIds, setSuccessPoIds] = useState({});

  // Memoized filter for pending purchase orders
  const pendingPoList = useMemo(() => {
    return poList.filter(po => po.trader_status !== "yes" && po.trader_status !== "no" && !successPoIds[po.id]);
  }, [poList, successPoIds]);

  // Refs for PDF off-screen rendering
  const offscreenRef = useRef(null);
  const [pdfData, setPdfData] = useState(null);

  // Fetch Vendor details and purchase orders
  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Resolve numeric ID (handles backward-compatibility with VN-xxx)
      let numericId = vendorId;
      if (typeof vendorId === "string" && vendorId.startsWith("VN-")) {
        numericId = parseInt(vendorId.replace("VN-", ""), 10);
      }

      // 2. Fetch vendor name from vendors table
      const { data: vendorRow, error: vendorErr } = await supabase
        .from("vendors")
        .select("id, party_name")
        .eq("id", numericId)
        .limit(1)
        .single();

      if (vendorErr || !vendorRow) {
        throw new Error(vendorErr?.message || "Vendor profile not found.");
      }

      setVendorName(vendorRow.party_name);

      // 3. Fetch POs matching this vendor name where vendor has not finished confirmation (trader_status is pending)
      const { data: pos, error: posError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("vendor_name", vendorRow.party_name)
        .or("trader_status.is.null,trader_status.eq.")
        .order("created_at", { ascending: false });

      if (posError) throw posError;
      setPoList(pos || []);

      // Initialize form fields for submitted POs
      const newTpNumbers = {};
      const newDispatchDates = {};
      const newRemarks = {};
      const newItemStatuses = {};

      pos?.forEach(po => {
        if (po.trader_status === "yes") {
          newTpNumbers[po.id] = po.tp_number || "";
          newDispatchDates[po.id] = formatForDateOnly(po.dispatch_date);
          newRemarks[po.id] = po.remarks || "";
          newItemStatuses[po.id] = po.trader_item_statuses || {};
        }
      });

      setTpNumbers(prev => ({ ...newTpNumbers, ...prev }));
      setDispatchDates(prev => ({ ...newDispatchDates, ...prev }));
      setRemarks(prev => ({ ...newRemarks, ...prev }));
      setItemStatuses(prev => ({ ...newItemStatuses, ...prev }));

    } catch (err) {
      console.error("Error loading vendor portal data:", err);
      setError("Unable to load portal records. Please check the portal link.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchPortalData();
    }
  }, [vendorId]);

  // Fetch PO items when expanding a card
  const handleToggleExpand = async (po) => {
    if (expandedPoId === po.id) {
      setExpandedPoId(null);
      return;
    }

    setExpandedPoId(po.id);

    // If items already loaded, don't fetch again
    if (poItems[po.id]) return;

    // If po has saved po_items, load them directly
    if (po.po_items && Array.isArray(po.po_items) && po.po_items.length > 0) {
      const processed = po.po_items.map(item => ({
        id: item.id,
        itemName: item.itemName || item.item_name,
        brandName: item.brandName || item.brand_name,
        orderQty: item.orderQty !== undefined ? parseFloat(item.orderQty) : parseFloat(item.order_qty || 0),
        orderBox: item.orderBox !== undefined ? parseFloat(item.orderBox) : parseFloat(item.order_box || 0),
        qtyType: item.qtyType,
        displayQty: item.displayQty,
        shopName: item.shopName || item.shop_name || "Unknown"
      }));

      setPoItems(prev => ({ ...prev, [po.id]: processed }));

      // If PO not yet submitted, initialize item statuses to approved
      if (po.trader_status !== "yes" && !itemStatuses[po.id]) {
        const initialStatuses = {};
        processed.forEach(item => {
          initialStatuses[item.id] = "approved";
        });
        setItemStatuses(prev => ({ ...prev, [po.id]: initialStatuses }));
      }
      return;
    }

    try {
      setLoadingItems(prev => ({ ...prev, [po.id]: true }));

      // Fetch from approved_indent_items
      const { data: items, error: itemsError } = await supabase
        .from("approved_indent_items")
        .select("*")
        .or(`po_id.eq.${po.id},unique_indent_id.eq.${po.indent_id}`)
        .neq("po_status", "excluded");

      if (itemsError) throw itemsError;

      // Filter in-memory case-insensitively by vendor name and positive quantity
      const filtered = (items || []).filter(
        item => 
          item.party_name?.trim().toLowerCase() === po.vendor_name?.trim().toLowerCase() &&
          (parseFloat(item.order_qty) || 0) > 0
      );

      // Process items to standard shape
      const processed = filtered.map(row => {
        const orderBox = row.order_box !== null ? parseFloat(row.order_box) : 0;
        const orderQty = row.order_qty !== null ? parseFloat(row.order_qty) : 0;
        const qtyType = orderBox >= 0.90 ? "Box" : "Bottles";
        const displayQty = qtyType === "Box" 
          ? Math.round(orderBox).toString() 
          : Math.ceil(orderQty).toString();

        return {
          id: row.id,
          itemName: row.item_name,
          brandName: row.brand_name,
          orderQty,
          orderBox,
          qtyType,
          displayQty,
          shopName: row.shop_name || "Unknown"
        };
      });

      setPoItems(prev => ({ ...prev, [po.id]: processed }));

      // If PO not yet submitted, initialize item statuses to approved
      if (po.trader_status !== "yes" && !itemStatuses[po.id]) {
        const initialStatuses = {};
        processed.forEach(item => {
          initialStatuses[item.id] = "approved";
        });
        setItemStatuses(prev => ({ ...prev, [po.id]: initialStatuses }));
      }

    } catch (err) {
      console.error("Error fetching PO items:", err);
    } finally {
      setLoadingItems(prev => ({ ...prev, [po.id]: false }));
    }
  };

  // Toggle approval decision for a single item
  const handleToggleItemStatus = (poId, itemId) => {
    const currentStatuses = itemStatuses[poId] || {};
    const newStatus = currentStatuses[itemId] === "rejected" ? "approved" : "rejected";
    
    setItemStatuses(prev => ({
      ...prev,
      [poId]: {
        ...currentStatuses,
        [itemId]: newStatus
      }
    }));
  };

  // Helper to extract storage filename from Supabase public URL
  const getFilenameFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  // Handle PO Submission
  const handleSubmitPo = async (e, po, customDecisions = null, customRemarks = null) => {
    if (e) e.preventDefault();
    const poId = po.id;
    setFormErrors(prev => ({ ...prev, [poId]: "" }));

    const dDate = dispatchDates[poId];
    const rem = customRemarks !== null ? customRemarks.trim() : (remarks[poId]?.trim() || "");
    const decisions = customDecisions !== null ? customDecisions : (itemStatuses[poId] || {});

    const items = poItems[poId] || [];
    const allRejected = items.length > 0 && items.every(item => decisions[item.id] === "rejected");

    if (!allRejected && !dDate) {
      setFormErrors(prev => ({ ...prev, [poId]: "Expected Dispatch Date is required." }));
      return;
    }

    const finalDispatchDate = allRejected ? new Date().toISOString() : combineDateWithCurrentTime(dDate);

    setSubmittingPoId(poId);

    try {
      const isKunalShop = items.some(item => item.shopName?.toUpperCase() === "KUNAL");

      const updatePayload = {
        trader_status: allRejected ? "no" : "yes",
        trader_item_statuses: decisions,
        dispatch_date: finalDispatchDate,
        remarks: rem
      };

      if (isKunalShop && !allRejected) {
        updatePayload.transporter_status = "yes";
        updatePayload.pickup_date = finalDispatchDate;
        updatePayload.transporter_remarks = "Transporter Bypassed (KUNAL Shop)";
      }

      // 2. Perform DB Update
      const { error: dbError } = await supabase
        .from("purchase_orders")
        .update(updatePayload)
        .eq("id", poId);

      if (dbError) throw dbError;

      // 3. Regenerate and Re-upload PDF
      let finalTraderPdfUrl = po.trader_pdf_url;
      try {
        // Fetch detailed vendor data for PDF
        const { data: vDetails } = await supabase
          .from("vendors")
          .select("*")
          .eq("party_name", po.vendor_name)
          .single();

        // Fetch company details for shop mapping
        const { data: companiesList } = await supabase.from("companies").select("*");
        const shopName = items[0]?.shopName?.trim().toLowerCase() || "";
        const matchedCompany = (companiesList || []).find(c => {
          const compName = (c.name || "").toLowerCase();
          return compName.includes(shopName) || shopName.includes(compName);
        });

        // Set state for PDF generation DOM
        setPdfData({
          po,
          items,
          tpNum: po.tp_number || "",
          dDate: finalDispatchDate,
          remarks: rem,
          decisions,
          vendorDetails: vDetails,
          companyInfo: matchedCompany || COMPANY,
          isKunalShop
        });

        // Small delay to allow the DOM to render
        await new Promise(resolve => setTimeout(resolve, 500));

        const docElement = offscreenRef.current;
        if (docElement) {
          docElement.classList.add("pdf-export");
          
          const opt = {
            margin:       0.2,
            filename:     `PO_${po.po_number.replace(/\//g, "_")}_Trader_Transporter.pdf`,
            image:        { type: "jpeg", quality: 1 },
            html2canvas:  { scale: 2, useCORS: true, windowWidth: 1000, width: 1000 },
            jsPDF:        { unit: "in", format: "a4", orientation: "portrait" }
          };

          const pdfBlob = await new Promise((resolve) => {
            html2pdf().set(opt).from(docElement).toContainer().toCanvas().get("canvas").then((canvas) => {
              canvas.toBlob((blob) => {
                resolve(blob);
              }, "image/png");
            });
          });

          docElement.classList.remove("pdf-export");

          // Extract old filename and re-upload (upsert = true)
          const storageFilename = getFilenameFromUrl(po.trader_pdf_url);
          if (storageFilename) {
            const { error: uploadErr } = await supabase.storage
              .from("PO")
              .upload(storageFilename, pdfBlob, { contentType: "image/png", upsert: true });

            if (uploadErr) throw uploadErr;

            // Get new public URL just in case
            const newUrl = supabase.storage.from("PO").getPublicUrl(storageFilename).data.publicUrl;
            if (newUrl) {
              finalTraderPdfUrl = newUrl;
              // Update po trader_pdf_url in DB
              await supabase
                .from("purchase_orders")
                .update({ trader_pdf_url: newUrl })
                .eq("id", poId);
            }
          }
        }
      } catch (pdfErr) {
        console.error("PDF Regeneration failed, continuing with WhatsApp notifications:", pdfErr);
      }

      // 4. Send WhatsApp Messages (Removed to avoid double/spammed notifications)

      setSuccessPoIds(prev => ({ ...prev, [poId]: true }));
      setExpandedPoId(null);
      setPdfData(null);

      // Re-fetch PO list to update UI
      await fetchPortalData();

    } catch (err) {
      console.error("Error submitting vendor portal confirmation:", err);
      setFormErrors(prev => ({ ...prev, [poId]: "Failed to submit. Please try again." }));
    } finally {
      setSubmittingPoId(null);
    }
  };

  const handleApproveAllItems = (poId) => {
    const items = poItems[poId] || [];
    const approvedStatuses = {};
    items.forEach(item => {
      approvedStatuses[item.id] = "approved";
    });
    setItemStatuses(prev => ({
      ...prev,
      [poId]: approvedStatuses
    }));
  };

  const handleRejectEntireOrder = async (po) => {
    const poId = po.id;
    if (!window.confirm(`Are you sure you want to reject the entire Purchase Order (${po.po_number})?`)) {
      return;
    }

    const userRemarks = window.prompt("Optional: Enter remarks/reason for rejecting this entire order:");
    if (userRemarks === null) return; // User cancelled

    const items = poItems[poId] || [];
    const rejectedStatuses = {};
    items.forEach(item => {
      rejectedStatuses[item.id] = "rejected";
    });

    setItemStatuses(prev => ({
      ...prev,
      [poId]: rejectedStatuses
    }));
    setRemarks(prev => ({
      ...prev,
      [poId]: userRemarks
    }));

    await handleSubmitPo(null, po, rejectedStatuses, userRemarks);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-600 font-medium">Loading Vendor Portal dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Portal Error</h2>
        <p className="text-slate-600 max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Portal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-sm mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{vendorName}</h1>
            <p className="text-slate-400 text-sm mt-1">Supplier Verification Portal</p>
          </div>
          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            Vendor: {vendorId}
          </span>
        </div>

        {/* Success Banner for submissions in current session */}
        {Object.keys(successPoIds).length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 shadow-sm flex items-start gap-3">
            <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-emerald-800">Verification Submitted Successfully!</h4>
              <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                Your verification has been recorded, the PO invoice has been updated with your TP number stamp, and the transporter has been notified.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.keys(successPoIds).map((id) => (
                  <span key={id} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200 shadow-sm">
                    Verified ID: {id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PO List */}
        {pendingPoList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <ShoppingBag size={48} className="text-slate-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Purchase Orders Found</h3>
            <p className="text-slate-500 text-sm">There are no active purchase orders registered to your supplier profile.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPoList.map((po) => {
              const isExpanded = expandedPoId === po.id;
              const isSubmitted = po.trader_status === "yes";
              const isRejected = po.trader_status === "no";
              const items = poItems[po.id] || [];
              const isLoadingPoItems = loadingItems[po.id];

              const poItemStatuses = itemStatuses[po.id] || {};
              const allRejected = items.length > 0 && items.every(item => poItemStatuses[item.id] === "rejected");

              // Totals
              const totalQty = po.total_order_qty || 0;
              const totalBox = po.total_order_box || 0;

              const getShopName = () => {
                if (po.shop_name) return po.shop_name;
                let list = po.po_items;
                if (typeof list === "string") {
                  try {
                    list = JSON.parse(list);
                  } catch (e) {
                    list = null;
                  }
                }
                return list?.[0]?.shopName || list?.[0]?.shop_name || "Unknown";
              };
              const shopName = getShopName();

              return (
                <div key={po.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                   
                  {/* PO Card Header */}
                  <div 
                    onClick={() => handleToggleExpand(po)}
                    className="p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer select-none gap-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-slate-900">{po.po_number}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>

                      {/* Info mini-tags */}
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-lg text-xs font-bold">
                        {shopName}
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-semibold">
                        {totalQty} Qty
                      </span>
                      {totalBox > 0 && (
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-semibold">
                          {totalBox} Boxes
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Status Badges */}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        isSubmitted 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : isRejected 
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {isSubmitted ? "✓ Confirmed" : isRejected ? "✕ Rejected" : "⏳ Pending Review"}
                      </span>

                      {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* PO Card Body (Expandable) */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                      
                      {/* Quick Actions & Original PO Document View Link */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        {!isSubmitted && !isRejected && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproveAllItems(po.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              <Check size={14} /> Approve All Items
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectEntireOrder(po)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              <X size={14} /> Reject Entire Order
                            </button>
                          </div>
                        )}
                        {po.trader_pdf_url && (
                          <a 
                            href={po.trader_pdf_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition-colors sm:ml-auto"
                          >
                            <FileText size={16} /> View Current PO Invoice
                          </a>
                        )}
                      </div>

                      {/* Items Loading State */}
                      {isLoadingPoItems ? (
                        <div className="flex flex-col items-center justify-center py-10">
                          <Loader2 className="animate-spin text-indigo-600" size={24} />
                          <span className="text-slate-500 text-xs mt-2 font-medium">Fetching purchase items...</span>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          
                          {/* Item Verification Table */}
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-sm text-slate-800">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-16">S.No</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Order Qty</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Qty Type</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-56">Verification Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item, index) => {
                                    const itemDec = (itemStatuses[po.id] || {})[item.id] || "approved";
                                    const isItemApproved = itemDec === "approved";

                                    return (
                                      <tr key={item.id} className={`border-b border-slate-100 transition-colors ${isItemApproved ? "hover:bg-slate-50/50" : "bg-red-50/20 hover:bg-red-50/30"}`}>
                                        <td className="p-3 text-center text-slate-500 font-medium">{index + 1}</td>
                                        <td className="p-3">
                                          <strong className="text-slate-900 font-semibold">{item.itemName}</strong>
                                          <div className="text-xs text-slate-500 mt-0.5">{item.brandName} • {item.shopName}</div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-slate-900">{item.displayQty}</td>
                                        <td className="p-3 text-center text-slate-500 text-xs font-semibold">{item.qtyType}</td>
                                        
                                        <td className="p-3 text-center">
                                          {isSubmitted ? (
                                            <span className={`inline-flex items-center gap-1 text-sm font-bold ${isItemApproved ? "text-emerald-600" : "text-red-600"}`}>
                                              {isItemApproved ? <Check size={16} /> : <X size={16} />}
                                              {isItemApproved ? "Approved" : "Rejected"}
                                            </span>
                                          ) : (
                                            <div className="flex justify-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleItemStatus(po.id, item.id)}
                                                className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                                  isItemApproved 
                                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" 
                                                    : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                                }`}
                                              >
                                                <Check size={14} /> Approve
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleToggleItemStatus(po.id, item.id)}
                                                className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                                  !isItemApproved 
                                                    ? "bg-red-50 border-red-500 text-red-700 shadow-sm" 
                                                    : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                                }`}
                                              >
                                                <X size={14} /> Reject
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Submission Fields Section */}
                          {isSubmitted ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
                                Submitted Verification Details
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">TP Number</span>
                                  <strong className="text-slate-900 font-semibold">{tpNumbers[po.id] || po.tp_number || "—"}</strong>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Expected Dispatch Date & Time</span>
                                  <strong className="text-slate-900 font-semibold">
                                    {dispatchDates[po.id] || po.dispatch_date ? new Date(dispatchDates[po.id] || po.dispatch_date).toLocaleString("en-IN", { 
                                      day: "2-digit", month: "short", year: "numeric",
                                      hour: "2-digit", minute: "2-digit", hour12: true
                                    }) : "—"}
                                  </strong>
                                </div>
                                {(remarks[po.id] || po.remarks) && (
                                  <div className="col-span-1 sm:col-span-2 space-y-0.5 pt-2 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Remarks</span>
                                    <p className="text-slate-700 text-sm mt-1">{remarks[po.id] || po.remarks}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <form 
                              onSubmit={(e) => handleSubmitPo(e, po)} 
                              className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-5"
                            >
                              <h4 className="text-sm font-bold text-slate-950 border-b border-slate-200 pb-2">
                                Enter PO Dispatch Verification
                              </h4>

                              {formErrors[po.id] && (
                                <div className="bg-red-50 border border-red-200 text-red-800 text-sm font-medium p-3.5 rounded-lg flex items-center gap-2">
                                  <AlertCircle size={16} />
                                  <span>{formErrors[po.id]}</span>
                                </div>
                              )}

                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                  <Calendar size={15} className="text-slate-400" /> Expected Dispatch Date {allRejected ? "" : "*"}
                                </label>
                                <input
                                  type="date"
                                  required={!allRejected}
                                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold disabled:bg-slate-100 disabled:cursor-not-allowed"
                                  value={allRejected ? "" : (dispatchDates[po.id] || "")}
                                  onChange={(e) => setDispatchDates(prev => ({ ...prev, [po.id]: e.target.value }))}
                                  min={formatForDateOnly(new Date())}
                                  disabled={allRejected}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                  <MessageSquare size={15} className="text-slate-400" /> Additional Remarks (Optional)
                                </label>
                                <textarea
                                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                  rows={3}
                                  placeholder="Any remarks, packaging details or loading notes..."
                                  value={remarks[po.id] || ""}
                                  onChange={(e) => setRemarks(prev => ({ ...prev, [po.id]: e.target.value }))}
                                />
                              </div>

                              <button 
                                type="submit" 
                                className={`w-full py-3.5 px-6 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer ${
                                  allRejected ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                                }`}
                                disabled={submittingPoId === po.id}
                              >
                                {submittingPoId === po.id ? (
                                  <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>{allRejected ? "Rejecting PO..." : "Regenerating PO & Notifying Transporter..."}</span>
                                  </>
                                ) : (
                                  <>
                                    <span>{allRejected ? "Reject Entire PO" : "Submit PO"}</span>
                                    <ArrowRight size={18} />
                                  </>
                                )}
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Offscreen PO Renderer for PDF Regeneration ── */}
      {pdfData && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <div 
            ref={offscreenRef} 
            className="po-document" 
            id={`pdf-trader-portal-${pdfData.po.id}`}
            style={{ width: "1000px", padding: "32px", background: "white" }}
          >
            {/* PO Header */}
            <div className="po-header-area">
              <div className="po-logo-block">
                <div className="po-logo-icon" style={{ backgroundColor: "#0052cc", display: "flex", alignItems: "center", justifyItems: "center" }}>
                  <ShoppingBag size={24} color="#fff" />
                </div>
                <div className="po-company-info">
                  <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0 }}>{pdfData.companyInfo?.name || "DRINQKART"}</h1>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#5e6c84" }}>{pdfData.companyInfo?.address || COMPANY.address}</p>
                </div>
              </div>

              <div className="po-header-right">
                <h1 style={{ color: "#0052cc", fontSize: "1.35rem", textTransform: "uppercase", margin: 0 }}>Purchase Order</h1>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", margin: "4px 0 8px 0" }}>TRADER & TRANSPORTER COPY</div>
                <table className="po-meta-table">
                  <tbody>
                    <tr>
                      <td>PO No:</td>
                      <td>{pdfData.po.po_number}</td>
                    </tr>
                    <tr>
                      <td>PO Date:</td>
                      <td>{new Date(pdfData.po.created_at).toLocaleDateString("en-IN")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vendor & Ship To Row */}
            <div className="po-boxes-row">
              <div className="po-box">
                <div className="po-box-header">Vendor</div>
                <div className="po-box-body">
                  <strong>{pdfData.po.vendor_name}</strong><br />
                  Address: {pdfData.vendorDetails?.address || "—"}<br />
                  GSTIN: {pdfData.vendorDetails?.gstin || "—"}<br />
                  Contact: {pdfData.vendorDetails?.contact || "—"}<br />
                  Email: {pdfData.vendorDetails?.email || "—"}
                </div>
              </div>

              <div className="po-box">
                <div className="po-box-header">Ship To</div>
                <div className="po-box-body">
                  <strong>{pdfData.companyInfo?.name || "DRINQKART"}</strong><br />
                  {pdfData.companyInfo?.address || COMPANY.address}<br />
                  GSTIN: {pdfData.companyInfo?.gstin || COMPANY.gstin}<br />
                  Contact: {pdfData.companyInfo?.contact || COMPANY.contact}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="po-items-table">
              <thead>
                <tr>
                  <th className="po-text-center">S.No</th>
                  <th>Shop Name</th>
                  <th>Item Name</th>
                  <th className="po-text-center">Order Qty (Boxes)</th>
                  <th className="po-text-center">Order Qty (Bottles)</th>
                  <th className="po-text-center">Qty Type</th>
                  <th className="po-text-center">Verification</th>
                </tr>
              </thead>
              <tbody>
                {pdfData.items.map((item, index) => {
                  const itemDec = pdfData.decisions[item.id] || "approved";
                  const isItemApproved = itemDec === "approved";

                  return (
                    <tr key={item.id}>
                      <td className="po-text-center">{index + 1}</td>
                      <td><strong>{item.shopName}</strong></td>
                      <td><strong>{item.itemName}</strong></td>
                      <td className="po-text-center">{item.qtyType === "Box" ? item.displayQty : "—"}</td>
                      <td className="po-text-center">{item.qtyType === "Bottles" ? item.displayQty : "—"}</td>
                      <td className="po-text-center" style={{ color: "#64748b" }}>{item.qtyType}</td>
                      <td className="po-text-center" style={{ fontWeight: "700", color: isItemApproved ? "#16a34a" : "#dc2626" }}>
                        {isItemApproved ? "Approved" : "Rejected"}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ fontWeight: "bold", borderTop: "2px solid #94a3b8", backgroundColor: "#f8fafc" }}>
                  <td colSpan={3} style={{ textAlign: "right", padding: "10px 16px" }}>Total:</td>
                  <td className="po-text-center" style={{ color: "#1e1b4b" }}>
                    {pdfData.po.total_order_box}
                  </td>
                  <td className="po-text-center" style={{ color: "#1e1b4b" }}>
                    {pdfData.po.total_order_qty.toLocaleString("en-IN")}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>

            {/* Verification Stamp Section */}
            <div style={{
              marginTop: "24px", border: "2px solid #10b981", borderRadius: "8px",
              padding: "16px", backgroundColor: "#f0fdf4", display: "grid",
              gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px"
            }}>
              <div style={{ gridColumn: "1 / -1", borderBottom: "1px solid #bbf7d0", paddingBottom: "8px" }}>
                <h4 style={{ margin: 0, color: "#166534", fontSize: "14px", textTransform: "uppercase", fontWeight: "700" }}>
                  Supplier Dispatch Verification details
                </h4>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "#166534", textTransform: "uppercase", fontWeight: "700" }}>TP Number:</span>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#14532d" }}>{pdfData.tpNum}</div>
              </div>
              <div>
                <span style={{ fontSize: "10px", color: "#166534", textTransform: "uppercase", fontWeight: "700" }}>Expected Dispatch Date & Time:</span>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#14532d" }}>
                  {pdfData.dDate ? new Date(pdfData.dDate).toLocaleString("en-IN", { 
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit", hour12: true
                  }) : "—"}
                </div>
              </div>
              {pdfData.remarks && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: "10px", color: "#166534", textTransform: "uppercase", fontWeight: "700" }}>Supplier Remarks:</span>
                  <div style={{ fontSize: "13px", color: "#14532d" }}>{pdfData.remarks}</div>
                </div>
              )}
            </div>

            {/* Signature Section */}
            <div className="po-footer-section" style={{ marginTop: "24px" }}>
              <div className="po-terms-block">
                <h4 style={{ fontSize: "0.85rem", margin: "0 0 6px 0" }}>Terms and conditions:</h4>
                <ol style={{ fontSize: "0.75rem", paddingLeft: "16px", color: "#5e6c84" }}>
                  {TERMS.map((t, i) => <li key={i}>{t}</li>)}
                </ol>
              </div>

              <div className="po-signature-block">
                <div className="po-signature-body" style={{ height: "60px", borderBottom: "1px solid #172b4d" }}></div>
                <div className="po-signature-header" style={{ fontSize: "0.85rem" }}>For {pdfData.companyInfo?.name || "DRINQKART"}</div>
                <div className="po-signature-sub" style={{ fontSize: "0.7rem", color: "#5e6c84" }}>Authorized signatory</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPortal;
