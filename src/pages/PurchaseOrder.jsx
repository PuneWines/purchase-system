import React, { useState, useMemo, useEffect, useRef } from "react";
import { Printer, ShoppingCart, ShoppingBag, Search, ChevronDown, Check } from "lucide-react";
import { supabase } from "../../utils/supabase";
import useCompanyStore from "../store/useCompanyStore";
import "../styles/PurchaseOrder.css";
import { useReactToPrint } from "react-to-print";

/* ── Constants ─────────────────────────────────────────────── */
const COMPANY = {
  name: "DRINQKART",
  address: "10/212 Anna Nagar , Tirupattur - 635601",
  gstin: "33AAPSDF1ZV",
  contact: "+91-9047077124",
  email: "[EMAIL_ADDRESS]",
};

const TERMS = [
  "We reserve the right to cancel the purchase order anytime before product shipment.",
  "Invoice raised to us should contain the details of purchase order with date mentioned.",
  "Adherence to agreed product specifications is a must. Any deviation during delivery will result in cancellation of PO.",
  "Packing and shipping charges are to be borne by the supplier.",
  "Delivery should be strictly done within 5 days from the date of purchase order.",
];

/* ── Helpers ────────────────────────────────────────────────── */
const formatINR = (n) =>
  isNaN(n) ? "—" : Number(n).toFixed(2);

const today = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
};

const genPONumber = (party, idx) => {
  const yr = new Date().getFullYear();
  const seq = String(idx + 1).padStart(2, "0");
  return `${yr}/PO-${seq}`;
};

