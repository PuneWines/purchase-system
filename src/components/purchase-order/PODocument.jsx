import React from "react";
import POHeader from "./POHeader";
import POVendorBox from "./POVendorBox";
import POShipToBox from "./POShipToBox";
import POItemsTable from "./POItemsTable";
import POTerms from "./POTerms";
import POSignature from "./POSignature";
import POShippingDetails from "./POShippingDetails";

const TERMS = [
  "We reserve the right to cancel the purchase order anytime before product shipment.",
  "Invoice raised to us should contain the details of purchase order with date mentioned.",
  "Adherence to agreed product specifications is a must. Any deviation during delivery will result in cancellation of PO.",
  "Packing and shipping charges are to be borne by the supplier.",
  "Delivery should be strictly done within 5 days from the date of purchase order.",
];

const PODocument = ({ 
  id, 
  copyType, 
  isReceiver, 
  partyName, 
  items = [], 
  poNumber, 
  poDate, 
  dbParties = [], 
  onPartyChange, 
  vendorDetails, 
  companyInfo, 
  companyTerms, 
  transporters = [], 
  receivers = [], 
  selectedTransporter, 
  setSelectedTransporter, 
  selectedReceiver, 
  setSelectedReceiver, 
  shippingError 
}) => {
  const isKunalShop = items.some(
    item => item.shopName?.toUpperCase() === "KUNAL" || item.shop_name?.toUpperCase() === "KUNAL"
  );

  return (
    <div className="po-document" id={id || `po-${poNumber.replace(/\//g, "-")}`}>
      <POHeader
        companyInfo={companyInfo}
        poNumber={poNumber}
        poDate={poDate}
        copyType={copyType}
      />

      <div className="po-boxes-row">
        <POVendorBox
          dbParties={dbParties}
          partyName={partyName}
          onPartyChange={onPartyChange}
          vendorDetails={vendorDetails}
        />
        <POShipToBox companyInfo={companyInfo} />
      </div>

      <POItemsTable
        partyName={partyName}
        items={items}
        isReceiver={isReceiver}
      />

      <div className="po-footer-section">
        <POTerms
          companyTerms={companyTerms}
          defaultTerms={TERMS}
        />
        <POSignature companyInfo={companyInfo} />
      </div>

      <POShippingDetails
        id={id}
        partyName={partyName}
        transporters={transporters}
        receivers={receivers}
        selectedTransporter={selectedTransporter}
        setSelectedTransporter={setSelectedTransporter}
        selectedReceiver={selectedReceiver}
        setSelectedReceiver={setSelectedReceiver}
        shippingError={shippingError}
        isKunalShop={isKunalShop}
      />
    </div>
  );
};

export default PODocument;
