import React, { useState, useEffect } from "react";
import Table from "../components/Table";
import { supabase } from "../../utils/supabase";
import { FileText } from "lucide-react";
import "../styles/Pages.css";

const TransporterVerification = () => {
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
    { key: "vendor_name", label: "Vendor Name", sortable: true },
    { key: "transporter_number", label: "Transporter Contact", sortable: true },
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
      render: (status) => {
        if (status === "yes") return <span style={{ color: "#16a34a", fontWeight: "600" }}>Picked-up</span>;
        if (status === "no") return <span style={{ color: "#dc2626", fontWeight: "600" }}>Rejected</span>;
        return <span style={{ color: "#eab308", fontWeight: "600" }}>Pending</span>;
      }
    },
    { key: "pickup_date", label: "Pick-up Date", sortable: true },
    { key: "delivery_date", label: "Est. Delivery", sortable: true },
    { key: "transporter_remarks", label: "Remarks", sortable: false }
  ];

  return (
    <div className="page-container">
      <h1>Transporter Verification</h1>
      <p className="page-description">
        View and manage transporter pick-up confirmations and delivery estimates.
      </p>
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading records...</div>
      ) : (
        <Table
          data={data}
          columns={columns}
          title="Transporter Log"
          searchableColumns={["po_number", "vendor_name", "transporter_number"]}
          showHeader={false}
        />
      )}
    </div>
  );
};

export default TransporterVerification;
