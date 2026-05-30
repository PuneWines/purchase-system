import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { 
  FileText, CheckCircle2, Loader2, AlertCircle, 
  ChevronDown, ChevronUp, Check, X, Calendar, 
  MessageSquare, Truck, ArrowRight, UserCheck 
} from "lucide-react";
import { sendReceiverConfirmationMessage } from "../services/whatsappService";

const COMPANY = {
  name: "DRINQKART",
};

const TransporterPortal = () => {
  const { transporterId } = useParams();
  const [transporter, setTransporter] = useState(null);
  const [poList, setPoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Expanded PO Tracking
  const [expandedPoId, setExpandedPoId] = useState(null);
  
  // Cache for PO items
  const [poItems, setPoItems] = useState({});
  const [loadingItems, setLoadingItems] = useState({});
  
  // Form input states mapped by poId
  const [pickupDates, setPickupDates] = useState({});
  const [remarks, setRemarks] = useState({});
  
  // Form submission tracking
  const [submittingPoId, setSubmittingPoId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [successPoIds, setSuccessPoIds] = useState({});

  // Fetch Transporter details and purchase orders
  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch transporter by id (UUID)
      const { data: transp, error: transpError } = await supabase
        .from("transporters")
        .select("*")
        .eq("id", transporterId)
        .limit(1)
        .single();

      if (transpError || !transp) {
        throw new Error("Transporter profile not found.");
      }
      setTransporter(transp);

      // 2. Fetch pending POs where Trader has submitted a valid TP number
      const { data: pos, error: posError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("transporter_number", transp.contact_number)
        .eq("trader_status", "yes")
        .not("tp_number", "is", null)
        .not("tp_number", "eq", "")
        .or("transporter_status.is.null,transporter_status.eq.")
        .order("created_at", { ascending: false });

      if (posError) throw posError;
      setPoList(pos || []);

      // Initialize form fields for POs
      const newPickupDates = {};
      const newRemarks = {};

      pos?.forEach(po => {
        // Prefill pickup date from trader dispatch_date if set, or existing transporter pickup_date
        newPickupDates[po.id] = po.pickup_date || po.dispatch_date || "";
        newRemarks[po.id] = po.transporter_remarks || "";
      });

      setPickupDates(prev => ({ ...newPickupDates, ...prev }));
      setRemarks(prev => ({ ...newRemarks, ...prev }));

    } catch (err) {
      console.error("Error loading transporter portal data:", err);
      setError("Unable to load portal records. Please check the portal link.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transporterId) {
      fetchPortalData();
    }
  }, [transporterId]);

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

    } catch (err) {
      console.error("Error fetching PO items:", err);
    } finally {
      setLoadingItems(prev => ({ ...prev, [po.id]: false }));
    }
  };

  // Submit Transporter Response
  const handleSubmitResponse = async (po, status) => {
    const poId = po.id;
    setFormErrors(prev => ({ ...prev, [poId]: "" }));

    const pDate = pickupDates[poId];
    const rem = remarks[poId]?.trim() || "";

    if (status === "yes" && !pDate) {
      setFormErrors(prev => ({ ...prev, [poId]: "Please specify a Pickup Date." }));
      return;
    }

    if (status === "no" && !rem) {
      setFormErrors(prev => ({ ...prev, [poId]: "Remarks are mandatory to reject a pickup request." }));
      return;
    }

    setSubmittingPoId(poId);

    try {
      const updatePayload = {
        transporter_status: status,
        pickup_date: status === "yes" ? pDate : null,
        transporter_remarks: rem
      };

      // Perform DB Update
      const { error: dbError } = await supabase
        .from("purchase_orders")
        .update(updatePayload)
        .eq("id", poId);

      if (dbError) throw dbError;

      // If approved, trigger WhatsApp to receiver
      if (status === "yes" && po.receiver_number) {
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
        
        // Fetch or generate receiver permanent portal link
        const { data: receiverRow } = await supabase
          .from("receivers")
          .select("*")
          .eq("contact_number", po.receiver_number)
          .limit(1)
          .single();

        let rPortalLink = "";
        if (receiverRow) {
          let dbPortalLink = receiverRow.portal_link;
          if (!dbPortalLink) {
            dbPortalLink = `/receiver-portal/${receiverRow.id}`;
            try {
              await supabase
                .from("receivers")
                .update({ portal_link: dbPortalLink })
                .eq("id", receiverRow.id);
            } catch (err) {
              console.warn("Could not update receiver portal_link:", err);
            }
          }
          rPortalLink = dbPortalLink.startsWith("http") ? dbPortalLink : `${baseUrl}${dbPortalLink}`;
        } else {
          rPortalLink = `${baseUrl}/receiver-confirmation/${poId}`;
        }

        let formattedPhone = po.receiver_number.replace(/\D/g, "");
        if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;

        await sendReceiverConfirmationMessage(
          formattedPhone,
          po.po_number,
          rPortalLink,
          COMPANY.name,
          po.vendor_name,
          po.receiver_pdf_url || po.trader_pdf_url
        );
      }

      setSuccessPoIds(prev => ({ ...prev, [poId]: true }));
      setExpandedPoId(null);

      // Refresh list to update UI
      await fetchPortalData();

    } catch (err) {
      console.error("Error submitting transporter response:", err);
      setFormErrors(prev => ({ ...prev, [poId]: "Failed to submit response. Please try again." }));
    } finally {
      setSubmittingPoId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-600 font-medium">Loading Transporter Portal dashboard...</p>
      </div>
    );
  }

  if (error || !transporter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Portal Error</h2>
        <p className="text-slate-600 max-w-md">{error || "Transporter profile details not loaded."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Portal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-950 text-white p-6 md:p-8 rounded-2xl shadow-sm mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{transporter.name}</h1>
            <p className="text-slate-400 text-sm mt-1">Logistics Pickup Verification Portal</p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            Logistics Partner
          </span>
        </div>

        {/* Success Banner for submissions in current session */}
        {Object.keys(successPoIds).length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 shadow-sm flex items-start gap-3">
            <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-emerald-800">Pick-up Logged Successfully!</h4>
              <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                Your confirmation has been saved successfully and the receiver has been notified.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.keys(successPoIds).map((id) => (
                  <span key={id} className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200 shadow-sm">
                    Shipment ID: {id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PO List */}
        {poList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <Truck size={48} className="text-slate-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Shipments Assigned</h3>
            <p className="text-slate-500 text-sm">There are no purchase order shipments currently assigned to your contact number.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {poList.map((po) => {
              const isExpanded = expandedPoId === po.id;
              const isSubmitted = po.transporter_status === "yes";
              const isRejected = po.transporter_status === "no";
              
              // Trader verification states
              const hasTraderSubmitted = po.trader_status === "yes";
              const traderItemDecisions = po.trader_item_statuses || {};

              const items = poItems[po.id] || [];
              const isLoadingPoItems = loadingItems[po.id];

              // Totals
              const totalQty = po.total_order_qty || 0;
              const totalBox = po.total_order_box || 0;

              // Transporter status resolver
              let statusText = "Awaiting Supplier Verification";
              let badgeColorClass = "bg-slate-100 text-slate-700 border-slate-200";

              if (hasTraderSubmitted) {
                statusText = "Awaiting Your Confirmation";
                badgeColorClass = "bg-amber-50 text-amber-700 border-amber-200";
              }
              if (isSubmitted) {
                statusText = "Pick-up Confirmed";
                badgeColorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
              } else if (isRejected) {
                statusText = "Pick-up Rejected";
                badgeColorClass = "bg-red-50 text-red-700 border-red-200";
              }

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
                        <span className="text-xs text-slate-500">Vendor: <strong className="text-slate-700">{po.vendor_name}</strong></span>
                      </div>

                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-semibold">
                        {totalQty} Qty
                      </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeColorClass}`}>
                        {statusText}
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

                      {/* Items loading spinner */}
                      {isLoadingPoItems ? (
                        <div className="flex flex-col items-center justify-center py-10">
                          <Loader2 className="animate-spin text-indigo-600" size={24} />
                          <span className="text-slate-500 text-xs mt-2 font-medium">Fetching shipment details...</span>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          
                          {/* 1. Trader details review */}
                          {hasTraderSubmitted ? (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 shadow-sm space-y-4">
                              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-2">
                                Supplier Verified Dispatch Info
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider block">TP Number</span>
                                  <div className="text-emerald-950 font-bold text-base">{po.tp_number}</div>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider block">Expected Dispatch Date</span>
                                  <div className="text-emerald-950 font-bold text-base">
                                    {new Date(po.dispatch_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                  </div>
                                </div>
                                {po.remarks && (
                                  <div className="col-span-1 sm:col-span-2 space-y-0.5 pt-2 border-t border-emerald-100/50">
                                    <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider block">Supplier Remarks</span>
                                    <div className="text-slate-700 text-sm">{po.remarks}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center shadow-sm flex flex-col items-center justify-center">
                              <Truck size={32} className="text-amber-600 mb-2" />
                              <h4 className="text-sm font-bold text-amber-800 mb-1">
                                Awaiting Supplier Dispatch Details
                              </h4>
                              <p className="text-xs text-amber-700 max-w-md leading-relaxed">
                                The supplier ({po.vendor_name}) has not yet verified the TP number and dispatch details. You will be notified via WhatsApp as soon as they submit, and pick-up actions will be unlocked here.
                              </p>
                            </div>
                          )}

                          {/* 2. Items Review list */}
                          {items.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm text-slate-800">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                      <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-16">S.No</th>
                                      <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name</th>
                                      <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Order Qty</th>
                                      <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Qty Type</th>
                                      <th className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Supplier Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, index) => {
                                      const traderDec = traderItemDecisions[item.id] || "approved";
                                      const isApprovedByTrader = traderDec === "approved";

                                      return (
                                        <tr key={item.id} className={`border-b border-slate-100 transition-colors ${isApprovedByTrader ? "hover:bg-slate-50/50" : "bg-red-50/20 hover:bg-red-50/30"}`}>
                                          <td className="p-3 text-center text-slate-500 font-medium">{index + 1}</td>
                                          <td className="p-3">
                                            <strong className="text-slate-900 font-semibold">{item.itemName}</strong>
                                            <div className="text-xs text-slate-500 mt-0.5">{item.brandName} • {item.shopName}</div>
                                          </td>
                                          <td className="p-3 text-center font-bold text-slate-900">{item.displayQty}</td>
                                          <td className="p-3 text-center text-slate-500 text-xs font-semibold">{item.qtyType}</td>
                                          <td className="p-3 text-center">
                                            <span className={`text-xs font-bold ${isApprovedByTrader ? "text-emerald-600" : "text-red-600"}`}>
                                              {isApprovedByTrader ? "Approved" : "Rejected/Shortage"}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* 3. Transporter Action / Submission */}
                          {hasTraderSubmitted && (
                            <div className="space-y-4">
                              {isSubmitted || isRejected ? (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
                                    Your Submitted Pick-up Details
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Pick-up Status</span>
                                      <strong className={`text-base font-semibold ${isSubmitted ? "text-emerald-600" : "text-red-600"}`}>
                                        {isSubmitted ? "✅ Confirmed for Pickup" : "❌ Rejected Pickup Request"}
                                      </strong>
                                    </div>
                                    {isSubmitted && po.pickup_date && (
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Pick-up Date</span>
                                        <strong className="text-slate-900 font-semibold text-base">
                                          {new Date(po.pickup_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </strong>
                                      </div>
                                    )}
                                    {po.transporter_remarks && (
                                      <div className="col-span-1 sm:col-span-2 space-y-0.5 pt-2 border-t border-slate-100">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Your Remarks</span>
                                        <p className="text-slate-700 text-sm mt-1">{po.transporter_remarks}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                                  <h4 className="text-sm font-bold text-slate-950 border-b border-slate-200 pb-2">
                                    Confirm Shipment Pickup Action
                                  </h4>

                                  {formErrors[po.id] && (
                                    <div className="bg-red-50 border border-red-200 text-red-800 text-sm font-medium p-3.5 rounded-lg flex items-center gap-2">
                                      <AlertCircle size={16} />
                                      <span>{formErrors[po.id]}</span>
                                    </div>
                                  )}

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                      <Calendar size={15} className="text-slate-400" /> Confirm Pick-up Date *
                                    </label>
                                    <input
                                      type="date"
                                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                                      value={pickupDates[po.id] || ""}
                                      onChange={(e) => setPickupDates(prev => ({ ...prev, [po.id]: e.target.value }))}
                                      min={new Date().toISOString().split("T")[0]}
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                      <MessageSquare size={15} className="text-slate-400" /> Pickup Remarks {isRejected ? "*" : "(Optional)"}
                                    </label>
                                    <textarea
                                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                      rows={3}
                                      placeholder="Any notes, truck number, vehicle dispatch notes or reasons..."
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
                                      <X size={18} /> Reject Pickup
                                    </button>

                                    <button 
                                      type="button" 
                                      onClick={() => handleSubmitResponse(po, "yes")}
                                      className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                                      disabled={submittingPoId === po.id}
                                    >
                                      {submittingPoId === po.id ? (
                                        <Loader2 className="animate-spin" size={18} />
                                      ) : (
                                        <>
                                          <Check size={18} /> Confirm Pickup & Dispatch
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
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
    </div>
  );
};

export default TransporterPortal;
