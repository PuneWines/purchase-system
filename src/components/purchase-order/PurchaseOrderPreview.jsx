import React from "react";
import POHeader from "./POHeader";
import POVendorBox from "./POVendorBox";
import POShipToBox from "./POShipToBox";
import POItemsTable from "./POItemsTable";
import POTerms from "./POTerms";
import POSignature from "./POSignature";
import POShippingDetails from "./POShippingDetails";

const PurchaseOrderPreview = ({
  id,
  partyName,
  items = [],
  poNumber,
  poDate,
  dbParties = [],
  onPartyChange,
  vendorDetails,
  companyInfo,
  transporters = [],
  receivers = [],
  selectedTransporter,
  setSelectedTransporter,
  selectedReceiver,
  setSelectedReceiver,
  shippingError,
  onRemoveItem,
  onDeleteVendor
}) => {
  const isKunalShop = items.some(
    item => item.shopName?.toUpperCase() === "KUNAL" || item.shop_name?.toUpperCase() === "KUNAL"
  );

  return (
    <div className="po-document" id={id}>
      <POHeader
        companyInfo={companyInfo}
        poNumber={poNumber}
        poDate={poDate}
        copyType="Original for Trader / Transporter"
      />

      <div className="po-boxes-row">
        <POVendorBox
          dbParties={dbParties}
          partyName={partyName}
          onPartyChange={onPartyChange}
          vendorDetails={vendorDetails}
          onDeleteVendor={onDeleteVendor}
        />
        <POShipToBox companyInfo={companyInfo} />
      </div>

      <POItemsTable
        partyName={partyName}
        items={items}
        isReceiver={false}
        onRemoveItem={onRemoveItem}
      />

      <div className="po-footer-section">
        <POTerms
          vendorTerms={vendorDetails?.terms || []}
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

export default PurchaseOrderPreview;
