import React from "react";
import SearchableDropdown from "./SearchableDropdown";

const POVendorBox = ({ dbParties, partyName, onPartyChange, vendorDetails, onDeleteVendor }) => {
  return (
    <div className="po-box">
      <div className="po-box-header">Vendor</div>
      <div className="po-box-body">
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            marginBottom: '4px',
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Party Name
          </div>
          <SearchableDropdown 
            options={dbParties} 
            value={partyName} 
            onChange={(val) => {
              if (onPartyChange) onPartyChange(val);
            }} 
            placeholder="Select a party"
            onDeleteOption={onDeleteVendor}
          />
        </div>
        <strong>Address:</strong> {vendorDetails?.address || "—"}<br />
        <strong>GSTIN:</strong> {vendorDetails?.gstin || "—"}<br />
        <strong>Contact Name:</strong> {vendorDetails?.contact_name || "—"}<br />
        <strong>Contact:</strong> {vendorDetails?.contact || "—"}<br />
        <strong>Email:</strong> {vendorDetails?.email || "—"}
      </div>
    </div>
  );
};

export default POVendorBox;
