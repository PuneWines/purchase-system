import React from "react";
import Table from "../components/Table";
import { traderVerificationData } from "../data/dummyData";
import "../styles/Pages.css";

const TraderVerification = () => {
  const columns = [
    { key: "id", label: "Verification ID", sortable: true },
    { key: "vendorId", label: "Vendor ID", sortable: true },
    {
      key: "vendorName",
      label: "Vendor Name",
      sortable: true,
    },
    { key: "gstNumber", label: "GST Number", sortable: true },
    { key: "panNumber", label: "PAN Number", sortable: true },
    { key: "registrationType", label: "Registration Type", sortable: true },
    { key: "address", label: "Address", sortable: true },
    { key: "verifiedDate", label: "Verified Date", sortable: true },
    {
      key: "verifiedBy",
      label: "Verified By",
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (status) => (
        <span className={`status-badge status-${status.toLowerCase()}`}>
          {status}
        </span>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h1>Trader Verification</h1>
      <p className="page-description">
        Verify and manage trader/vendor credentials
      </p>
      <Table
        data={traderVerificationData}
        columns={columns}
        title="Trader Verification"
        searchableColumns={["vendorName", "gstNumber", "panNumber", "status"]}
      />
    </div>
  );
};

export default TraderVerification;
