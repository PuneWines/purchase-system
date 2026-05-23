import React, { useState, useEffect } from "react";
import Table from "../components/Table";
import { supabase } from "../../utils/supabase";
import { FileText } from "lucide-react";
import "../styles/Pages.css";

const TraderVerification = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: poData, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (poData) {
        const formatted = poData.map(item => {
          let totalReceivedQty = 0;
          if (item.received_items && typeof item.received_items === 'object') {
            totalReceivedQty = Object.values(item.received_items).reduce((sum, currentItem) => sum + (Number(currentItem.receivedQty) || 0), 0);
          }
          const diff = item.receiver_status === 'yes' ? totalReceivedQty - (Number(item.total_order_qty) || 0) : null;
          
          return {
            ...item,
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
    { key: "vendor_name", label: "Vendor Name", sortable: true },
    { key: "first_brand_name", label: "1st Brand Name", sortable: true },
    { key: "total_order_qty", label: "Total Order Qty", sortable: true },
    { key: "total_order_box", label: "Total Order Box", sortable: true },
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
      key: "receiver_pdf_url",
      label: "Receiver PDF",
      sortable: false,
      render: (url) => url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0052cc', textDecoration: 'none', fontWeight: 600 }}>
          <FileText size={16} /> View Receiver
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
    { 
      key: "transporter_status", 
      label: "Transporter Status", 
      sortable: true,
      render: (status) => {
        if (status === "yes") return <span style={{ color: "#16a34a", fontWeight: "600" }}>Picked-up</span>;
        if (status === "no") return <span style={{ color: "#dc2626", fontWeight: "600" }}>Rejected</span>;
        return <span style={{ color: "#eab308", fontWeight: "600" }}>Pending</span>;
      }
    },
    { key: "pickup_date", label: "Pick-up Date", sortable: true },
    { key: "delivery_date", label: "Est. Delivery", sortable: true },
    { 
      key: "receiver_status", 
      label: "Receiver Status", 
      sortable: true,
      render: (status) => {
        if (status === "yes") return <span style={{ color: "#16a34a", fontWeight: "600" }}>Received</span>;
        if (status === "no") return <span style={{ color: "#dc2626", fontWeight: "600" }}>Rejected</span>;
        return <span style={{ color: "#eab308", fontWeight: "600" }}>Pending</span>;
      }
    },
    { key: "totalReceivedQty", label: "Received Qty", sortable: true },
    { 
      key: "qtyDifference", 
      label: "Difference", 
      sortable: true,
      render: (diff) => {
        if (diff === null || diff === undefined) return <span>-</span>;
        if (diff === 0) return <span style={{ color: "#16a34a", fontWeight: "600" }}>0</span>;
        if (diff > 0) return <span style={{ color: "#f59e0b", fontWeight: "600" }}>+{diff}</span>;
        return <span style={{ color: "#ef4444", fontWeight: "600" }}>{diff}</span>;
      }
    },
    { key: "remarks", label: "Trader Remarks", sortable: false },
    { key: "transporter_remarks", label: "Transporter Remarks", sortable: false },
    { key: "receiver_remarks", label: "Receiver Remarks", sortable: false }
  ];

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
          data={data}
          columns={columns}
          title="Purchase Orders Log"
          searchableColumns={["po_number", "indent_id", "vendor_name", "first_brand_name"]}
          showHeader={false}
        />
      )}
    </div>
  );
};

export default TraderVerification;
