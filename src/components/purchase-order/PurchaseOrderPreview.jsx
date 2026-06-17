import POHeader from "./POHeader";
import POVendorBox from "./POVendorBox";
import POShipToBox from "./POShipToBox";
import POItemsTable from "./POItemsTable";
import POTerms from "./POTerms";
import POSignature from "./POSignature";
import POShippingDetails from "./POShippingDetails";
import SearchableItemDropdown from "./SearchableItemDropdown";

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
  onUpdateItem,
  onDeleteVendor,
  poMode,
  itemList = [],
  selectedItem = null,
  onItemSelect,
  newItemName,
  newItemBox,
  onBoxQtyChange,
  newItemQty,
  onBottleQtyChange,
  onAddItem
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
        onUpdateItem={onUpdateItem}
      />

      {poMode === "manual" && partyName && (
        <div className="manual-item-form no-print" style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>Add Manual Item</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Item Name</label>
              <SearchableItemDropdown
                items={itemList}
                value={newItemName}
                onChange={onItemSelect}
                placeholder="Search database or enter custom item..."
              />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Box Qty</label>
              <input
                type="number"
                min="0"
                step="any"
                value={newItemBox}
                onChange={(e) => onBoxQtyChange(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Bottle Qty</label>
              <input
                type="number"
                min="0"
                step="1"
                value={newItemQty}
                onChange={(e) => onBottleQtyChange(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              onClick={onAddItem}
              style={{
                padding: '9px 24px',
                backgroundColor: '#4338ca',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                height: '37px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3730a3'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
            >
              + Add Item
            </button>
          </div>
          {selectedItem && selectedItem['bc_s'] && (
            <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#6366f1', borderRadius: '50%' }}></span>
              Auto-calculating linked quantities using case size of {selectedItem['bc_s']} bottles ({selectedItem.ml_s || '—'} ml)
            </div>
          )}
        </div>
      )}

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
