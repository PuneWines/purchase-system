import React, { useState, useEffect, useMemo } from "react";
import Table from "../components/Table";
import { supabase } from "../../utils/supabase";
import { FileText } from "lucide-react";
import useShopStore from "../store/useShopStore";
import "../styles/Pages.css";

const TraderVerification = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedShop } = useShopStore();

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

        // Fetch only the indent_items rows that match these unique_indent_ids
        const { data: items } = uniqueIndentIds.length > 0
          ? await supabase
              .from("indent_items")
              .select("indent_id, unique_indent_id")
              .in("unique_indent_id", uniqueIndentIds)
          : { data: [] };

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
          
          // Resolve shop name
          const parentIndentId = itemMap[item.indent_id];
          const shopName = parentIndentId ? (indentMap[parentIndentId] || "Unknown") : "Unknown";

          return {
            ...item,
            shop_name: shopName,
            formattedDate: new Date(item.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            }),
            totalReceivedQty: item.receiver_status === 'yes' ? totalReceivedQty : "N/A",
            qtyDifference: diff
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

  const columns = [
    { key: "po_number", label: "PO Number", sortable: true },
    { key: "indent_id", label: "Indent ID", sortable: true },
    { key: "shop_name", label: "Shop Name", sortable: true },
    { key: "vendor_name", label: "Vendor Name", sortable: true },
    { key: "first_brand_name", label: "1st Brand Name", sortable: true },
    { key: "total_order_qty", label: "Total Order Qty", sortable: true },
    { key: "total_order_box", label: "Total Order Box", sortable: true },
    {
      key: "tp_number",
      label: "TP Number",
      sortable: true,
      render: (tp) => tp || <span style={{ color: "#94a3b8" }}>—</span>
    },
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
    { key: "dispatch_date", label: "Dispatch Date", sortable: true },
    { key: "remarks", label: "Trader Remarks", sortable: false }
  ];

  const filteredData = useMemo(() => {
    if (selectedShop === "All") return data;
    return data.filter(item => item.shop_name === selectedShop);
  }, [data, selectedShop]);

  return (
    <div className="page-container">
      <h1>Purchase Orders History</h1>
      <p className="page-description">
        View and download generated purchase orders from the system.
      </p>
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading records...</div>
      ) : (
        <Table
          data={filteredData}
          columns={columns}
          title="Purchase Orders Log"
          searchableColumns={["po_number", "indent_id", "shop_name", "vendor_name", "first_brand_name"]}
          showHeader={false}
        />
      )}
    </div>
  );
};

export default TraderVerification;
