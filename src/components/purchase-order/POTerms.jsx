import React from "react";

const POTerms = ({ vendorTerms = [] }) => {
  if (!vendorTerms || vendorTerms.length === 0) return null;
  return (
    <div className="po-terms-block">
      <h4>Terms and conditions:</h4>
      <ol>
        {vendorTerms.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
    </div>
  );
};

export default POTerms;
