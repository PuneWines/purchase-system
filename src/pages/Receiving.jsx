import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../utils/supabase";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  Search,
  Save,
  Inbox,
  TrendingDown,
  TrendingUp,
  Package,
  MessageSquare,
} from "lucide-react";
import Toast, { useToast } from "../components/Toast";
import useShopStore from "../store/useShopStore";

const Receiving = () => {
  const [data, setData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedShop } = useShopStore();

  const [editingQtys, setEditingQtys] = useState({});
  const [editingRemarks, setEditingRemarks] = useState({});
  const [expandedPoIds, setExpandedPoIds] = useState({});
  const [savingPoId, setSavingPoId] = useState(null);

  const { toasts, addToast, removeToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (poError) throw poError;

      if (poData && poData.length > 0) {
        const { data: indents } = await supabase.from("indents").select("id, shop_name");
        const [resItems, resApproved] = await Promise.all([
          supabase.from("indent_items").select("indent_id, unique_indent_id"),
          supabase.from("approved_indent_items").select("indent_id, unique_indent_id"),
        ]);
        const itemsAll = [...(resItems.data || []), ...(resApproved.data || [])];
        const indentMap = (indents || []).reduce((acc, ind) => { acc[ind.id] = ind.shop_name; return acc; }, {});
        const itemMap = (itemsAll || []).reduce((acc, item) => {
          if (item.unique_indent_id && item.indent_id) acc[item.unique_indent_id] = item.indent_id;
          return acc;
        }, {});

        const enrichedPoData = poData.map(po => {
          let shopName = po.shop_name || null;
          if (!shopName) {
            const parentIndentId = itemMap[po.indent_id];
            shopName = parentIndentId ? (indentMap[parentIndentId] || "Unknown") : "Unknown";
          }
          return { ...po, shop_name: shopName };
        });

        setData(enrichedPoData);

        const poIds = poData.map(po => po.id).filter(Boolean);
        const indentIds = poData.map(po => po.indent_id).filter(Boolean);
        const promises = [];
        if (poIds.length > 0) promises.push(supabase.from("approved_indent_items").select("*").in("po_id", poIds).neq("po_status", "excluded"));
        if (indentIds.length > 0) promises.push(supabase.from("approved_indent_items").select("*").in("unique_indent_id", indentIds).neq("po_status", "excluded"));

        const results = await Promise.all(promises);
        const allItemsMap = new Map();
        results.forEach(res => {
          if (res.error) throw res.error;
          if (res.data) res.data.forEach(item => allItemsMap.set(item.id, item));
        });
        setItemsData(Array.from(allItemsMap.values()));
      } else {
        setData([]);
        setItemsData([]);
      }
    } catch (err) {
      console.error("Error fetching receiving data:", err);
      addToast("Failed to load records from database.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getPoItemsData = (po) => {
    let poItemsList = po.po_items;
    if (typeof poItemsList === "string") {
      try { poItemsList = JSON.parse(poItemsList); } catch (e) { poItemsList = null; }
    }
    if (poItemsList && Array.isArray(poItemsList) && poItemsList.length > 0) {
      return poItemsList.map(item => {
        const orderQty = item.orderQty !== undefined ? parseFloat(item.orderQty) : parseFloat(item.order_qty || 0);
        const itemName = item.itemName || item.item_name;
        const brandName = item.brandName || item.brand_name || itemName;
        const closingQty = item.closingQty !== undefined ? item.closingQty : (item.closing_qty !== undefined ? item.closing_qty : "—");
        const bcs = item.bcs ? parseFloat(item.bcs) : null;
        const dbReceivedQty = po.received_items?.[item.id]?.receivedQty !== undefined ? Number(po.received_items[item.id].receivedQty) : 0;
        return { id: item.id, itemName, brandName, orderQty, dbReceivedQty, closingQty: closingQty != null ? closingQty : "—", bcs };
      });
    }
    if (!itemsData || itemsData.length === 0) return [];
    return itemsData
      .filter(item => (item.po_id === po.id || (item.unique_indent_id === po.indent_id && item.party_name?.toLowerCase() === po.vendor_name?.toLowerCase())) && (parseFloat(item.order_qty) || 0) > 0)
      .map(item => {
        const orderQty = parseFloat(item.order_qty) || 0;
        const dbReceivedQty = po.received_items?.[item.id]?.receivedQty !== undefined ? Number(po.received_items[item.id].receivedQty) : 0;
        return { id: item.id, itemName: item.item_name, brandName: item.brand_name || item.item_name, orderQty, dbReceivedQty, closingQty: item.closing_qty != null ? item.closing_qty : "—", bcs: item.bcs ? parseFloat(item.bcs) : null };
      });
  };

  const toggleExpand = (poId) => setExpandedPoIds(prev => ({ ...prev, [poId]: !prev[poId] }));
  const handleQtyChange = (poId, itemId, value) => {
    setEditingQtys(prev => ({ ...prev, [poId]: { ...prev[poId], [itemId]: value === "" ? "" : Number(value) } }));
  };
  const handleDecrement = (poId, itemId, currentVal) => handleQtyChange(poId, itemId, Math.max(0, (currentVal === "" ? 0 : Number(currentVal)) - 1));
  const handleIncrement = (poId, itemId, currentVal) => handleQtyChange(poId, itemId, (currentVal === "" ? 0 : Number(currentVal)) + 1);
  const handleMatchProduct = (poId, itemId, orderQty) => handleQtyChange(poId, itemId, orderQty);
  const handleMatchAllForPo = (po, pendingProducts) => {
    const poEdits = {};
    pendingProducts.forEach(p => { poEdits[p.id] = p.orderQty; });
    setEditingQtys(prev => ({ ...prev, [po.id]: { ...prev[po.id], ...poEdits } }));
    addToast(`Matched all pending items for PO ${po.po_number}.`, "info");
  };
  const handleRemarksChange = (poId, value) => setEditingRemarks(prev => ({ ...prev, [poId]: value }));

  const handleSavePo = async (po, poProducts) => {
    setSavingPoId(po.id);
    try {
      const updatedMap = {};
      poProducts.forEach(p => {
        const editedValue = editingQtys[po.id]?.[p.id] !== undefined ? editingQtys[po.id][p.id] : p.dbReceivedQty;
        updatedMap[p.id] = { itemName: p.itemName, orderQty: p.orderQty, receivedQty: editedValue === "" ? 0 : Number(editedValue) };
      });
      const remarks = editingRemarks[po.id] !== undefined ? editingRemarks[po.id] : (po.receiver_remarks || "");
      const { error } = await supabase.from("purchase_orders").update({ received_items: updatedMap, receiver_status: "yes", receiver_remarks: remarks || null }).eq("id", po.id);
      if (error) throw error;
      addToast(`Saved quantities for PO ${po.po_number}.`, "success");
      await fetchData();
    } catch (err) {
      addToast("Failed to save: " + err.message, "error");
    } finally {
      setSavingPoId(null);
    }
  };

  const shopFilteredData = useMemo(() => selectedShop === "All" ? data : data.filter(po => po.shop_name === selectedShop), [data, selectedShop]);

  const poRecords = useMemo(() => {
    return shopFilteredData.map(po => {
      const products = getPoItemsData(po);
      return {
        po,
        products,
        pendingProducts: products.filter(p => p.dbReceivedQty !== p.orderQty),
        historyProducts: products.filter(p => p.dbReceivedQty === p.orderQty),
      };
    }).filter(r => r.products.length > 0);
  }, [shopFilteredData, itemsData]);

  const filteredRecords = poRecords.filter(record => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return record.po.po_number?.toLowerCase().includes(q) || record.po.vendor_name?.toLowerCase().includes(q) || record.po.shop_name?.toLowerCase().includes(q);
  });

  const pendingTabRecords = filteredRecords.filter(r => r.pendingProducts.length > 0);
  const historyTabRecords = filteredRecords.filter(r => r.historyProducts.length > 0);
  const pendingCount = poRecords.filter(r => r.pendingProducts.length > 0).length;
  const historyCount = poRecords.filter(r => r.historyProducts.length > 0).length;
  const activeRecords = activeTab === "pending" ? pendingTabRecords : historyTabRecords;

  const DiffBadge = ({ diff }) => {
    if (diff === 0) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <Check size={10} /> Match
      </span>
    );
    if (diff < 0) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <TrendingDown size={10} /> {diff}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <TrendingUp size={10} /> +{diff}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Receiving</h1>
          <p className="text-sm text-slate-500">Log received quantities and track delivery discrepancies.</p>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Tabs */}
          <div className="flex bg-white border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
            {[
              { key: "pending", label: "Pending", count: pendingCount },
              { key: "history", label: "History", count: historyCount },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.key ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative sm:ml-auto">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search PO or vendor…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm w-64"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-7 h-7 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Loading orders…</span>
          </div>
        ) : activeRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              {activeTab === "pending" ? <CheckCircle2 size={22} className="text-emerald-500" /> : <Inbox size={22} className="text-slate-400" />}
            </div>
            <p className="text-sm font-medium text-slate-700">
              {activeTab === "pending" ? "All deliveries verified" : "No history yet"}
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              {activeTab === "pending"
                ? "No purchase orders with pending items."
                : "Verified purchase orders will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRecords.map(({ po, products, pendingProducts, historyProducts }) => {
              const isExpanded = !!expandedPoIds[po.id];
              const targetProducts = activeTab === "pending" ? pendingProducts : historyProducts;

              const totalOrderQty = products.reduce((s, p) => s + p.orderQty, 0);
              const totalReceivedQty = products.reduce((s, p) => {
                const v = editingQtys[po.id]?.[p.id] !== undefined ? editingQtys[po.id][p.id] : p.dbReceivedQty;
                return s + (v === "" ? 0 : Number(v));
              }, 0);
              const difference = totalReceivedQty - totalOrderQty;
              const finalPdfUrl = po.receiver_pdf_url || po.trader_pdf_url;
              const formattedDate = new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

              return (
                <div key={po.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

                  {/* Card Header */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                    onClick={() => toggleExpand(po.id)}
                  >
                    {/* PO Icon */}
                    <div className="w-9 h-9 flex-shrink-0 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <Package size={16} className="text-indigo-600" />
                    </div>

                    {/* PO Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{po.po_number}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-sm text-slate-600 truncate">{po.vendor_name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">{formattedDate}</span>
                        <span className="text-xs font-medium text-indigo-600">{po.shop_name}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-0.5">Ordered</div>
                        <div className="font-semibold text-slate-700">{totalOrderQty}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-0.5">Received</div>
                        <div className={`font-semibold ${totalReceivedQty === totalOrderQty ? "text-emerald-600" : "text-indigo-600"}`}>{totalReceivedQty}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-0.5">Status</div>
                        <DiffBadge diff={difference} />
                      </div>
                    </div>

                    {/* PDF link */}
                    {finalPdfUrl && (
                      <a
                        href={finalPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded border border-slate-200 hover:border-indigo-300"
                        onClick={e => e.stopPropagation()}
                      >
                        <FileText size={12} /> PDF
                      </a>
                    )}

                    {/* Chevron */}
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3 w-10">#</th>
                              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3">Item</th>
                              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Brand</th>
                              <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 w-24">Closing</th>
                              <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 w-24">Ordered</th>
                              <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 w-52">Received</th>
                              <th className="text-center text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 w-28">Diff</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {targetProducts.map((p, idx) => {
                              const displayVal = editingQtys[po.id]?.[p.id] !== undefined ? editingQtys[po.id][p.id] : p.dbReceivedQty;
                              const activeVal = displayVal === "" ? 0 : Number(displayVal);
                              const diff = activeVal - p.orderQty;

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3.5 text-xs text-slate-300 font-mono">{String(idx + 1).padStart(2, "0")}</td>
                                  <td className="px-4 py-3.5 font-medium text-slate-800">{p.itemName}</td>
                                  <td className="px-4 py-3.5 text-slate-500 hidden sm:table-cell">{p.brandName}</td>
                                  <td className="px-4 py-3.5 text-center text-slate-500 font-mono text-xs">{p.closingQty}</td>
                                  <td className="px-4 py-3.5 text-center font-semibold text-slate-700">{p.orderQty}</td>
                                  <td className="px-4 py-3.5 text-center">
                                    {activeTab === "pending" ? (
                                      <div className="inline-flex items-center gap-2">
                                        <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                          <button
                                            type="button"
                                            disabled={activeVal <= 0}
                                            onClick={() => handleDecrement(po.id, p.id, displayVal)}
                                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-medium"
                                          >−</button>
                                          <input
                                            type="number"
                                            min="0"
                                            value={displayVal}
                                            onChange={e => handleQtyChange(po.id, p.id, e.target.value)}
                                            className="w-12 h-8 text-center text-sm font-semibold text-slate-800 bg-white border-x border-slate-200 focus:outline-none focus:bg-indigo-50 transition-colors [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleIncrement(po.id, p.id, displayVal)}
                                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-base font-medium"
                                          >+</button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleMatchProduct(po.id, p.id, p.orderQty)}
                                          disabled={activeVal === p.orderQty}
                                          className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-400 px-2.5 py-1 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-indigo-50 hover:bg-indigo-100 font-medium"
                                        >Match</button>
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                        {p.dbReceivedQty}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <DiffBadge diff={diff} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer */}
                      {activeTab === "pending" && (
                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
                          {/* Remarks */}
                          <div className="space-y-1.5">
                            <label htmlFor={`remarks-${po.id}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                              <MessageSquare size={12} /> Remarks <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                              id={`remarks-${po.id}`}
                              rows={2}
                              placeholder="Shortage notes, damages, delays…"
                              value={editingRemarks[po.id] !== undefined ? editingRemarks[po.id] : (po.receiver_remarks || "")}
                              onChange={e => handleRemarksChange(po.id, e.target.value)}
                              className="w-full text-sm text-slate-700 placeholder-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => handleMatchAllForPo(po, pendingProducts)}
                              className="text-sm font-medium text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 px-4 py-2 rounded-lg bg-white hover:bg-indigo-50 transition-all"
                            >
                              Match all
                            </button>
                            <button
                              type="button"
                              disabled={savingPoId === po.id}
                              onClick={() => handleSavePo(po, products)}
                              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-5 py-2 rounded-lg transition-colors shadow-sm"
                            >
                              <Save size={14} />
                              {savingPoId === po.id ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Read-only remarks for history */}
                      {activeTab === "history" && po.receiver_remarks && (
                        <div className="flex gap-2.5 px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                          <MessageSquare size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-slate-700">Note: </span>{po.receiver_remarks}
                          </p>
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

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Receiving;