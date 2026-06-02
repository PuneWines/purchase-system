import React from "react";

const POSignature = ({ companyInfo }) => {
  return (
    <div className="po-signature-block">
      <div className="po-signature-body"></div>
      <div className="po-signature-header">For {companyInfo?.name || "—"}</div>
      <div className="po-signature-sub">Authorized signatory</div>
    </div>
  );
};

export default POSignature;