/* ── Sub-component: Searchable Dropdown ──────────────────────── */
const SearchableDropdown = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => 
    (option || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="searchable-dropdown" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '300px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
          backgroundColor: '#f8fafc', cursor: 'pointer', fontSize: '0.875rem',
          color: '#334155', transition: 'border-color 0.2s',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} color="#64748b" style={{ marginLeft: '8px', minWidth: '16px' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
          zIndex: 100, maxHeight: '250px', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="#94a3b8" style={{ marginRight: '8px' }} />
            <input
              autoFocus
              type="text"
              placeholder="Search party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem', color: '#334155'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {filteredOptions.length > 0 ? filteredOptions.map((option, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: value === option ? '#f0f9ff' : 'transparent',
                  color: value === option ? '#0284c7' : '#475569',
                  fontWeight: value === option ? 600 : 400
                }}
                onMouseEnter={(e) => {
                  if (value !== option) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (value !== option) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {option}
                </span>
                {value === option && <Check size={14} color="#0284c7" style={{ minWidth: '14px' }} />}
              </div>
            )) : (
              <div style={{ padding: '12px', fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center' }}>
                No parties found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sub-component: single PO document ─────────────────────── */
const PODocument = ({ partyName, items, poNumber, poDate, dbParties = [], onPartyChange, vendorDetails, companyInfo, companyTerms }) => {
  const orderQtyRows = items.map((item, i) => {
    const orderQty = item.orderQty !== undefined ? parseFloat(item.orderQty) : null;
    const bcs      = item.bcs      !== null       ? parseFloat(item.bcs)      : null;
    const orderBox = orderQty !== null && bcs ? orderQty / bcs : null;

    return { ...item, orderQty, bcs, orderBox };
  });

  const totalBoxes = orderQtyRows.reduce((s, r) => s + (r.orderBox || 0), 0);
  const totalBottles = orderQtyRows.reduce((s, r) => s + (r.orderQty || 0), 0);

  return (
    <div className="po-document" id={`po-${poNumber.replace(/\//g, "-")}`}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="po-header-area">
        <div className="po-logo-block">
          <div className="po-logo-icon">
            <ShoppingBag size={24} />
          </div>
          <div className="po-company-info">
            <h1>{companyInfo?.name || COMPANY.name}</h1>
            <p>{companyInfo?.address || COMPANY.address}</p>
          </div>
        </div>

        <div className="po-header-right">
          <h1>Purchase Order</h1>
          <table className="po-meta-table">
            <tbody>
              <tr>
                <td>PO No:</td>
                <td>{poNumber}</td>
              </tr>
              <tr>
                <td>PO Date:</td>
                <td>{poDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Blue Header Boxes (Vendor & Ship To) ────────────── */}
      <div className="po-boxes-row">
        <div className="po-box">
          <div className="po-box-header">Vendor</div>
          <div className="po-box-body">
            <div style={{ marginBottom: '8px' }}>
              <div style={{ marginBottom: '4px', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Party Name</div>
              <SearchableDropdown 
                options={dbParties} 
                value={partyName} 
                onChange={(val) => {
                  if (onPartyChange) onPartyChange(val);
                }} 
                placeholder="Select a party"
              />
            </div>
            <strong>Address:</strong> {vendorDetails?.address || "—"}<br />
            <strong>GSTIN:</strong> {vendorDetails?.gstin || "—"}<br />
            <strong>Contact Name:</strong> {vendorDetails?.contact_name || "—"}<br />
            <strong>Contact:</strong> {vendorDetails?.contact || "—"}<br />
            <strong>Email:</strong> {vendorDetails?.email || "—"}
          </div>
        </div>

        <div className="po-box">
          <div className="po-box-header">Ship To:</div>
          <div className="po-box-body">
            <strong>{companyInfo?.name || COMPANY.name}</strong><br />
            {companyInfo?.address || COMPANY.address}<br />
            <strong>GSTIN:</strong> {companyInfo?.gstin || COMPANY.gstin}<br />
            <strong>Contact:</strong> {companyInfo?.contact || COMPANY.contact}<br />
            <strong>Email:</strong> {companyInfo?.email || COMPANY.email}
          </div>
        </div>
      </div>

    

      {/* ── Items Table ─────────────────────────────────────── */}
      <table className="po-items-table">
        <thead>
          <tr>
            <th className="po-text-center">S.No</th>
            <th>Item Name</th>
            <th>Brand</th>
            <th>MLS</th>
            <th>Type</th>
            <th className="po-text-center">B/Cs</th>
            <th className="po-text-center">Order Qty (Bottles)</th>
            <th className="po-text-center">Order Boxes</th>
          </tr>
        </thead>
        <tbody>
          {orderQtyRows.map((item, i) => (
            <tr key={item.id || i}>
              <td className="po-text-center">{i + 1}</td>
              <td><strong>{item.itemName || "—"}</strong></td>
              <td>{item.brandName || item.itemName || "—"}</td>
              <td>{item.mls || "—"}</td>
              <td>{item.liquorType || "—"}</td>
              <td className="po-text-center">{item.bcs != null ? item.bcs : "—"}</td>
              <td className="po-text-center">
                {item.orderQty != null ? Math.ceil(item.orderQty).toLocaleString("en-IN") : "—"}
              </td>
              <td className="po-text-center">
                {item.orderBox != null ? item.orderBox.toFixed(2) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ──────────────────────────────────────────── */}
      <div className="po-totals-container">
        <table className="po-totals-table">
          <tbody>
            <tr>
              <td>Total Bottles</td>
              <td>{Math.ceil(totalBottles).toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td>Total Boxes</td>
              <td>{totalBoxes.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer: Terms + Signature ───────────────────────── */}
      <div className="po-footer-section">
        <div className="po-terms-block">
          <h4>Terms and conditions:</h4>
          <ol>
            {(companyTerms && companyTerms.length > 0 ? companyTerms : TERMS).map((t, i) => <li key={i}>{t}</li>)}
          </ol>
          <div style={{ marginTop: 12, fontSize: "0.75rem", color: "#64748b" }}>
            Mark any communications to {companyInfo?.email || COMPANY.email}
          </div>
        </div>

        <div className="po-signature-block">
          <div className="po-signature-body"></div>
          <div className="po-signature-header">For {companyInfo?.name || COMPANY.name}</div>
          <div className="po-signature-sub">Authorized signatory</div>
        </div>
      </div>

    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════════════════════════ */
const PurchaseOrder = () => {
  const { companySettings, fetchCompanySettings } = useCompanyStore();
  const [approvedItems, setApprovedItems] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [dbParties, setDbParties] = useState([]);
  const [activeParty, setActiveParty] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: activeParty ? `Purchase_Order_${activeParty.replace(/\s+/g, '_')}` : "Purchase_Order",
  });

  useEffect(() => {
    fetchCompanySettings();
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch approved indent items
      const { data: indentData, error: indentError } = await supabase
        .from("indent_items")
        .select("*")
        .eq("approval_status", "approved");

      // Fetch vendors to populate unique party names and details
      const { data: vendorsData, error: vendorsError } = await supabase
        .from("vendors")
        .select("*");

      if (!vendorsError && vendorsData) {
        setVendorsList(vendorsData);
        // We will populate the dropdown with all unique vendor names from the vendors table
        // so the user can easily select any vendor.
        const vendorNames = vendorsData.map(v => v.party_name).filter(Boolean);
        const uniqueVendors = [...new Set(vendorNames)];
        setDbParties(uniqueVendors);
        
        if (uniqueVendors.length > 0) {
           setActiveParty(uniqueVendors[0]);
        }
      }

      if (!indentError && indentData) {
        setApprovedItems(indentData);
        
        // If there are no vendors yet, fallback to unique parties from indent_items
        if (!vendorsData || vendorsData.length === 0) {
          const uniqueParties = [...new Set(indentData.map(d => d.party_name).filter(Boolean))];
          setDbParties(uniqueParties);
          if (uniqueParties.length > 0) setActiveParty(uniqueParties[0]);
        }
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const itemsForActiveParty = useMemo(() => {
    if (!activeParty) return [];
    return approvedItems
      .filter(item => item.party_name === activeParty)
      .map(row => {
        const oq = parseFloat(row.order_qty ?? 0);
        return {
          ...row,
          itemName: row.item_name,
          brandName: row.brand_name,
          liquorType: row.liquor_type,
          orderQty: isNaN(oq) ? 0 : oq
        };
      })
      .filter(row => row.orderQty > 0);
  }, [approvedItems, activeParty]);

  const activeVendorDetails = useMemo(() => {
    if (!activeParty || !vendorsList.length) return null;
    return vendorsList.find(v => v.party_name === activeParty) || null;
  }, [activeParty, vendorsList]);

  const poDate = today();

  return (
    <div className="po-page">

      {/* Top bar */}
      <div className="po-topbar">
        <div className="po-topbar-left">
          <h1>Purchase Orders</h1>
          <p>Select a vendor to view or print their Purchase Order</p>
        </div>
        <div>
          <button className="po-btn-secondary" onClick={handlePrint} disabled={!activeParty}>
            <Printer size={15} /> Print PO
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="po-empty">
          <h2 style={{ color: '#64748b' }}>Loading data...</h2>
        </div>
      )}

      {!isLoading && dbParties.length === 0 && (
        <div className="po-empty">
          <ShoppingCart size={40} style={{ marginBottom: 16, opacity: 0.5 }} />
          <h2>No Vendors Found</h2>
          <p>Please add vendors in the Settings section first.</p>
        </div>
      )}

      {!isLoading && dbParties.length > 0 && activeParty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }} ref={printRef}>
          <PODocument
            partyName={activeParty}
            items={itemsForActiveParty}
            poNumber={genPONumber(activeParty, dbParties.indexOf(activeParty))}
            poDate={poDate}
            dbParties={dbParties}
            onPartyChange={setActiveParty}
            vendorDetails={activeVendorDetails}
            companyInfo={companySettings}
            companyTerms={companySettings?.terms || []}
          />
        </div>
      )}

    </div>
  );
};

export default PurchaseOrder;
