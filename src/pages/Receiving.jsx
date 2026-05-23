import React from "react";
import Table from "../components/Table";
import { receivingData } from "../data/dummyData";
import "../styles/Pages.css";

const Receiving = () => {
  const columns = [
    { key: "id", label: "Receipt ID", sortable: true, filterable: true },
    { key: "poId", label: "PO ID", sortable: true, filterable: true },
    {
      key: "vendorName",
      label: "Vendor Name",
      sortable: true,
      filterable: true,
    },
    { key: "items", label: "Items", sortable: true, filterable: true },
    { key: "quantityOrdered", label: "Qty Ordered", sortable: true },
    { key: "quantityReceived", label: "Qty Received", sortable: true },
    { key: "unit", label: "Unit", sortable: true },
    { key: "receivedDate", label: "Received Date", sortable: true },
    {
      key: "receivedBy",
      label: "Received By",
      sortable: true,
      filterable: true,
    },
    { key: "remarks", label: "Remarks", sortable: false },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (status) => (
        <span className={`status-badge status-${status.toLowerCase()}`}>
          {status}
        </span>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h1>Receiving Management</h1>
      <p className="page-description">Track received goods and inventory</p>
      <Table
        data={receivingData}
        columns={columns}
        title="Receiving"
        searchableColumns={["id", "poId", "vendorName", "items", "status"]}
      />
    </div>
  );
};

export default Receiving;
