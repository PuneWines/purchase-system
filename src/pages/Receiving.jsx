import React, { useState, useEffect } from "react";
import Table from "../components/Table";
import { supabase } from "../../utils/supabase";
import { FileText } from "lucide-react";
import "../styles/Pages.css";

const Receiving = () => {
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
    { key: "vendor_name", label: "Vendor Name", sortable: true },
    { key: "receiver_number", label: "Receiver Contact", sortable: true },
    {
      key: "receiver_pdf_url",
      label: "PO PDF",
      sortable: false,
      render: (url, row) => {
        const finalUrl = url || row.trader_pdf_url;
        return finalUrl ? (
          <a href={finalUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0052cc', textDecoration: 'none', fontWeight: 600 }}>
            <FileText size={16} /> View Document
          </a>
        ) : <span style={{ color: '#94a3b8' }}>N/A</span>;
      }
    },
    { key: "total_order_qty", label: "Total Order Qty", sortable: true },
    { key: "totalReceivedQty", label: "Total Received Qty", sortable: true },
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
    { key: "receiver_remarks", label: "Remarks", sortable: false }
  ];

  return (
    <div className="page-container">
      <h1>Receiving Verification</h1>
      <p className="page-description">
        View and manage receiver confirmations, verified quantities, and discrepancies.
      </p>
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading records...</div>
      ) : (
        <Table
          data={data}
          columns={columns}
          title="Receiving Log"
          searchableColumns={["po_number", "vendor_name", "receiver_number"]}
          showHeader={false}
        />
      )}
    </div>
  );
};

export default Receiving;
