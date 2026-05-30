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

      // 2. Fetch pending POs matching the receiver's contact number that are ready
      // A PO is ready when the transporter has confirmed pick-up (transporter_status === 'yes')
      // and receiver has not submitted action yet.
      const { data: pos, error: posError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("receiver_number", recv.contact_number)
        .eq("transporter_status", "yes")
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

    try {
      setLoadingItems(prev => ({ ...prev, [po.id]: true }));

      // Fetch from indent_items
      const { data: items, error: itemsError } = await supabase
        .from("indent_items")
        .select("*")
        .eq("unique_indent_id", po.indent_id);

      if (itemsError) throw itemsError;

      // Filter in-memory case-insensitively by vendor name
      const filtered = (items || []).filter(
        item => item.party_name?.trim().toLowerCase() === po.vendor_name?.trim().toLowerCase()
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

      // If PO is not yet submitted, prefill received quantities with orderQty (Match All by default)
      if (!po.receiver_status && !receivedQtys[po.id]) {
        const initialQtys = {};
        processed.forEach(item => {
          initialQtys[item.id] = item.orderQty;
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

  // Quick Action: Match all quantities
  const handleMatchAll = (poId) => {
    const items = poItems[poId] || [];
    const matched = {};
    items.forEach(item => {
      matched[item.id] = item.orderQty;
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
          receivedQty: qtys[item.id]
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

              // Totals
              const totalQty = po.total_order_qty || 0;
              const totalBox = po.total_order_box || 0;

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

                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-semibold">
                        {totalQty} Qty
                      </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                        ⏳ Awaiting Delivery Confirmation
                      </span>

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
                                  <span className="text-slate-500 font-medium block">Expected Dispatch</span>
                                  <strong className="text-slate-800 font-bold">
                                    {po.dispatch_date ? new Date(po.dispatch_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
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
                                  onClick={() => handleMatchAll(po.id)}
                                  className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-bold transition-all cursor-pointer shadow-sm"
                                >
                                  Match All
                                </button>
                                <button 
                                  onClick={() => handleResetAll(po.id)}
                                  className="px-2.5 py-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-all cursor-pointer shadow-sm"
                                >
                                  Reset All
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-sm text-slate-800">
                                <thead>
                                  <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-16">S.No</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Order Qty</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-36">Delivered Qty</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Difference</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item, index) => {
                                    const currentQtyVal = (receivedQtys[po.id] || {})[item.id] ?? "";
                                    const difference = currentQtyVal !== "" ? Number(currentQtyVal) - item.orderQty : 0;
                                    const traderDecisions = po.trader_item_statuses || {};
                                    const itemDecision = traderDecisions[item.id] || "approved";
                                    const isApprovedByTrader = itemDecision === "approved";

                                    return (
                                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3 text-center text-slate-500 font-medium">{index + 1}</td>
                                        <td className="p-3">
                                          <strong className="text-slate-900 font-semibold">{item.itemName}</strong>
                                          <div className="text-xs text-slate-500 mt-0.5">
                                            {item.brandName} • {item.shopName} • {" "}
                                            <span className={`font-semibold ${isApprovedByTrader ? "text-emerald-600" : "text-red-500"}`}>
                                              Supplier: {isApprovedByTrader ? "Approved" : "Shortage/Rejected"}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-slate-900">{item.orderQty}</td>
                                        
                                        <td className="p-3 text-center">
                                          <input
                                            type="number"
                                            className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-slate-900 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                            value={currentQtyVal}
                                            onChange={(e) => handleQtyChange(po.id, item.id, e.target.value)}
                                            min="0"
                                          />
                                        </td>
                                        
                                        <td className="p-3 text-center">
                                          {difference === 0 ? (
                                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                              Match
                                            </span>
                                          ) : difference < 0 ? (
                                            <span className="bg-red-50 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                              {difference} Shortage
                                            </span>
                                          ) : (
                                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                              +{difference} Surplus
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Transporter actions form */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                            <h4 className="text-sm font-bold text-slate-950 border-b border-slate-200 pb-2">
                              Confirm stock Delivery Receipt
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
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                rows={3}
                                placeholder="Any delivery notes, package shortages, structural comments or reasons..."
                                value={remarks[po.id] || ""}
                                onChange={(e) => setRemarks(prev => ({ ...prev, [po.id]: e.target.value }))}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button 
                                type="button" 
                                onClick={() => handleSubmitResponse(po, "no")}
                                className="py-3 px-6 bg-red-100 hover:bg-red-200 border border-red-200 hover:border-red-300 text-red-800 text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                                disabled={submittingPoId === po.id}
                              >
                                <X size={18} /> Reject Delivery
                              </button>

                              <button 
                                type="button" 
                                onClick={() => handleSubmitResponse(po, "yes")}
                                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                                disabled={submittingPoId === po.id}
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
