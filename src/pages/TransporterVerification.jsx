import React, { useState, useEffect, useMemo } from "react";
import Table from "../components/Table";
import { supabase } from "../../utils/supabase";
import { FileText } from "lucide-react";
import useShopStore from "../store/useShopStore";
import "../styles/Pages.css";

const TransporterVerification = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const { selectedShop } = useShopStore();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: poData, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (poData) {
        // Fetch indents, indent_items, and approved_indent_items to resolve shop_name
        const { data: indents } = await supabase.from("indents").select("id, shop_name");
        const [resItems, resApproved] = await Promise.all([
          supabase.from("indent_items").select("indent_id, unique_indent_id"),
          supabase.from("approved_indent_items").select("indent_id, unique_indent_id")
        ]);
        const items = [...(resItems.data || []), ...(resApproved.data || [])];

        const indentMap = (indents || []).reduce((acc, ind) => {
          acc[ind.id] = ind.shop_name;
          return acc;
        }, {});

        const itemMap = (items || []).reduce((acc, item) => {
          if (item.unique_indent_id && item.indent_id) {
            acc[item.unique_indent_id] = item.indent_id;
          }
          return acc;
        }, {});

        const formatted = poData.map(item => {
          let shopName = item.shop_name || null;
          if (!shopName) {
            const parentIndentId = itemMap[item.indent_id];
            shopName = parentIndentId ? (indentMap[parentIndentId] || "Unknown") : "Unknown";
          }

          let pickedUpCount = 0;
          if (item.transporter_status === "yes") {
            let delivered = item.delivered_items || {};
            if (typeof delivered === "string") {
              try {
                delivered = JSON.parse(delivered);
              } catch (e) {
                delivered = {};
              }
            }
            if (delivered && typeof delivered === "object") {
              pickedUpCount = Object.values(delivered).filter(
                val => val && Number(val.deliveredQty) > 0
              ).length;
            }
          }

          return {
            ...item,
            shop_name: shopName,
            pickedUpCount,
            formattedDate: new Date(item.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            })
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
      {
        key: "pickedUpCount",
        label: "Items Picked Up",
        sortable: true,
        render: (count, row) => {
          if (row.transporter_status === "yes") {
            return <span style={{ fontWeight: "600", color: "#16a34a" }}>{count}</span>;
          }
          if (row.transporter_status === "no") {
            return <span style={{ color: "#dc2626" }}>0</span>;
          }
          return <span style={{ color: "#94a3b8" }}>—</span>;
        }
      },
      { key: "transporter_number", label: "Transporter Contact", sortable: true },
      {
        key: "tp_number",
        label: "TP Number",
        sortable: true,
        render: (tp) => tp || <span style={{ color: "#94a3b8" }}>—</span>
      },
      {
        key: "trader_pdf_url",
        label: "PO PDF",
        sortable: false,
        render: (url) => url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0052cc', textDecoration: 'none', fontWeight: 600 }}>
            <FileText size={16} /> View Document
          </a>
        ) : <span style={{ color: '#94a3b8' }}>N/A</span>
      },
      { 
        key: "transporter_status", 
        label: "Transporter Status", 
        sortable: true,
        render: (status, row) => {
          if (row.trader_status === "no") return <span style={{ color: "#dc2626", fontWeight: "600" }}>Rejected</span>;
          if (status === "yes") return <span style={{ color: "#16a34a", fontWeight: "600" }}>Picked-up</span>;
          if (status === "no") return <span style={{ color: "#dc2626", fontWeight: "600" }}>Rejected</span>;
          return <span style={{ color: "#eab308", fontWeight: "600" }}>Pending</span>;
        }
      },
      { 
        key: "pickup_date", 
        label: "Pick-up Date", 
        sortable: true,
        render: (date, row) => {
          if (row.transporter_status === "no") return <span style={{ color: "#94a3b8" }}>—</span>;
          return date ? new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric"
          }) : <span style={{ color: "#94a3b8" }}>—</span>;
        }
      },
      { 
        key: "delivery_date", 
        label: "Est. Delivery", 
        sortable: true,
        render: (date, row) => {
          if (row.transporter_status === "no") return <span style={{ color: "#94a3b8" }}>—</span>;
          return date ? new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric"
          }) : <span style={{ color: "#94a3b8" }}>—</span>;
        }
      },
      { key: "transporter_remarks", label: "Remarks", sortable: false }
    ];

    if (activeTab === "history") {
      const idx = baseColumns.findIndex(col => col.key === "transporter_status");
      baseColumns.splice(idx + 1, 0, {
        key: "submission_time",
        label: "Submission Time",
        sortable: true,
        render: (_, row) => {
          const date = row.pickup_date;
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
    const nonKunalData = data.filter(item => item.shop_name?.toUpperCase() !== "KUNAL");
    if (selectedShop === "All") return nonKunalData;
    return nonKunalData.filter(item => item.shop_name === selectedShop);
  }, [data, selectedShop]);

  const pendingData = useMemo(() => {
    return filteredData.filter(item => item.transporter_status !== "yes" && item.transporter_status !== "no" && item.trader_status !== "no");
  }, [filteredData]);

  const historyData = useMemo(() => {
    return filteredData.filter(item => item.transporter_status === "yes" || item.transporter_status === "no" || item.trader_status === "no");
  }, [filteredData]);

  const currentTabData = activeTab === "pending" ? pendingData : historyData;

  return (
    <div className="page-container">
      <h1>Transporter Verification</h1>
      <p className="page-description">
        View and manage transporter pick-up confirmations and delivery estimates.
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

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading records...</div>
      ) : (
        <Table
          data={currentTabData}
          columns={columns}
          title={activeTab === 'pending' ? "Pending Transporter Confirmations" : "Transporter Log History"}
          searchableColumns={["po_number", "vendor_name", "transporter_number", "shop_name"]}
          showHeader={false}
        />
      )}
    </div>
  );
};

export default TransporterVerification;
