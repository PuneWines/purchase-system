import React from "react";

const POShipToBox = ({ companyInfo }) => {
  return (
    <div className="po-box">
      <div className="po-box-header">Ship To:</div>
      <div className="po-box-body">
        <strong>{companyInfo?.name || "—"}</strong><br />
        {companyInfo?.address || "—"}<br />
        <strong>GSTIN:</strong> {companyInfo?.gstin || "—"}<br />
        <strong>Contact:</strong> {companyInfo?.contact || "—"}<br />
        <strong>Email:</strong> {companyInfo?.email || "—"}
      </div>
    </div>
  );
};

export default POShipToBox;
