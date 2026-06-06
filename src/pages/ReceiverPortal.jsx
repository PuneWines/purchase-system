import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { 
  FileText, CheckCircle2, Loader2, AlertCircle, 
  ChevronDown, ChevronUp, Check, X, Calendar, 
  MessageSquare, Package, ArrowRight, UserCheck, 
  Hash, Truck, ShieldAlert 
} from "lucide-react";

const COMPANY = {
  name: "DRINQKART",
};

const ReceiverPortal = () => {
  const { receiverId } = useParams();
  const [receiver, setReceiver] = useState(null);
  const [poList, setPoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Expanded PO Tracking
  const [expandedPoId, setExpandedPoId] = useState(null);
  
  // Cache for PO items
  const [poItems, setPoItems] = useState({});
  const [loadingItems, setLoadingItems] = useState({});
  
  // Received Quantity form input states mapped by poId: { [poId]: { [itemId]: number | "" } }
  const [receivedQtys, setReceivedQtys] = useState({});
  const [remarks, setRemarks] = useState({});
  
  // Form submission tracking
  const [submittingPoId, setSubmittingPoId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [successPoIds, setSuccessPoIds] = useState({});

  // Fetch Receiver details and purchase orders
  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch receiver by id (UUID)
      const { data: recv, error: recvError } = await supabase
        .from("receivers")
        .select("*")
        .eq("id", receiverId)
        .limit(1)
        .single();

      if (recvError || !recv) {
        throw new Error("Receiver profile not found.");
      }
      setReceiver(recv);

      // 2. Fetch pending POs matching the receiver's contact number
      // where receiver has not submitted action yet.
      const { data: pos, error: posError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("receiver_number", recv.contact_number)
        .or("receiver_status.is.null,receiver_status.eq.")
        .order("created_at", { ascending: false });

      if (posError) throw posError;
      setPoList(pos || []);

      // Initialize form fields for POs
      const newRemarks = {};
      pos?.forEach(po => {
        newRemarks[po.id] = po.receiver_remarks || "";
      });
      setRemarks(prev => ({ ...newRemarks, ...prev }));

    } catch (err) {
      console.error("Error loading receiver portal data:", err);
      setError("Unable to load portal records. Please check the portal link.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (receiverId) {
      fetchPortalData();
    }
  }, [receiverId]);

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
    let poItemsList = po.po_items;
    if (typeof poItemsList === "string") {
      try {
        poItemsList = JSON.parse(poItemsList);
      } catch (e) {
        console.error("Failed to parse po_items string:", e);
        poItemsList = null;
      }
    }

    if (poItemsList && Array.isArray(poItemsList) && poItemsList.length > 0) {
      const processed = poItemsList.map(item => {
        const orderBox = item.orderBox !== undefined ? parseFloat(item.orderBox) : parseFloat(item.order_box || 0);
        const orderQty = item.orderQty !== undefined ? parseFloat(item.orderQty) : parseFloat(item.order_qty || 0);
        const qtyType = item.qtyType || (orderBox >= 0.90 ? "Box" : "Bottles");
        const displayQty = item.displayQty || (qtyType === "Box" 
          ? Math.round(orderBox).toString() 
          : Math.ceil(orderQty).toString());
        return {
          id: item.id,
          itemName: item.itemName || item.item_name,
          brandName: item.brandName || item.brand_name,
          orderQty,
          orderBox,
          qtyType,
          displayQty,
          closingQty: item.closingQty !== undefined ? item.closingQty : (item.closing_qty !== undefined ? item.closing_qty : null),
          shopName: item.shopName || item.shop_name || "Unknown"
        };
      });

      setPoItems(prev => ({ ...prev, [po.id]: processed }));

      // Prefill received quantities from transporter's delivered_items if present, else displayQty
      if (!po.receiver_status && !receivedQtys[po.id]) {
        let savedDelivered = po.delivered_items || {};
        if (typeof savedDelivered === "string") {
          try {
            savedDelivered = JSON.parse(savedDelivered);
          } catch (e) {
            savedDelivered = {};
          }
        }
        const initialQtys = {};
        processed.forEach(item => {
          initialQtys[item.id] = (savedDelivered && typeof savedDelivered === "object" ? savedDelivered[item.id]?.deliveredQty : undefined) ?? parseFloat(item.displayQty);
        });
        setReceivedQtys(prev => ({ ...prev, [po.id]: initialQtys }));
      }
      return;
    }

    try {
      setLoadingItems(prev => ({ ...prev, [po.id]: true }));

      // Fetch from indent_items
      const { data: items, error: itemsError } = await supabase
        .from("indent_items")
        .select("*")
        .eq("unique_indent_id", po.indent_id)
        .eq("approval_status", "approved")
        .eq("is_excluded", false);

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
          closingQty: row.closing_qty != null ? row.closing_qty : null,
          shopName: row.shop_name || "Unknown"
        };
      });

      setPoItems(prev => ({ ...prev, [po.id]: processed }));

      // Prefill received quantities from transporter's delivered_items if present, else displayQty
      if (!po.receiver_status && !receivedQtys[po.id]) {
        let savedDelivered = po.delivered_items || {};
        if (typeof savedDelivered === "string") {
          try {
            savedDelivered = JSON.parse(savedDelivered);
          } catch (e) {
            savedDelivered = {};
          }
        }
        const initialQtys = {};
        processed.forEach(item => {
          // Use transporter's delivered qty as starting point if available
          initialQtys[item.id] = (savedDelivered && typeof savedDelivered === "object" ? savedDelivered[item.id]?.deliveredQty : undefined) ?? parseFloat(item.displayQty);
        });
        setReceivedQtys(prev => ({ ...prev, [po.id]: initialQtys }));
      }

    } catch (err) {
      console.error("Error fetching PO items:", err);
    } finally {
      setLoadingItems(prev => ({ ...prev, [po.id]: false }));
    }
  };

  // Quantity input adjustment handlers
  const handleQtyChange = (poId, itemId, val) => {
    const currentQtys = receivedQtys[poId] || {};
    setReceivedQtys(prev => ({
      ...prev,
      [poId]: {
        ...currentQtys,
        [itemId]: val === "" ? "" : Number(val)
      }
    }));
  };

  // Quick Action: Match all – prefill from transporter delivered qty, fallback to displayQty
  const handleMatchAll = (poId, po) => {
    const items = poItems[poId] || [];
    let savedDelivered = po?.delivered_items || {};
    if (typeof savedDelivered === "string") {
      try {
        savedDelivered = JSON.parse(savedDelivered);
      } catch (e) {
        savedDelivered = {};
      }
    }
    const matched = {};
    items.forEach(item => {
      matched[item.id] = (savedDelivered && typeof savedDelivered === "object" ? savedDelivered[item.id]?.deliveredQty : undefined) ?? parseFloat(item.displayQty);
    });
    setReceivedQtys(prev => ({ ...prev, [poId]: matched }));
  };

  // Quick Action: Reset all quantities to 0
  const handleResetAll = (poId) => {
    const items = poItems[poId] || [];
    const reset = {};
    items.forEach(item => {
      reset[item.id] = 0;
    });
    setReceivedQtys(prev => ({ ...prev, [poId]: reset }));
  };

  // Submit Receiver Response
  const handleSubmitResponse = async (po, status) => {
    const poId = po.id;
    setFormErrors(prev => ({ ...prev, [poId]: "" }));

    const rem = remarks[poId]?.trim() || "";
    const items = poItems[poId] || [];
    const qtys = receivedQtys[poId] || {};

    if (status === "yes") {
      // Validate quantities
      for (const item of items) {
        const qtyVal = qtys[item.id];
        if (qtyVal === "" || qtyVal === null || qtyVal === undefined || qtyVal < 0) {
          setFormErrors(prev => ({ ...prev, [poId]: `Please enter a valid received quantity for ${item.itemName}.` }));
          return;
        }
      }
    } else {
      // Reject remarks required
      if (!rem) {
        setFormErrors(prev => ({ ...prev, [poId]: "Remarks are mandatory to reject delivery receipt." }));
        return;
      }
    }

    setSubmittingPoId(poId);

    try {
      // Build JSON for received items
      const receivedItemsJSON = {};
      items.forEach(item => {
        receivedItemsJSON[item.id] = {
          itemName: item.itemName,
          orderQty: item.orderQty,
          receivedQty: qtys[item.id] ?? parseFloat(item.displayQty)
        };
      });

      const updatePayload = {
        receiver_status: status,
        receiver_remarks: rem || null,
        received_items: status === "yes" ? receivedItemsJSON : null
      };

      // Perform DB Update
      const { error: dbError } = await supabase
        .from("purchase_orders")
        .update(updatePayload)
        .eq("id", poId);

      if (dbError) throw dbError;

      setSuccessPoIds(prev => ({ ...prev, [poId]: true }));
      setExpandedPoId(null);

      // Refresh list to update UI
      await fetchPortalData();

    } catch (err) {
      console.error("Error submitting receiver response:", err);
      setFormErrors(prev => ({ ...prev, [poId]: "Failed to submit delivery confirmation. Please try again." }));
    } finally {
      setSubmittingPoId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-600 font-medium">Loading Receiver Portal dashboard...</p>
      </div>
    );
  }

  if (error || !receiver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Portal Error</h2>
        <p className="text-slate-600 max-w-md">{error || "Receiver profile details not loaded."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Portal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-950 text-white p-6 md:p-8 rounded-2xl shadow-sm mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{receiver.name}</h1>
            <p className="text-slate-400 text-sm mt-1">Delivery Receipt Verification Portal</p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            Receiver Partner
          </span>
        </div>

        {/* PO List */}
        {poList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <Package size={48} className="text-slate-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Pending Deliveries</h3>
            <p className="text-slate-500 text-sm">There are no incoming purchase order deliveries awaiting your confirmation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Success Banner */}
            {Object.keys(successPoIds).length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 shadow-sm flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Delivery Receipt Logged Successfully!</h4>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    Your incoming stock confirmation has been successfully submitted and stored.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.keys(successPoIds).map((id) => (
                      <span key={id} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200 shadow-sm">
                        PO ID: {id}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {poList.map((po) => {
              const isExpanded = expandedPoId === po.id;
              const isSubmitted = po.receiver_status === "yes";
              const isRejected = po.receiver_status === "no";
              const items = poItems[po.id] || [];
              const isLoadingPoItems = loadingItems[po.id];
              const isLocked = po.transporter_status !== "yes";

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
                  
                  {/* Card Header */}
                  <div 
                    onClick={() => handleToggleExpand(po)}
                    className="p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer select-none gap-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-slate-900">{po.po_number}</span>
                        <span className="text-xs text-slate-500">Vendor: <strong className="text-slate-700">{po.vendor_name}</strong></span>
                      </div>

                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-lg text-xs font-bold">
                        {shopName}
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-semibold">
                        {totalQty} Qty
                      </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {po.trader_status !== "yes" ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                          ⏳ Awaiting Supplier Verification
                        </span>
                      ) : isLocked ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                          ⏳ Awaiting Transporter Confirmation
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                          ⏳ Awaiting Your Confirmation
                        </span>
                      )}

                      {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* Expandable Body */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                      
                      {/* PO PDF view link */}
                      <div className="flex justify-end">
                        {po.trader_pdf_url && (
                          <a 
                            href={po.trader_pdf_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition-colors"
                          >
                            <FileText size={16} /> View Supplier PO Invoice
                          </a>
                        )}
                      </div>

                      {isLoadingPoItems ? (
                        <div className="flex flex-col items-center justify-center py-10">
                          <Loader2 className="animate-spin text-indigo-600" size={24} />
                          <span className="text-slate-500 text-xs mt-2 font-medium">Fetching delivery details...</span>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          
                          {po.trader_status !== "yes" ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center shadow-sm flex flex-col items-center justify-center">
                              <Truck size={28} className="text-amber-600 mb-2 animate-pulse" />
                              <h4 className="text-sm font-bold text-amber-800 mb-1">
                                Awaiting Supplier Verification
                              </h4>
                              <p className="text-xs text-amber-700 max-w-md leading-relaxed">
                                The supplier ({po.vendor_name}) has not yet verified the dispatch details. You will be able to confirm delivery receipt here once they and the transporter complete their verification.
                              </p>
                            </div>
                          ) : isLocked ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center shadow-sm flex flex-col items-center justify-center">
                              <Truck size={28} className="text-amber-600 mb-2 animate-pulse" />
                              <h4 className="text-sm font-bold text-amber-800 mb-1">
                                Awaiting Transporter Confirmation
                              </h4>
                              <p className="text-xs text-amber-700 max-w-md leading-relaxed">
                                The transporter has not yet confirmed the pickup or entered delivered quantities. You will be able to confirm delivery receipt here once they complete their verification.
                              </p>
                            </div>
                          ) : null}
                          
                          {/* Dispatch & Logistics Summaries */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Supplier Summary */}
                            <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 shadow-sm space-y-3">
                              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-1.5 flex items-center gap-1.5">
                                <Hash size={14} /> Supplier Dispatch Details
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500 font-medium block">TP Number</span>
                                  <strong className="text-slate-800 font-bold">{po.tp_number || "—"}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium block">Expected Dispatch Date & Time</span>
                                  <strong className="text-slate-800 font-bold">
                                    {po.dispatch_date ? new Date(po.dispatch_date).toLocaleString("en-IN", { 
                                      day: "2-digit", month: "short", year: "numeric",
                                      hour: "2-digit", minute: "2-digit", hour12: true
                                    }) : "—"}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {/* Logistics Summary */}
                            <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4 shadow-sm space-y-3">
                              <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider border-b border-blue-100 pb-1.5 flex items-center gap-1.5">
                                <Truck size={14} /> Transporter Pickup Details
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500 font-medium block">Pickup Date</span>
                                  <strong className="text-slate-800 font-bold">
                                    {po.pickup_date ? new Date(po.pickup_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium block">Logistics Partner</span>
                                  <strong className="text-slate-800 font-bold">{po.transporter_remarks === "Transporter Bypassed (KUNAL Shop)" ? "Bypassed" : "Confirmed"}</strong>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* Delivery Receipt verification Table */}
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 border-b border-slate-200">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Item Receipt Ledger</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => !isLocked && handleMatchAll(po.id, po)}
                                  className={`px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs font-bold transition-all shadow-sm ${isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-100 cursor-pointer"}`}
                                  disabled={isLocked}
                                >
                                  Match Delivered
                                </button>
                                <button 
                                  onClick={() => !isLocked && handleResetAll(po.id)}
                                  className={`px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-bold transition-all shadow-sm ${isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200 cursor-pointer"}`}
                                  disabled={isLocked}
                                >
                                  Reset All
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-sm text-slate-800">
                                <thead>
                                  <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-14">S.No</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Order Qty</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Closing Qty</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Transporter Delivered</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-36">Received Qty</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-36">Difference</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item, index) => {
                                    const currentQtyVal = (receivedQtys[po.id] || {})[item.id] ?? "";
                                    let savedDelivered = po.delivered_items || {};
                                    if (typeof savedDelivered === "string") {
                                      try {
                                        savedDelivered = JSON.parse(savedDelivered);
                                      } catch (e) {
                                        savedDelivered = {};
                                      }
                                    }
                                    const transporterDeliveredQty = (savedDelivered && typeof savedDelivered === "object") ? savedDelivered[item.id]?.deliveredQty : undefined;
                                    let traderDecisions = po.trader_item_statuses || {};
                                    if (typeof traderDecisions === "string") {
                                      try {
                                        traderDecisions = JSON.parse(traderDecisions);
                                      } catch (e) {
                                        traderDecisions = {};
                                      }
                                    }
                                    const itemDecision = (traderDecisions && typeof traderDecisions === "object") ? traderDecisions[item.id] || "approved" : "approved";
                                    const isApprovedByTrader = itemDecision === "approved";

                                    // Difference: receiver qty vs transporter delivered qty (fallback to displayQty)
                                    // For rejected items, show N/A
                                    const referenceQty = transporterDeliveredQty ?? parseFloat(item.displayQty);
                                    const difference = isApprovedByTrader && currentQtyVal !== "" ? Number(currentQtyVal) - referenceQty : null;

                                    return (
                                      <tr
                                        key={item.id}
                                        className={`border-b transition-colors ${
                                          isApprovedByTrader
                                            ? "border-slate-100 hover:bg-slate-50/50"
                                            : "border-red-200 bg-red-50/40"
                                        }`}
                                      >
                                        <td className="p-3 text-center text-slate-500 font-medium">{index + 1}</td>
                                        <td className="p-3">
                                          <div className="flex items-start gap-2 flex-wrap">
                                            <div>
                                              <strong className={`font-semibold ${ isApprovedByTrader ? "text-slate-900" : "text-red-400 line-through"}`}>
                                                {item.itemName}
                                              </strong>
                                              <div className="text-xs text-slate-500 mt-0.5">
                                                {item.brandName} • {item.shopName}
                                              </div>
                                            </div>
                                            {!isApprovedByTrader && (
                                              <span className="shrink-0 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                                ❌ Rejected by Supplier
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-3 text-center">
                                          <div className="flex flex-col items-center">
                                            <span className={`font-bold ${isApprovedByTrader ? "text-slate-900" : "text-red-300 line-through"}`}>
                                              {item.displayQty}
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mt-1 uppercase tracking-wider">
                                              {item.qtyType}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Closing Qty */}
                                        <td className="p-3 text-center">
                                          <span className={`font-semibold ${ isApprovedByTrader ? "text-slate-700" : "text-slate-400"}`}>
                                            {item.closingQty != null ? item.closingQty : "—"}
                                          </span>
                                        </td>

                                        {/* Transporter Delivered Qty – read-only */}
                                        <td className="p-3 text-center">
                                          <div className="flex flex-col items-center gap-1 justify-center">
                                            {!isApprovedByTrader ? (
                                              <span className="text-red-400 text-xs font-bold">Not Dispatched</span>
                                            ) : transporterDeliveredQty != null ? (
                                              <>
                                                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-xs font-bold">
                                                  {transporterDeliveredQty}
                                                </span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                                                  {item.qtyType}
                                                </span>
                                              </>
                                            ) : (
                                              <span className="text-slate-400 text-xs">—</span>
                                            )}
                                          </div>
                                        </td>

                                        {/* Receiver Qty – editable (locked at 0 for rejected items) */}
                                        <td className="p-3 text-center">
                                          <div className="flex flex-col items-center gap-1 justify-center">
                                            <input
                                              type="number"
                                              className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                                              value={isApprovedByTrader ? currentQtyVal : 0}
                                              onChange={(e) => isApprovedByTrader && handleQtyChange(po.id, item.id, e.target.value)}
                                              min="0"
                                              disabled={!isApprovedByTrader || isLocked}
                                            />
                                            {isApprovedByTrader && (
                                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                                                {item.qtyType}
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        <td className="p-3 text-center">
                                          <div className="flex flex-col items-center gap-1 justify-center">
                                            {!isApprovedByTrader ? (
                                              <span className="text-red-400 text-xs font-semibold">N/A</span>
                                            ) : difference === 0 ? (
                                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                Match
                                              </span>
                                            ) : difference !== null && difference < 0 ? (
                                              <>
                                                <span className="bg-red-50 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                  {difference} Shortage
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                                  {item.qtyType}
                                                </span>
                                              </>
                                            ) : difference !== null ? (
                                              <>
                                                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                  +{difference} Surplus
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                                  {item.qtyType}
                                                </span>
                                              </>
                                            ) : null}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Receiver actions form */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                            <h4 className="text-sm font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between">
                              <span>Confirm stock Delivery Receipt</span>
                              {isLocked && (
                                <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100 uppercase">
                                  Locked
                                </span>
                              )}
                            </h4>

                            {formErrors[po.id] && (
                              <div className="bg-red-50 border border-red-200 text-red-800 text-sm font-medium p-3.5 rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} />
                                <span>{formErrors[po.id]}</span>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <MessageSquare size={15} className="text-slate-400" /> Delivery Remarks (Optional for Accept, Required for Reject)
                              </label>
                              <textarea
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                                rows={3}
                                placeholder={isLocked ? "Awaiting transporter confirmation..." : "Any delivery notes, package shortages, structural comments or reasons..."}
                                value={remarks[po.id] || ""}
                                onChange={(e) => setRemarks(prev => ({ ...prev, [po.id]: e.target.value }))}
                                disabled={isLocked}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button 
                                type="button" 
                                onClick={() => handleSubmitResponse(po, "no")}
                                className="py-3 px-6 bg-red-100 hover:bg-red-200 border border-red-200 hover:border-red-300 text-red-800 text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLocked || submittingPoId === po.id}
                              >
                                <X size={18} /> Reject Delivery
                              </button>

                              <button 
                                type="button" 
                                onClick={() => handleSubmitResponse(po, "yes")}
                                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLocked || submittingPoId === po.id}
                              >
                                {submittingPoId === po.id ? (
                                  <Loader2 className="animate-spin" size={18} />
                                ) : (
                                  <>
                                    <Check size={18} /> Confirm Delivery Receipt
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

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
    </div>
  );
};

export default ReceiverPortal;
