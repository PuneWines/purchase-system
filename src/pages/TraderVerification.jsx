import React, { useState, useEffect, useMemo } from "react";
import Table from "../components/Table";
import { supabase } from "../../utils/supabase";
import { FileText } from "lucide-react";
import useShopStore from "../store/useShopStore";
import "../styles/Pages.css";

const TraderVerification = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const { selectedShop } = useShopStore();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: poData, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (poData) {
        // Collect all unique indent_ids from the POs
        const uniqueIndentIds = [...new Set(poData.map(po => po.indent_id).filter(Boolean))];

        // Fetch only the indent_items and approved_indent_items rows that match these unique_indent_ids
        let items = [];
        if (uniqueIndentIds.length > 0) {
          const [resItems, resApproved] = await Promise.all([
            supabase.from("indent_items").select("indent_id, unique_indent_id").in("unique_indent_id", uniqueIndentIds),
            supabase.from("approved_indent_items").select("indent_id, unique_indent_id").in("unique_indent_id", uniqueIndentIds)
          ]);
          items = [...(resItems.data || []), ...(resApproved.data || [])];
        }

        // Build map: unique_indent_id (text) → indent_id (UUID)
        const itemMap = (items || []).reduce((acc, item) => {
          if (item.unique_indent_id && item.indent_id) {
            acc[item.unique_indent_id] = item.indent_id;
          }
          return acc;
        }, {});

        // Collect the parent indent UUIDs we actually need
        const parentIndentIds = [...new Set(Object.values(itemMap))];

        // Fetch only the indents we need
        const { data: indents } = parentIndentIds.length > 0
          ? await supabase
              .from("indents")
              .select("id, shop_name")
              .in("id", parentIndentIds)
          : { data: [] };

        const indentMap = (indents || []).reduce((acc, ind) => {
          acc[ind.id] = ind.shop_name;
          return acc;
        }, {});

        const formatted = poData.map(item => {
          let totalReceivedQty = 0;
          if (item.received_items && typeof item.received_items === 'object') {
            totalReceivedQty = Object.values(item.received_items).reduce((sum, currentItem) => sum + (Number(currentItem.receivedQty) || 0), 0);
          }
          const diff = item.receiver_status === 'yes' ? totalReceivedQty - (Number(item.total_order_qty) || 0) : null;
          
          // Prefer the shop_name stored directly on the PO (set at creation time).
          // Fall back to the indent_items → indents join for older records that
          // were created before shop_name was persisted on the PO.
          let shopName = item.shop_name || null;
          if (!shopName) {
            const parentIndentId = itemMap[item.indent_id];
            shopName = parentIndentId ? (indentMap[parentIndentId] || "Unknown") : "Unknown";
          }

          return {
            ...item,
            shop_name: shopName,
            formattedDate: new Date(item.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            }),
            totalReceivedQty: item.receiver_status === 'yes' ? totalReceivedQty : "N/A",
            qtyDifference: diff,
            total_items: Array.isArray(item.po_items) ? item.po_items.length : 0
          };
        });
        setData(formatted);
      } else if (error) {
        console.error("Error fetching POs:", error);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const columns = useMemo(() => {
    const baseColumns = [
      { key: "po_number", label: "PO Number", sortable: true },
      { 
        key: "created_at", 
        label: "PO Created Date", 
        sortable: true,
        render: (date) => date ? new Date(date).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true
        }) : <span style={{ color: "#94a3b8" }}>—</span>
      },
      { key: "shop_name", label: "Shop Name", sortable: true },
      { key: "vendor_name", label: "Vendor Name", sortable: true },
      { key: "total_items", label: "Total Items", sortable: true },
      { key: "total_order_qty", label: "Total Order Qty (Bottles)", sortable: true },
      { key: "total_order_box", label: "Total Order Box", sortable: true },
      {
        key: "trader_item_statuses",
        label: "Item Approvals",
        sortable: false,
        render: (statuses) => {
          if (!statuses || typeof statuses !== 'object' || Object.keys(statuses).length === 0) {
            return <span style={{ color: "#94a3b8" }}>—</span>;
          }
          const values = Object.values(statuses);
          const approvedCount = values.filter(v => v === 'approved').length;
          const rejectedCount = values.filter(v => v === 'rejected').length;
          return (
            <span style={{ fontWeight: "600", fontSize: "13px" }}>
              {approvedCount > 0 && <span style={{ color: "#16a34a" }}>{approvedCount} ✅ </span>}
              {rejectedCount > 0 && <span style={{ color: "#dc2626" }}>{rejectedCount} ❌</span>}
            </span>
          );
        }
      },
      {
        key: "trader_pdf_url",
        label: "Trader PDF",
        sortable: false,
        render: (url) => url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0052cc', textDecoration: 'none', fontWeight: 600 }}>
            <FileText size={16} /> View Trader
          </a>
        ) : <span style={{ color: '#94a3b8' }}>N/A</span>
      },
      { 
        key: "trader_status", 
        label: "Trader Status", 
        sortable: true,
        render: (status) => {
          if (status === "yes") return <span style={{ color: "#16a34a", fontWeight: "600" }}>Approved</span>;
          if (status === "no") return <span style={{ color: "#dc2626", fontWeight: "600" }}>Rejected</span>;
          return <span style={{ color: "#eab308", fontWeight: "600" }}>Pending</span>;
        }
      },
      { 
        key: "dispatch_date", 
        label: "Dispatch Date & Time", 
        sortable: true,
        render: (date, row) => {
          if (row.trader_status === "no") return <span style={{ color: "#94a3b8" }}>—</span>;
          return date ? new Date(date).toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true
          }) : <span style={{ color: "#94a3b8" }}>—</span>;
        }
      },
      { key: "remarks", label: "Trader Remarks", sortable: false }
    ];

    if (activeTab === "history") {
      const idx = baseColumns.findIndex(col => col.key === "trader_status");
      baseColumns.splice(idx + 1, 0, {
        key: "submission_time",
        label: "Submission Time",
        sortable: true,
        render: (_, row) => {
          const date = row.dispatch_date;
          return date ? new Date(date).toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true
          }) : <span style={{ color: "#94a3b8" }}>—</span>;
        }
      });
    }

    return baseColumns;
  }, [activeTab]);

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedShop !== "All") {
      result = result.filter(item => item.shop_name === selectedShop);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.created_at) <= end);
    }

    return result;
  }, [data, selectedShop, startDate, endDate]);

  const pendingData = useMemo(() => {
    return filteredData.filter(item => item.trader_status !== "yes" && item.trader_status !== "no");
  }, [filteredData]);

  const historyData = useMemo(() => {
    return filteredData.filter(item => item.trader_status === "yes" || item.trader_status === "no");
  }, [filteredData]);

  const currentTabData = activeTab === "pending" ? pendingData : historyData;

  return (
    <div className="page-container">
      <h1>Trader Verification</h1>
      <p className="page-description">
        View and verify purchase orders for trader approvals.
      </p>

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
          Pending ({pendingData.length})
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
          History ({historyData.length})
        </button>
      </div>
      
      {/* Date Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '24px',
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        width: 'fit-content'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1e293b',
              outline: 'none',
              fontWeight: '500'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
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
              padding: '6px 12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
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

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading records...</div>
      ) : (
        <Table
          data={currentTabData}
          columns={columns}
          title={activeTab === 'pending' ? "Pending Trader Approvals" : "Trader Approvals History"}
          searchableColumns={["po_number", "shop_name", "vendor_name", "total_items"]}
          showHeader={false}
        />
      )}
    </div>
  );
};

export default TraderVerification;
