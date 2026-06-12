import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useShopStore from "../store/useShopStore";
import "../styles/Pages.css";
import { supabase } from "../../utils/supabase";
import { Loader2, Archive, X, Eye, Search, Trash2 } from "lucide-react";

const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

const Approval = () => {
  const [groupedApprovals, setGroupedApprovals] = useState({});
  const [selectedIndentId, setSelectedIndentId] = useState(null);
  const [indentStatuses, setIndentStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(false); // start as false to avoid layout flicker on cache hit
  const [activeTab, setActiveTab] = useState("pending");
  const { selectedShop } = useShopStore();
  const [showExcludedModal, setShowExcludedModal] = useState(false);
  const [excludedSearchQuery, setExcludedSearchQuery] = useState("");
  const [originalIndentItems, setOriginalIndentItems] = useState([]);
  const [originalStatuses, setOriginalStatuses] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const modalItems = selectedIndentId ? (groupedApprovals[selectedIndentId] || []) : [];
  const activeBatchItems = modalItems.filter(item => !item.is_excluded);
  const approvedCount = activeBatchItems.filter(item => indentStatuses[item.id] === 'approved').length;
  const rejectedCount = activeBatchItems.filter(item => indentStatuses[item.id] === 'rejected').length;
  const pendingCount = activeBatchItems.filter(item => !indentStatuses[item.id] || indentStatuses[item.id] === 'pending').length;

  useEffect(() => {
    if (!selectedIndentId) {
      setShowExcludedModal(false);
      setExcludedSearchQuery("");
    }
  }, [selectedIndentId]);

  const handleStatusChange = (itemId, status) => {
    if (status === 'approved' && indentStatuses[itemId] !== 'approved') {
      // Automatically apply 'approved' to all non-excluded items in the current modal
      setIndentStatuses(prev => {
        const currentItems = groupedApprovals[selectedIndentId] || [];
        const newStatuses = { ...prev };
        currentItems.forEach((item, idx) => {
          const id = item.id || idx;
          if (!item.is_excluded) {
            newStatuses[id] = 'approved';
          }
        });
        return newStatuses;
      });
    } else {
      // Manual toggle for unchecking approve, or any reject action
      setIndentStatuses(prev => ({
        ...prev,
        [itemId]: prev[itemId] === status ? null : status
      }));
    }
  };

  const handleIncludeExcludedItem = (itemId) => {
    setGroupedApprovals(prev => {
      const updated = { ...prev };
      const currentItems = updated[selectedIndentId] || [];
      const itemIndex = currentItems.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const item = { ...currentItems[itemIndex] };
        item.is_excluded = false;
        // Automatically default restored items to approved status
        setIndentStatuses(prevStatuses => ({
          ...prevStatuses,
          [itemId]: 'approved'
        }));
        currentItems[itemIndex] = item;
      }
      return updated;
    });
  };

  const handleDeleteBatch = async (groupKey, items) => {
    const displayLabel = groupKey.includes('::') ? groupKey.split('::')[1] : groupKey;
    const confirmMsg = `Are you sure you want to permanently delete all ${items.length} items in batch ${displayLabel}? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsLoading(true);
      const ids = items.map(item => item.id);
      const { error } = await supabase
        .from("indent_items")
        .delete()
        .in("id", ids);

      if (error) throw error;

      alert(`Batch ${displayLabel} successfully deleted!`);
      
      // Update local state by removing the deleted group
      setGroupedApprovals(prev => {
        const updated = { ...prev };
        delete updated[groupKey];
        return updated;
      });
    } catch (error) {
      console.error("Error deleting batch:", error);
      alert("Failed to delete batch.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    const confirmMsg = `Are you sure you want to permanently delete item "${itemName}"? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("indent_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      alert(`Item "${itemName}" successfully deleted!`);

      // Update groupedApprovals state
      setGroupedApprovals(prev => {
        const updated = { ...prev };
        const currentItems = updated[selectedIndentId] || [];
        const filteredItems = currentItems.filter(item => item.id !== itemId);
        
        if (filteredItems.length === 0) {
          // If no items left in batch, remove the entire batch key and close the modal
          delete updated[selectedIndentId];
          setSelectedIndentId(null);
        } else {
          updated[selectedIndentId] = filteredItems;
        }
        return updated;
      });

      // Update originalIndentItems snapshot to keep rollback consistent
      setOriginalIndentItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleOpenIndent = (indentId) => {
    setSelectedIndentId(indentId);
    const items = groupedApprovals[indentId] || [];
    // Deep copy items array to preserve pre-edited values for a perfect rollback
    const snapshot = items.map(item => ({ ...item }));
    setOriginalIndentItems(snapshot);
    
    // Backup current approval states for these items
    const statusSnapshot = {};
    items.forEach(item => {
      statusSnapshot[item.id] = indentStatuses[item.id] || null;
    });
    setOriginalStatuses(statusSnapshot);
  };

  const handleCloseIndent = () => {
    if (selectedIndentId && originalIndentItems.length > 0) {
      // Revert in-memory items back to original values
      setGroupedApprovals(prev => ({
        ...prev,
        [selectedIndentId]: originalIndentItems
      }));
    }
    if (originalStatuses) {
      // Revert statuses back to pre-edit state
      setIndentStatuses(prev => ({
        ...prev,
        ...originalStatuses
      }));
    }
    
    // Reset snapshots
    setOriginalIndentItems([]);
    setOriginalStatuses(null);
    setSelectedIndentId(null);
  };

  const handleInlineChange = (itemId, field, value) => {
    setGroupedApprovals(prev => {
      const updated = { ...prev };
      const currentItems = updated[selectedIndentId] || [];
      const itemIndex = currentItems.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const item = { ...currentItems[itemIndex] };
        let numVal = value === "" ? null : parseFloat(value);
        item[field] = numVal;

        const bcs = parseFloat(item.bcs) || 0;
        if (bcs > 0) {
          if (field === 'order_box' && numVal !== null) {
            item.order_qty = parseFloat((numVal * bcs).toFixed(2));
          } else if (field === 'order_qty' && numVal !== null) {
            item.order_box = parseFloat((numVal / bcs).toFixed(2));
          }
        }
        currentItems[itemIndex] = item;
      }
      return updated;
    });
  };

  const inlineInputStyle = {
    width: '100%',
    minWidth: '70px',
    padding: '6px 8px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    fontWeight: '700',
    color: '#4338ca',
    textAlign: 'right'
  };
  const queryClient = useQueryClient();

  const { data: approvalsDataResponse, isLoading: isApprovalsQueryLoading } = useQuery({
    queryKey: ["approvalsData", selectedShop],
    queryFn: async () => {
      const pageSize = 1000;
      const totalPages = 10; // covers up to 10,000 pending items in parallel

      // 1. Fetch pending indent items in parallel pages
      const indentPageQueries = Array.from({ length: totalPages }, (_, page) => {
        if (selectedShop !== "All") {
          return supabase
            .from("indent_items")
            .select("*, indents!inner(shop_name)")
            .eq("indents.shop_name", selectedShop)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);
        } else {
          return supabase
            .from("indent_items")
            .select("*, indents(shop_name)")
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);
        }
      });

      // 2. Fetch approved indent items (history)
      let approvedQuery;
      if (selectedShop !== "All") {
        approvedQuery = supabase
          .from("approved_indent_items")
          .select("*, indents!inner(shop_name)")
          .eq("indents.shop_name", selectedShop)
          .order("created_at", { ascending: false })
          .limit(300);
      } else {
        approvedQuery = supabase
          .from("approved_indent_items")
          .select("*, indents(shop_name)")
          .order("created_at", { ascending: false })
          .limit(300);
      }

      const [approvedResult, ...indentResults] = await Promise.all([
        approvedQuery,
        ...indentPageQueries
      ]);

      if (approvedResult.error) throw approvedResult.error;

      let rawIndentItems = [];
      indentResults.forEach(({ data, error }) => {
        if (error) throw error;
        if (data) {
          rawIndentItems = [...rawIndentItems, ...data];
        }
      });

      return {
        rawIndentItems,
        rawApprovedIndentItems: approvedResult.data || []
      };
    }
  });

  // Sync React Query data to local state for seamless backwards compatibility
  useEffect(() => {
    if (approvalsDataResponse) {
      const enrichedIndentItems = (approvalsDataResponse.rawIndentItems || []).map(item => ({
        ...item,
        shop_name: item.indents?.shop_name || "Unknown"
      }));

      const enrichedApprovedItems = (approvalsDataResponse.rawApprovedIndentItems || []).map(item => ({
        ...item,
        approval_status: "approved",
        is_excluded: false,
        shop_name: item.indents?.shop_name || "Unknown"
      }));

      // Combine both lists
      const combinedItems = [...enrichedIndentItems, ...enrichedApprovedItems];

      // Group by base party_indent_id scoped to the parent indent UUID.
      const grouped = combinedItems.reduce((acc, item) => {
        const fullId = item.party_indent_id || "Unknown";
        const parts = fullId.split('-');
        let basePartyId = fullId;
        if (parts.length >= 2 && fullId !== "Unknown") {
          basePartyId = `${parts[0]}-${parts[1]}`;
        }
        const groupKey = `${item.indent_id ?? 'no-indent'}::${basePartyId}`;
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
      }, {});

      setGroupedApprovals(grouped);
      
      // Pre-fill existing statuses if they exist in DB
      const initialStatuses = {};
      combinedItems.forEach(item => {
        if (item.approval_status && item.approval_status !== 'pending') {
          initialStatuses[item.id] = item.approval_status;
        }
      });
      setIndentStatuses(prev => ({ ...prev, ...initialStatuses }));
    }
  }, [approvalsDataResponse]);

  const showLoadingScreen = isLoading || isApprovalsQueryLoading;

  // Keep fetchApprovals as a wrapper that triggers React Query cache invalidation
  const fetchApprovals = async () => {
    setIsLoading(true);
    await queryClient.invalidateQueries({ queryKey: ["approvalsData"] });
    setIsLoading(false);
  };

  const handleSubmitApprovals = async () => {
    if (!selectedIndentId) return;
    
    try {
      setIsLoading(true);
      const currentItems = groupedApprovals[selectedIndentId] || [];
      
      if (currentItems.length === 0) {
        alert("No items in this batch to submit.");
        setIsLoading(false);
        return;
      }

      const approvedItemsPayload = [];
      const idsToDelete = [];
      let parentIndentId = null;
      let hasAnyApproved = false;

      currentItems.forEach(item => {
        idsToDelete.push(item.id);
        if (!parentIndentId && item.indent_id) {
          parentIndentId = item.indent_id;
        }

        const status = indentStatuses[item.id] || 'pending';
        let processedBox = parseFloat(item.order_box) || 0;
        let processedQty = parseFloat(item.order_qty) || 0;

        if (status === 'approved' && !item.is_excluded) {
          hasAnyApproved = true;
          if (processedBox >= 0.90) {
            if (processedBox < 1.0) {
              processedBox = 1;
            } else {
              processedBox = Math.floor(processedBox);
            }
            const bcs = parseFloat(item.bcs) || 0;
            processedQty = bcs > 0 ? processedBox * bcs : processedQty;
          }

          approvedItemsPayload.push({
            original_item_id: item.id,
            indent_id: item.indent_id,
            party_indent_id: item.party_indent_id,
            item_name: item.item_name,
            brand_name: item.brand_name,
            bcs: item.bcs,
            mls: item.mls,
            liquor_type: item.liquor_type,
            party_name: item.party_name,
            qty_out: item.qty_out,
            closing_qty: item.closing_qty,
            last_month_sale_box: item.last_month_sale_box,
            per_day_sale_last_month: item.per_day_sale_last_month,
            threshold_sale: item.threshold_sale,
            closing_qty_box: item.closing_qty_box,
            order_box: processedBox,
            order_qty: processedQty,
            unique_indent_id: selectedIndentId,
            po_status: 'pending'
          });
        }
      });

      // 1. Insert approved items into approved_indent_items
      if (approvedItemsPayload.length > 0) {
        const { error: insertErr } = await supabase
          .from("approved_indent_items")
          .insert(approvedItemsPayload);
        if (insertErr) throw insertErr;
      }

      // 2. Update parent indent status
      if (parentIndentId) {
        const { error: indentErr } = await supabase
          .from("indents")
          .update({ status: hasAnyApproved ? "Approved" : "Rejected" })
          .eq("id", parentIndentId);
        if (indentErr) throw indentErr;
      }

      // 3. Delete all items in this batch from indent_items
      const { error: deleteErr } = await supabase
        .from("indent_items")
        .delete()
        .in("id", idsToDelete);
      if (deleteErr) throw deleteErr;

      alert("Successfully submitted approvals and deleted batch from pending storage!");
      setOriginalIndentItems([]);
      setOriginalStatuses(null);
      setSelectedIndentId(null);
      fetchApprovals();
    } catch (error) {
      console.error("Error submitting approvals:", error);
      alert("Failed to submit approvals: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // React Query handles loading on mount automatically, fetchApprovals is only needed for manual action refreshes

  const calculateTotalOrderBox = (items) => {
    return items.reduce((sum, item) => sum + (parseFloat(item.order_box) || 0), 0).toFixed(2);
  };

  const calculateTotalOrderQty = (items) => {
    return items.reduce((sum, item) => sum + (parseFloat(item.order_qty) || 0), 0).toFixed(2);
  };

  const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#1e293b',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: '500'
  };

  const checkDateRange = (createdAt) => {
    if (!createdAt) return true;
    const date = new Date(createdAt);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    return true;
  };

  const checkSearchQuery = (groupKey, items) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    
    // Match Indent Display Label / ID
    const indentDisplayLabel = groupKey.includes('::') ? groupKey.split('::')[1] : groupKey;
    if (indentDisplayLabel.toLowerCase().includes(q)) return true;
    
    // Match Shop Name
    const shopName = items[0]?.shop_name || "";
    if (shopName.toLowerCase().includes(q)) return true;
    
    // Match Party Name
    const partyName = items[0]?.party_name || "";
    if (partyName.toLowerCase().includes(q)) return true;
    
    return false;
  };

  const pendingBatches = Object.entries(groupedApprovals).filter(([baseId, items]) => {
    const shopOk = selectedShop === "All" || (items[0]?.shop_name === selectedShop);
    const dateOk = checkDateRange(items[0]?.created_at);
    const searchOk = checkSearchQuery(baseId, items);
    // Ignore excluded items when determining pending status
    return shopOk && dateOk && searchOk && items.some(item => !item.is_excluded && (!item.approval_status || item.approval_status === 'pending'));
  });

  const historyBatches = Object.entries(groupedApprovals).filter(([baseId, items]) => {
    const shopOk = selectedShop === "All" || (items[0]?.shop_name === selectedShop);
    const dateOk = checkDateRange(items[0]?.created_at);
    const searchOk = checkSearchQuery(baseId, items);
    // Determine history based on all active (non-excluded) items
    const activeItems = items.filter(item => !item.is_excluded);
    return shopOk && dateOk && searchOk && activeItems.length > 0 && activeItems.every(item => item.approval_status && item.approval_status !== 'pending');
  });

  const displayedBatches = activeTab === "pending" ? pendingBatches : historyBatches;

  return (
    <div className="page-container" style={{ padding: '20px', maxWidth: '100%', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
          Approval Batches
        </h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '15px' }}>
          Review indent submissions batched by Indent ID
        </p>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2px solid #4f46e5' : '2px solid transparent',
            color: activeTab === 'pending' ? '#4f46e5' : '#64748b',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Pending ({pendingBatches.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #4f46e5' : '2px solid transparent',
            color: activeTab === 'history' ? '#4f46e5' : '#64748b',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          History ({historyBatches.length})
        </button>
      </div>

      {/* Controls: Search & Date Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '260px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex', alignItems: 'center' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by Indent ID, Shop Name or Party Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#1e293b',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
              fontWeight: '500'
            }}
            onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1e293b',
                outline: 'none',
                fontWeight: '500'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1e293b',
                outline: 'none',
                fontWeight: '500'
              }}
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            >
              Clear Dates
            </button>
          )}
        </div>
      </div>

      {showLoadingScreen ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#94a3b8' }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite', width: '40px', height: '40px', marginBottom: '16px' }} />
          <p>Loading batched data from Supabase...</p>
        </div>
      ) : displayedBatches.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          <Archive style={{ width: '48px', height: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: '500', color: '#475569' }}>
            {activeTab === 'pending' ? "No pending indent items found" : "No history found"}
          </p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>
            {activeTab === 'pending' ? "Upload and submit a CSV on the Indent page to see data here." : "Submit some approvals to see them in history."}
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
                  <th style={thStyle}>Indent ID</th>
                  <th style={thStyle}>Shop Name</th>
                  {activeTab === 'history' && <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>}
                  <th style={thStyle}>Party Name</th>
                  <th style={thStyle}>{activeTab === 'pending' ? 'Created At' : 'Approved At'}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Order Qty</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Order Box</th>
                </tr>
              </thead>
              <tbody>
                {displayedBatches.map(([groupKey, items], index) => {
                  // Extract the human-readable label (e.g. "IN-1") from the scoped key
                  const indentDisplayLabel = groupKey.includes('::') ? groupKey.split('::')[1] : groupKey;
                  return (
                  <tr 
                     key={groupKey} 
                     style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', cursor: 'pointer', transition: 'background-color 0.2s' }} 
                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} 
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}
                     onClick={() => handleOpenIndent(groupKey)}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleOpenIndent(groupKey)}
                          style={{
                            position: 'relative',
                            background: '#e0e7ff', // Soft indigo background
                            border: 'none',
                            color: '#4338ca', // Darker indigo text
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c7d2fe'} // Slightly darker soft indigo on hover
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
                          title={activeTab === 'pending' ? "Update items" : "View items"}
                        >
                          {activeTab === 'pending' ? 'Update' : 'View'}
                          {activeTab === 'pending' && (
                            <span style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              backgroundColor: '#fee2e2', // Soft red/pink background
                              color: '#dc2626', // Darker red text
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              border: '1px solid #fca5a5' // Subtle border for definition
                            }}>
                              {items.filter(item => !item.is_excluded).length}
                            </span>
                          )}
                        </button>
                        <button 
                          onClick={() => handleDeleteBatch(groupKey, items)}
                          style={{
                            background: '#fee2e2', // Soft red background
                            border: 'none',
                            color: '#dc2626', // Dark red text
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px',
                            borderRadius: '6px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fca5a5'} // Slightly darker soft red on hover
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                          title="Delete entire batch"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: '#4338ca', fontWeight: '600' }}>{indentDisplayLabel}</td>
                    <td style={tdStyle}>{items[0]?.shop_name || "-"}</td>
                    {activeTab === 'history' && (
                      <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: '600', fontSize: '12px' }} title="Approved">
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 0 2px #dcfce7' }}></span>
                            {items.filter(i => !i.is_excluded && indentStatuses[i.id] === 'approved').length}
                          </div>
                          <div style={{ width: '1px', height: '14px', backgroundColor: '#e2e8f0' }}></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: '600', fontSize: '12px' }} title="Rejected">
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 0 2px #fee2e2' }}></span>
                            {items.filter(i => !i.is_excluded && indentStatuses[i.id] === 'rejected').length}
                          </div>
                        </div>
                      </td>
                    )}
                    <td style={tdStyle}>{items[0]?.party_name || "-"}</td>
                    <td style={tdStyle}>{formatDateTime(items[0]?.created_at)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calculateTotalOrderQty(items)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calculateTotalOrderBox(items)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedIndentId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                  Details for {selectedIndentId?.includes('::') ? selectedIndentId.split('::')[1] : selectedIndentId}
                </h2>
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Party: {groupedApprovals[selectedIndentId]?.[0]?.party_name || "Unknown"}</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></span>
                    <span style={{ color: '#16a34a', fontWeight: '600' }}>Approved: {approvedCount}</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></span>
                    <span style={{ color: '#dc2626', fontWeight: '600' }}>Rejected: {rejectedCount}</span>
                    {activeTab !== 'history' && (
                      <>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></span>
                        <span style={{ color: '#eab308', fontWeight: '600' }}>Unchecked: {pendingCount}</span>
                      </>
                    )}
                  </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {activeTab !== 'history' && (
                  <button
                    onClick={handleSubmitApprovals}
                    disabled={isLoading}
                    style={{
                      background: isLoading ? '#94a3b8' : '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 20px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#059669'; }}
                    onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#10b981'; }}
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    {isLoading ? 'Submitting...' : 'Submit'}
                  </button>
                )}
                {activeTab !== 'history' && groupedApprovals[selectedIndentId]?.some(item => item.is_excluded) && (
                  <button
                    onClick={() => setShowExcludedModal(true)}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 20px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                  >
                    View Excluded ({groupedApprovals[selectedIndentId]?.filter(item => item.is_excluded).length})
                  </button>
                )}
                <button 
                  onClick={handleCloseIndent}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Approve / Reject</th>
                      <th style={thStyle}>Indent ID</th>
                      <th style={thStyle}>Shop Name</th>
                      <th style={thStyle}>Item Name</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Per Day Sale</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Order Box</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Order Qty</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Closing Qty</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>B/Cs</th>
                      <th style={thStyle}>Mls</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedApprovals[selectedIndentId]?.filter(item => !item.is_excluded).map((item, index) => {
                      // Use nullish coalescing so a falsy but valid id (e.g. 0) is never
                      // replaced by the loop index, which would cause status key collisions.
                      const itemId = item.id ?? `fallback-${selectedIndentId}-${index}`;
                      return (
                      <tr key={itemId} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                        <td style={{ ...tdStyle, textAlign: 'center', minWidth: '160px' }}>
                          {activeTab === 'history' ? (
                            <span style={{ 
                              display: 'inline-block', 
                              padding: '4px 10px', 
                              borderRadius: '6px', 
                              fontSize: '12px', 
                              fontWeight: '600',
                              backgroundColor: indentStatuses[itemId] === 'approved' ? '#dcfce7' : '#fee2e2',
                              color: indentStatuses[itemId] === 'approved' ? '#16a34a' : '#dc2626'
                            }}>
                              {indentStatuses[itemId] === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: indentStatuses[itemId] === 'approved' ? '#16a34a' : '#64748b', fontWeight: '500', transition: 'all 0.2s', fontSize: '13px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={indentStatuses[itemId] === 'approved'} 
                                  onChange={() => handleStatusChange(itemId, 'approved')} 
                                  style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                                />
                                Approve
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: indentStatuses[itemId] === 'rejected' ? '#dc2626' : '#64748b', fontWeight: '500', transition: 'all 0.2s', fontSize: '13px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={indentStatuses[itemId] === 'rejected'} 
                                  onChange={() => handleStatusChange(itemId, 'rejected')} 
                                  style={{ width: '16px', height: '16px', accentColor: '#dc2626', cursor: 'pointer' }}
                                />
                                Reject
                              </label>
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: '#64748b' }}>{item.party_indent_id || "-"}</td>
                        <td style={tdStyle}>{item.shop_name || "-"}</td>
                        <td style={tdStyle}>{item.item_name}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                          {item.per_day_sale_last_month !== null && item.per_day_sale_last_month !== undefined ? item.per_day_sale_last_month : "—"}
                        </td>
                        <td style={{ ...tdStyle, padding: activeTab === 'history' ? '12px 16px' : '4px 8px' }}>
                          {activeTab === 'history' ? (
                            <span style={{ fontWeight: '700', color: '#4338ca' }}>{item.order_box || "-"}</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={item.order_box !== undefined && item.order_box !== null ? item.order_box : ""}
                              onChange={(e) => handleInlineChange(item.id, 'order_box', e.target.value)}
                              style={inlineInputStyle}
                              placeholder="-"
                            />
                          )}
                        </td>
                        <td style={{ ...tdStyle, padding: activeTab === 'history' ? '12px 16px' : '4px 8px' }}>
                          {activeTab === 'history' ? (
                            <span style={{ fontWeight: '700', color: '#4338ca' }}>{item.order_qty || "-"}</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={item.order_qty !== undefined && item.order_qty !== null ? item.order_qty : ""}
                              onChange={(e) => handleInlineChange(item.id, 'order_qty', e.target.value)}
                              style={inlineInputStyle}
                              placeholder="-"
                            />
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{item.closing_qty || "-"}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{item.bcs || "-"}</td>
                        <td style={tdStyle}>{item.mls || "-"}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.item_name)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '8px',
                              borderRadius: '6px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fca5a5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                            title="Delete item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              {/* Excluded Items Modal Overlay */}
              {showExcludedModal && (
                <div style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10005,
                  padding: '20px'
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '1000px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)'
                  }}>
                    <div style={{
                      padding: '20px 24px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>
                          Excluded Products for {selectedIndentId?.includes('::') ? selectedIndentId.split('::')[1] : selectedIndentId}
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                          These items were excluded due to negative or low indent calculations. Search and click "+ Include" to add them back.
                        </p>
                      </div>
                      <button 
                        onClick={() => { setShowExcludedModal(false); setExcludedSearchQuery(""); }}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: '50%',
                          width: '36px', height: '36px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#64748b',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Search Field */}
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          placeholder="Search excluded items by item name or brand..."
                          value={excludedSearchQuery}
                          onChange={(e) => setExcludedSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 36px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    {/* Table of Excluded Items */}
                    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#fef2f2' }}>
                              <th style={{ ...thStyle, textAlign: 'center', backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Action</th>
                              <th style={{ ...thStyle, backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Indent ID</th>
                              <th style={{ ...thStyle, backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Shop Name</th>
                              <th style={{ ...thStyle, backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Item Name</th>
                              <th style={{ ...thStyle, textAlign: 'right', backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Per Day Sale</th>
                              <th style={{ ...thStyle, textAlign: 'right', backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Order Box</th>
                              <th style={{ ...thStyle, textAlign: 'right', backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Order Qty</th>
                              <th style={{ ...thStyle, textAlign: 'right', backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Closing Qty</th>
                              <th style={{ ...thStyle, textAlign: 'right', backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>B/Cs</th>
                              <th style={{ ...thStyle, backgroundColor: '#fef2f2', color: '#991b1b', borderBottom: '2px solid #fca5a5' }}>Mls</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const query = (excludedSearchQuery || "").trim().toLowerCase();
                              const filteredItems = (groupedApprovals[selectedIndentId] || []).filter(item => {
                                if (!item.is_excluded) return false;
                                const itemName = (item.item_name || "").toLowerCase();
                                const brandName = (item.brand_name || "").toLowerCase();
                                return itemName.includes(query) || brandName.includes(query);
                              });

                              if (filteredItems.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                      No excluded items found matching your search.
                                    </td>
                                  </tr>
                                );
                              }

                              return filteredItems.map((item, index) => {
                                const itemId = item.id ?? `fallback-excl-${selectedIndentId}-${index}`;
                                return (
                                  <tr key={itemId} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#fff5f5' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fff5f5'}>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                      <button
                                        onClick={() => handleIncludeExcludedItem(itemId)}
                                        style={{
                                          backgroundColor: '#dc2626',
                                          color: '#ffffff',
                                          border: 'none',
                                          borderRadius: '6px',
                                          padding: '6px 12px',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                      >
                                        + Include
                                      </button>
                                    </td>
                                    <td style={{ ...tdStyle, color: '#991b1b' }}>{item.party_indent_id || "-"}</td>
                                    <td style={tdStyle}>{item.shop_name || "-"}</td>
                                    <td style={tdStyle}>{item.item_name}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                                      {item.per_day_sale_last_month !== null && item.per_day_sale_last_month !== undefined ? item.per_day_sale_last_month : "—"}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>{item.order_box || "-"}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>{item.order_qty || "-"}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.closing_qty || "-"}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.bcs || "-"}</td>
                                    <td style={tdStyle}>{item.mls || "-"}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approval;
