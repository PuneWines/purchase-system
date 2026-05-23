import React from "react";
import Table from "../components/Table";
import { transporterVerificationData } from "../data/dummyData";
import "../styles/Pages.css";

const TransporterVerification = () => {
  const columns = [
    { key: "id", label: "Verification ID", sortable: true, filterable: true },
    {
      key: "transporterId",
      label: "Transporter ID",
      sortable: true,
      filterable: true,
    },
    {
      key: "transporterName",
      label: "Transporter Name",
      sortable: true,
      filterable: true,
    },
    { key: "gstNumber", label: "GST Number", sortable: true, filterable: true },
    { key: "panNumber", label: "PAN Number", sortable: true, filterable: true },
    {
      key: "licenseNumber",
      label: "License Number",
      sortable: true,
      filterable: true,
    },
    { key: "registrationType", label: "Registration Type", sortable: true },
    { key: "address", label: "Address", sortable: true, filterable: true },
    { key: "verifiedDate", label: "Verified Date", sortable: true },
    {
      key: "verifiedBy",
      label: "Verified By",
      sortable: true,
      filterable: true,
    },
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
      <h1>Transporter Verification</h1>
      <p className="page-description">
        Verify and manage transporter credentials
      </p>
      <Table
        data={transporterVerificationData}
        columns={columns}
        title="Transporter Verification"
        searchableColumns={[
          "transporterName",
          "gstNumber",
          "licenseNumber",
          "status",
        ]}
      />
    </div>
  );
};

export default TransporterVerification;
