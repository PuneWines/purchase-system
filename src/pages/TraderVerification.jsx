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
        const formatted = poData.map(item => ({
          ...item,
          formattedDate: new Date(item.created_at).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        }));
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
    { key: "trader_status", label: "Trader Status", sortable: true },
    { key: "dispatch_date", label: "Dispatch Date", sortable: true },
    { key: "remarks", label: "Remarks", sortable: false }
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
