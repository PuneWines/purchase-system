import React from "react";

const POShippingDetails = ({
  id,
  partyName,
  transporters = [],
  receivers = [],
  selectedTransporter,
  setSelectedTransporter,
  selectedReceiver,
  setSelectedReceiver,
  shippingError,
  isKunalShop
}) => {
  if (!partyName) return null;

  return (
    <div className="po-shipping-details" id={`shipping-details-${id}`}>
      {shippingError && <div className="shipping-error-msg">{shippingError}</div>}
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
        <div className="shipping-field">
          <strong>
            Transporter:{" "}
            {isKunalShop ? (
              <span style={{ color: '#64748b', fontSize: '0.85em', fontWeight: 'normal' }}>
                (Not Required)
              </span>
            ) : (
              <span style={{ color: 'red' }}>*</span>
            )}
          </strong>
          <select 
            className="shipping-select" 
            value={selectedTransporter} 
            onChange={(e) => {
              setSelectedTransporter?.(e.target.value);
              const el = document.getElementById(`shipping-details-${id}`);
              if (el) el.classList.remove('highlight-error');
            }}
          >
            <option value="">
              {isKunalShop ? "Transporter Not Required" : "Select Transporter"}
            </option>
            {transporters.map((t) => (
              <option key={t.id} value={t.contact_number}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="shipping-field">
          <strong>
            Receiver: <span style={{ color: 'red' }}>*</span>
          </strong>
          <select 
            className="shipping-select" 
            value={selectedReceiver} 
            onChange={(e) => {
              setSelectedReceiver?.(e.target.value);
              const el = document.getElementById(`shipping-details-${id}`);
              if (el) el.classList.remove('highlight-error');
            }}
          >
            <option value="">Select Receiver</option>
            {receivers.map((r) => (
              <option key={r.id} value={r.contact_number}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default POShippingDetails;
