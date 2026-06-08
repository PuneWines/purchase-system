import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../utils/supabase";
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Save, 
  Inbox, 
  TrendingDown, 
  TrendingUp,
  Package,
  Calendar,
  User,
  MessageSquare
} from "lucide-react";
import Toast, { useToast } from "../components/Toast";
import useShopStore from "../store/useShopStore";
import "../styles/Pages.css";
import "../styles/Receiving.css";

const Receiving = () => {
  const [data, setData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" or "history"
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedShop } = useShopStore();
  
  // Local editing states
  const [editingQtys, setEditingQtys] = useState({}); // { [poId]: { [itemId]: number } }
  const [editingRemarks, setEditingRemarks] = useState({}); // { [poId]: string }
  const [expandedPoIds, setExpandedPoIds] = useState({}); // { [poId]: boolean }
  const [savingPoId, setSavingPoId] = useState(null);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Purchase Orders
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (poError) throw poError;

      if (poData && poData.length > 0) {
        // Fetch indents, indent_items, and approved_indent_items to resolve shop_name
        const { data: indents } = await supabase.from("indents").select("id, shop_name");
        const [resItems, resApproved] = await Promise.all([
          supabase.from("indent_items").select("indent_id, unique_indent_id"),
          supabase.from("approved_indent_items").select("indent_id, unique_indent_id")
        ]);
        const itemsAll = [...(resItems.data || []), ...(resApproved.data || [])];

        const indentMap = (indents || []).reduce((acc, ind) => {
          acc[ind.id] = ind.shop_name;
          return acc;
        }, {});

        const itemMap = (itemsAll || []).reduce((acc, item) => {
          if (item.unique_indent_id && item.indent_id) {
            acc[item.unique_indent_id] = item.indent_id;
          }
          return acc;
        }, {});

        const enrichedPoData = poData.map(po => {
          let shopName = po.shop_name || null;
          if (!shopName) {
            const parentIndentId = itemMap[po.indent_id];
            shopName = parentIndentId ? (indentMap[parentIndentId] || "Unknown") : "Unknown";
          }
          return {
            ...po,
            shop_name: shopName
          };
        });

        setData(enrichedPoData);

        // 2. Fetch approved indent items associated with the PO indents
        const indentIds = poData.map(po => po.indent_id).filter(Boolean);
        if (indentIds.length > 0) {
          const { data: items, error: itemsError } = await supabase
            .from("approved_indent_items")
            .select("*")
            .in("unique_indent_id", indentIds)
            .neq("po_status", "excluded");

          if (itemsError) throw itemsError;
          setItemsData(items || []);
        } else {
          setItemsData([]);
        }
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

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to resolve items for a PO based on unique_indent_id and vendor_name
  const getPoItemsData = (po) => {
    if (!itemsData || itemsData.length === 0) return [];
    return itemsData
      .filter(item => 
        item.unique_indent_id === po.indent_id &&
        item.party_name?.toLowerCase() === po.vendor_name?.toLowerCase() &&
        (parseFloat(item.order_qty) || 0) > 0
      )
      .map(item => {
        const orderQty = parseFloat(item.order_qty) || 0;
        // Determine received qty stored in database
        const dbReceivedQty = po.received_items?.[item.id]?.receivedQty !== undefined
          ? Number(po.received_items[item.id].receivedQty)
          : 0;
        
        return {
          id: item.id,
          itemName: item.item_name,
          brandName: item.brand_name || item.item_name,
          orderQty: orderQty,
          dbReceivedQty: dbReceivedQty,
          closingQty: item.closing_qty != null ? item.closing_qty : "—",
          bcs: item.bcs ? parseFloat(item.bcs) : null
        };
      });
  };

  // Toggle card expansion
  const toggleExpand = (poId) => {
    setExpandedPoIds(prev => ({
      ...prev,
      [poId]: !prev[poId]
    }));
  };

  // Update received quantity locally in memory
  const handleQtyChange = (poId, itemId, value) => {
    const numVal = value === "" ? "" : Number(value);
    setEditingQtys(prev => ({
      ...prev,
      [poId]: {
        ...prev[poId],
        [itemId]: numVal
      }
    }));
  };

  const handleDecrement = (poId, itemId, currentVal) => {
    const current = currentVal === "" ? 0 : Number(currentVal);
    const newVal = Math.max(0, current - 1);
    handleQtyChange(poId, itemId, newVal);
  };

  const handleIncrement = (poId, itemId, currentVal) => {
    const current = currentVal === "" ? 0 : Number(currentVal);
    const newVal = current + 1;
    handleQtyChange(poId, itemId, newVal);
  };

  // Quick match single product quantity
  const handleMatchProduct = (poId, itemId, orderQty) => {
    handleQtyChange(poId, itemId, orderQty);
  };

  // Quick match all pending items inside a single PO locally
  const handleMatchAllForPo = (po, pendingProducts) => {
    const poEdits = {};
    pendingProducts.forEach(p => {
      poEdits[p.id] = p.orderQty;
    });

    setEditingQtys(prev => ({
      ...prev,
      [po.id]: {
        ...prev[po.id],
        ...poEdits
      }
    }));
    addToast(`Matched all pending items for PO ${po.po_number} in view.`, "info");
  };

  // Update Remarks locally
  const handleRemarksChange = (poId, value) => {
    setEditingRemarks(prev => ({
      ...prev,
      [poId]: value
    }));
  };

  // Save PO changes to Supabase
  const handleSavePo = async (po, poProducts) => {
    setSavingPoId(po.id);
    try {
      const existingMap = po.received_items && typeof po.received_items === 'object' ? { ...po.received_items } : {};
      
      const updatedMap = {};
      poProducts.forEach(p => {
        const dbValue = p.dbReceivedQty;
        // Read local edit, if none exists fallback to dbValue
        const editedValue = editingQtys[po.id]?.[p.id] !== undefined ? editingQtys[po.id][p.id] : dbValue;
        
        updatedMap[p.id] = {
          itemName: p.itemName,
          orderQty: p.orderQty,
          receivedQty: editedValue === "" ? 0 : Number(editedValue)
        };
      });

      const remarks = editingRemarks[po.id] !== undefined ? editingRemarks[po.id] : (po.receiver_remarks || "");

      const { error } = await supabase
        .from("purchase_orders")
        .update({
          received_items: updatedMap,
          receiver_status: "yes",
          receiver_remarks: remarks || null
        })
        .eq("id", po.id);

      if (error) throw error;

      addToast(`Successfully saved received quantities for PO ${po.po_number}!`, "success");
      
      // Refresh page data to reflect the changes in tabs
      await fetchData();
    } catch (err) {
      console.error("Error updating PO:", err);
      addToast("Failed to save received quantities: " + err.message, "error");
    } finally {
      setSavingPoId(null);
    }
  };

  // Filter data by selected global shop name
  const shopFilteredData = useMemo(() => {
    if (selectedShop === "All") return data;
    return data.filter(po => po.shop_name === selectedShop);
  }, [data, selectedShop]);

  // Map and categorize purchase orders based on their DB snapshot products
  const poRecords = useMemo(() => {
    return shopFilteredData.map(po => {
      const products = getPoItemsData(po);
      const pendingProducts = products.filter(p => p.dbReceivedQty !== p.orderQty);
      const historyProducts = products.filter(p => p.dbReceivedQty === p.orderQty);

      return {
        po,
        products,
        pendingProducts,
        historyProducts
      };
    }).filter(record => record.products.length > 0); // Only process POs that actually have products
  }, [shopFilteredData, itemsData]);

  // Filter records based on search query
  const filteredRecords = poRecords.filter(record => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      record.po.po_number?.toLowerCase().includes(query) ||
      record.po.vendor_name?.toLowerCase().includes(query) ||
      record.po.shop_name?.toLowerCase().includes(query)
    );
  });

  // Calculate totals and tab counts
  const pendingTabRecords = filteredRecords.filter(record => record.pendingProducts.length > 0);
  const historyTabRecords = filteredRecords.filter(record => record.historyProducts.length > 0);

  const pendingCount = poRecords.filter(record => record.pendingProducts.length > 0).length;
  const historyCount = poRecords.filter(record => record.historyProducts.length > 0).length;

  // Active records to display based on selected tab
  const activeRecords = activeTab === "pending" ? pendingTabRecords : historyTabRecords;

  // Helper to generate the difference badge
  const renderDiffBadge = (diff) => {
    if (diff === 0) {
      return (
        <span className="discrepancy-badge match">
          <Check size={12} /> Perfect Match
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="discrepancy-badge shortage">
          <TrendingDown size={12} /> {diff} Bottles
        </span>
      );
    }
    return (
      <span className="discrepancy-badge surplus">
        <TrendingUp size={12} /> +{diff} Bottles
      </span>
    );
  };

  return (
    <div className="page-container">
      <div className="receiving-container">
        <h1>Receiving Verification</h1>
        <p className="page-description">
          Audit and manage incoming purchase order inventory. Easily log received quantities, verify item matches, and track discrepancies.
        </p>

        {/* Controls and Tabs Row */}
        <div className="receiving-controls-header">
          {/* Dual Tabs */}
          <div className="receiving-tabs">
            <button 
              className={`receiving-tab-btn ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              <span>Pending Deliveries</span>
              <span className="tab-badge">{pendingCount}</span>
            </button>
            <button 
              className={`receiving-tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <span>History Logs</span>
              <span className="tab-badge">{historyCount}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search PO number or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div>Loading purchase orders...</div>
          </div>
        ) : activeRecords.length === 0 ? (
          /* Premium Graceful Empty State */
          <div className="illustrated-empty-state">
            <div className="empty-state-icon-container">
              {activeTab === "pending" ? <CheckCircle2 size={32} style={{ color: "#10b981" }} /> : <Inbox size={32} />}
            </div>
            <h3 className="empty-state-title">
              {activeTab === "pending" 
                ? "All Deliveries Fully Verified" 
                : "No History Records Found"}
            </h3>
            <p className="empty-state-desc">
              {activeTab === "pending"
                ? "Perfect! There are currently no purchase orders with pending discrepancy shortages."
                : "No fully verified logs are available. Verify pending purchase orders to add logs to history."}
            </p>
          </div>
        ) : (
          /* Cards List */
          activeRecords.map(({ po, products, pendingProducts, historyProducts }) => {
            const isExpanded = !!expandedPoIds[po.id];
            
            // Choose items to render in list based on active tab
            const targetProducts = activeTab === "pending" ? pendingProducts : historyProducts;

            // Calculate PO Meta totals
            const totalOrderQty = products.reduce((sum, p) => sum + p.orderQty, 0);
            const totalReceivedQty = products.reduce((sum, p) => {
              const displayVal = editingQtys[po.id]?.[p.id] !== undefined ? editingQtys[po.id][p.id] : p.dbReceivedQty;
              return sum + (displayVal === "" ? 0 : Number(displayVal));
            }, 0);
            const difference = totalReceivedQty - totalOrderQty;

            const finalPdfUrl = po.receiver_pdf_url || po.trader_pdf_url;
            const formattedDate = new Date(po.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            });

            return (
              <div key={po.id} className={`po-card ${isExpanded ? "expanded" : ""}`}>
                {/* Header Section (Always Visible) */}
                <div className="po-card-header" onClick={() => toggleExpand(po.id)}>
                  <div className="po-header-main">
                    <span className="po-number-badge">
                      <Package size={20} style={{ color: "#4f46e5" }} />
                      {po.po_number}
                    </span>
                    <span className="po-vendor">{po.vendor_name}</span>
                  </div>

                  {/* Desktop Meta Stats */}
                  <div className="po-meta-grid">
                    <div className="po-meta-item">
                      <span className="po-meta-label">PO Date</span>
                      <span className="po-meta-value">{formattedDate}</span>
                    </div>
                    <div className="po-meta-item">
                      <span className="po-meta-label">Shop Name</span>
                      <span className="po-meta-value" style={{ fontWeight: '600', color: '#4f46e5' }}>{po.shop_name || "Unknown"}</span>
                    </div>
                    <div className="po-meta-item">
                      <span className="po-meta-label">Total Ordered</span>
                      <span className="po-meta-value">{totalOrderQty} Qty</span>
                    </div>
                    <div className="po-meta-item">
                      <span className="po-meta-label">Total Received</span>
                      <span className="po-meta-value" style={{ color: totalReceivedQty === totalOrderQty ? "#059669" : "#4f46e5" }}>
                        {totalReceivedQty} Qty
                      </span>
                    </div>
                    <div className="po-meta-item">
                      <span className="po-meta-label">Discrepancy</span>
                      {renderDiffBadge(difference)}
                    </div>
                    {finalPdfUrl && (
                      <div className="po-meta-item" onClick={(e) => e.stopPropagation()}>
                        <a href={finalPdfUrl} target="_blank" rel="noopener noreferrer" className="po-doc-link">
                          <FileText size={14} /> PDF
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Dropdown toggle Chevron */}
                  <button className="po-toggle-btn">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Expanded Details Pane (Loads dynamically only when isExpanded is active) */}
                {isExpanded && (
                  <div className="po-card-body">
                    <div className="products-table-wrapper">
                      <table className="products-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                            <th>Shop Name</th>
                            <th>Item Name</th>
                            <th>Brand</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Closing Stock</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Ordered Bottles</th>
                            <th style={{ width: '280px', textAlign: 'center' }}>Received Bottles</th>
                            <th style={{ width: '180px', textAlign: 'center' }}>Difference Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {targetProducts.map((p, idx) => {
                            const displayVal = editingQtys[po.id]?.[p.id] !== undefined ? editingQtys[po.id][p.id] : p.dbReceivedQty;
                            const activeVal = displayVal === "" ? 0 : Number(displayVal);
                            const diff = activeVal - p.orderQty;

                            return (
                              <tr key={p.id}>
                                <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: '500' }}>{idx + 1}</td>
                                <td style={{ fontWeight: '600', color: '#475569' }}>{po.shop_name || "Unknown"}</td>
                                <td style={{ fontWeight: '600', color: '#1e293b' }}>{p.itemName}</td>
                                <td style={{ color: '#64748b' }}>{p.brandName}</td>
                                <td style={{ textAlign: 'center', color: '#475569' }}>{p.closingQty}</td>
                                <td style={{ textAlign: 'center', fontWeight: '600' }}>{p.orderQty}</td>
                                <td style={{ textAlign: 'center' }}>
                                  {activeTab === "pending" ? (
                                    /* Interactive edit counters for Pending view */
                                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                      <div className="qty-counter-group">
                                        <button 
                                          type="button" 
                                          className="qty-counter-btn"
                                          disabled={activeVal <= 0}
                                          onClick={() => handleDecrement(po.id, p.id, displayVal)}
                                        >
                                          −
                                        </button>
                                        <input 
                                          type="number" 
                                          min="0"
                                          className="qty-counter-input"
                                          value={displayVal}
                                          onChange={(e) => handleQtyChange(po.id, p.id, e.target.value)}
                                        />
                                        <button 
                                          type="button" 
                                          className="qty-counter-btn"
                                          onClick={() => handleIncrement(po.id, p.id, displayVal)}
                                        >
                                          +
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        className="btn-inline-match"
                                        onClick={() => handleMatchProduct(po.id, p.id, p.orderQty)}
                                        disabled={activeVal === p.orderQty}
                                        title="Quick match to ordered quantity"
                                      >
                                        Match
                                      </button>
                                    </div>
                                  ) : (
                                    /* Static green badge for read-only completed History products */
                                    <span style={{ fontWeight: '600', color: '#059669', backgroundColor: '#ecfdf5', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                      {p.dbReceivedQty} Bottles
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {renderDiffBadge(diff)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Controls inside card */}
                    {activeTab === "pending" && (
                      <div className="expanded-footer">
                        {/* Remarks Form Area */}
                        <div className="remarks-form-group">
                          <label className="remarks-label" htmlFor={`remarks-${po.id}`}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MessageSquare size={14} /> Remarks & Shortage Logs (Optional)
                            </div>
                          </label>
                          <textarea
                            id={`remarks-${po.id}`}
                            className="remarks-textarea"
                            rows={1}
                            placeholder="Provide notes on damages, shortage details, or transportation delays..."
                            value={editingRemarks[po.id] !== undefined ? editingRemarks[po.id] : (po.receiver_remarks || "")}
                            onChange={(e) => handleRemarksChange(po.id, e.target.value)}
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="actions-row">
                          <button 
                            type="button" 
                            className="btn-match-all"
                            onClick={() => handleMatchAllForPo(po, pendingProducts)}
                          >
                            ⚡ Match All Pending
                          </button>
                          <button 
                            type="button" 
                            className="btn-save-po"
                            disabled={savingPoId === po.id}
                            onClick={() => handleSavePo(po, products)}
                          >
                            <Save size={16} />
                            {savingPoId === po.id ? "Saving..." : "Save Quantities"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Read-only remarks for History Logs */}
                    {activeTab === "history" && po.receiver_remarks && (
                      <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '12px', fontSize: '0.85rem', color: '#475569' }}>
                        <MessageSquare size={16} style={{ color: '#64748b', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong style={{ color: '#1e293b' }}>Receiver Remarks:</strong> {po.receiver_remarks}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Toast Notification Container */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Receiving;
