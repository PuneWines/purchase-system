import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Printer, ShoppingCart, ShoppingBag, Search, ChevronDown, Check, FileText, Download, UserCheck, RefreshCw, X } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { sendPOConfirmationMessage } from '../services/whatsappService';
import useCompanyStore from "../store/useCompanyStore";
import "../styles/PurchaseOrder.css";
import html2pdf from "html2pdf.js";

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
const PODocument = ({ id, copyType, isReceiver, partyName, items, poNumber, poDate, dbParties = [], onPartyChange, vendorDetails, companyInfo, companyTerms }) => {
  const orderQtyRows = items.map((item, i) => {
    const orderQty = item.orderQty !== undefined ? parseFloat(item.orderQty) : null;
    const bcs      = item.bcs      !== null       ? parseFloat(item.bcs)      : null;
    const orderBox = orderQty !== null && bcs ? orderQty / bcs : null;

    return { ...item, orderQty, bcs, orderBox };
  });

  const totalBoxes = orderQtyRows.reduce((s, r) => s + (r.orderBox || 0), 0);
  const totalBottles = orderQtyRows.reduce((s, r) => s + (r.orderQty || 0), 0);

  return (
    <div className="po-document" id={id || `po-${poNumber.replace(/\//g, "-")}`}>

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
          {copyType && <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{copyType}</div>}
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
            {isReceiver ? (
              <>
                <th className="po-text-center">Closing Stock in Bottle</th>
                <th className="po-text-center">Order in Box</th>
                <th className="po-text-center">Qty Type</th>
              </>
            ) : (
              <>
                <th className="po-text-center">Qty Type</th>
                <th className="po-text-center">Order Qty (Bottles)</th>
                <th className="po-text-center">Order Boxes</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {orderQtyRows.map((item, i) => (
            <tr key={item.id || i}>
              <td className="po-text-center">{i + 1}</td>
              <td><strong>{item.itemName || "—"}</strong></td>
              <td>{item.brandName || item.itemName || "—"}</td>
              
              {isReceiver ? (
                <>
                  <td className="po-text-center">
                    {item.closingQty != null ? item.closingQty : "—"}
                  </td>
                  <td className="po-text-center">
                    {item.orderBox != null ? item.orderBox.toFixed(2) : "—"}
                  </td>
                  <td className="po-text-center" style={{ color: '#64748b', fontSize: '0.8rem' }}>Bottle / Box</td>
                </>
              ) : (
                <>
                  <td className="po-text-center" style={{ color: '#64748b', fontSize: '0.8rem' }}>Bottle / Box</td>
                  <td className="po-text-center">
                    {item.orderQty != null ? Math.ceil(item.orderQty).toLocaleString("en-IN") : "—"}
                  </td>
                  <td className="po-text-center">
                    {item.orderBox != null ? item.orderBox.toFixed(2) : "—"}
                  </td>
                </>
              )}
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
  const [isUploading, setIsUploading] = useState(false);
  const [nextPoNumber, setNextPoNumber] = useState("");
  const printRef = useRef();

  const fetchNextPoNumber = async () => {
    const yr = new Date().getFullYear();
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("po_number")
      .order("created_at", { ascending: false })
      .limit(1);

    let nextSeq = 1;
    if (!error && data && data.length > 0 && data[0].po_number) {
      const parts = data[0].po_number.split("-");
      if (parts.length > 1) {
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
    }
    setNextPoNumber(`${yr}/PO-${String(nextSeq).padStart(2, "0")}`);
  };

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
          closingQty: row.closing_qty,
          orderQty: isNaN(oq) ? 0 : oq
        };
      })
      .filter(row => row.orderQty > 0);
  }, [approvedItems, activeParty]);

  const handleDownloadPDF = async () => {
    const docTrader = document.getElementById('pdf-trader');
    const docReceiver = document.getElementById('pdf-receiver');
    const receiverContainer = document.getElementById('receiver-pdf-container');
    
    if (!docTrader || !docReceiver || !receiverContainer || isUploading) return;
    
    setIsUploading(true);
    
    try {
      // Apply PDF-optimized styles via class to strictly fit into A4 page and eliminate cutoff
      docTrader.classList.add('pdf-export');
      docReceiver.classList.add('pdf-export');

      // Use Vendor party name for PDF file names
      const baseFilename = activeParty ? `PO_${activeParty.replace(/\s+/g, '_')}` : "Purchase_Order";
    
    const optTrader = {
      margin:       0.2, // Clean 0.2 inch margins on all sides
      filename:     `${baseFilename}_Trader_Transporter.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        windowWidth: 1000, 
        width: 1000 // Force exact canvas width to bypass any browser viewport clipping
      }, 
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['auto', 'css', 'avoid'] } // Enable multiple pages vertically
    };

    const optReceiver = {
      ...optTrader,
      filename:     `${baseFilename}_Receiver.pdf`,
    };
    
      // Generate Trader PDF Blob (upload only, no download)
      const traderBlob = await new Promise((resolve) => {
        html2pdf().set(optTrader).from(docTrader).toPdf().get('pdf').then((pdf) => {
          resolve(pdf.output('blob'));
        });
      });

      // Unhide receiver container temporarily
      receiverContainer.style.display = 'block';
      
      // Generate Receiver PDF Blob (upload only, no download)
      const receiverBlob = await new Promise((resolve) => {
        html2pdf().set(optReceiver).from(docReceiver).toPdf().get('pdf').then((pdf) => {
          resolve(pdf.output('blob'));
        });
      });

      // Hide receiver container again
      receiverContainer.style.display = 'none';
      
      // --- Upload to Supabase Storage ---
      const timestamp = Date.now();
      const traderStoragePath = `${baseFilename}_Trader_${timestamp}.pdf`;
      const receiverStoragePath = `${baseFilename}_Receiver_${timestamp}.pdf`;

      const { error: tErr } = await supabase.storage
        .from('PO')
        .upload(traderStoragePath, traderBlob, { contentType: 'application/pdf', upsert: true });
      if (tErr) throw tErr;

      const { error: rErr } = await supabase.storage
        .from('PO')
        .upload(receiverStoragePath, receiverBlob, { contentType: 'application/pdf', upsert: true });
      if (rErr) throw rErr;

      // Get Public URLs
      const traderUrl = supabase.storage.from('PO').getPublicUrl(traderStoragePath).data.publicUrl;
      const receiverUrl = supabase.storage.from('PO').getPublicUrl(receiverStoragePath).data.publicUrl;

      // --- Generate / Fetch Unique Vendor ID ---
      const { data: existingVendorData } = await supabase
        .from('purchase_orders')
        .select('vendor_id')
        .eq('vendor_name', activeParty)
        .limit(1);

      let currentVendorId;
      if (existingVendorData && existingVendorData.length > 0 && existingVendorData[0].vendor_id) {
        currentVendorId = existingVendorData[0].vendor_id;
      } else {
        const { data: allVendors } = await supabase.from('purchase_orders').select('vendor_id');
        let maxSeq = 0;
        if (allVendors) {
          allVendors.forEach(v => {
            if (v.vendor_id && v.vendor_id.startsWith('VN-')) {
              const seq = parseInt(v.vendor_id.split('-')[1], 10);
              if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
            }
          });
        }
        currentVendorId = `VN-${String(maxSeq + 1).padStart(3, "0")}`;
      }

      // --- Insert Database Record ---
      const currentIndentId = itemsForActiveParty.length > 0 ? itemsForActiveParty[0].unique_indent_id : null;
      const firstBrandName = itemsForActiveParty.length > 0 ? itemsForActiveParty[0].brandName : null;

      let totalOrderQty = 0;
      let totalOrderBox = 0;

      itemsForActiveParty.forEach((item) => {
        const orderQty = item.orderQty !== undefined ? parseFloat(item.orderQty) : 0;
        const bcs = item.bcs !== null && item.bcs !== undefined ? parseFloat(item.bcs) : 0;
        const orderBox = (orderQty && bcs) ? orderQty / bcs : 0;
        
        totalOrderQty += orderQty;
        totalOrderBox += orderBox;
      });

      const { data: insertedData, error: dbErr } = await supabase
        .from('purchase_orders')
        .insert([{
          po_number: nextPoNumber,
          vendor_name: activeParty,
          vendor_id: currentVendorId,
          trader_pdf_url: traderUrl,
          receiver_pdf_url: receiverUrl,
          indent_id: currentIndentId,
          first_brand_name: firstBrandName,
          total_order_qty: totalOrderQty,
          total_order_box: totalOrderBox
        }])
        .select();

      if (dbErr) throw dbErr;

      const insertedPoId = insertedData[0]?.id;

      // --- Send WhatsApp Message ---
      if (activeVendorDetails?.contact && insertedPoId) {
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
        const confirmLink = `${baseUrl}/confirm-po/${insertedPoId}`;
        // Use the new whatsappService
        let formattedPhone = activeVendorDetails.contact.replace(/\D/g, "");
        if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;

        const result = await sendPOConfirmationMessage(
          formattedPhone,
          activeParty,
          nextPoNumber,
          confirmLink,
          companySettings?.name || COMPANY.name,
          totalOrderQty,
          traderUrl
        );
        console.log(result);

        if (result.success) {
          console.log(`✅ Successfully sent WhatsApp confirmation message to ${activeParty} at ${formattedPhone}`);
        } else {
          console.error(`❌ Failed to send WhatsApp message to ${activeParty} (${activeVendorDetails.contact}):`, result.error);
        }
      }

      alert("Purchase Orders successfully generated and submitted to Supabase!");
      
      // Re-fetch next PO number for the next submission
      await fetchNextPoNumber();

    } catch (error) {
      console.error("Error generating/uploading PDF:", error);
      alert("An error occurred during PDF export: " + error.message);
    } finally {
      setIsUploading(false);
      receiverContainer.style.display = 'none';
      docTrader.classList.remove('pdf-export');
      docReceiver.classList.remove('pdf-export');
    }
  }; // removed useCallback as state references are direct inside async func

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (activeParty && !isUploading) {
          handleDownloadPDF();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeParty, isUploading]);

  useEffect(() => {
    fetchCompanySettings();
    const fetchData = async () => {
      setIsLoading(true);
      
      await fetchNextPoNumber();
      
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
      }

      if (!indentError && indentData) {
        setApprovedItems(indentData);
        
        // Strictly show only parties that have approved indents in the dropdown
        const approvedParties = [...new Set(indentData.map(d => d.party_name).filter(Boolean))];
        setDbParties(approvedParties);
        
        if (approvedParties.length > 0) {
           setActiveParty(approvedParties[0]);
        } else {
           setActiveParty("");
        }
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);



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
          <button 
            className="po-btn-secondary" 
            onClick={handleDownloadPDF} 
            disabled={!activeParty || isUploading}
          >
            <Printer size={15} /> {isUploading ? "Submitting..." : "Generate & Submit PO"}
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
            id="pdf-trader"
            copyType="Original for Trader / Transporter"
            partyName={activeParty}
            items={itemsForActiveParty}
            poNumber={nextPoNumber || "Loading..."}
            poDate={poDate}
            dbParties={dbParties}
            onPartyChange={setActiveParty}
            vendorDetails={activeVendorDetails}
            companyInfo={companySettings}
            companyTerms={companySettings?.terms || []}
          />
          
          {/* Receiver PDF is visually hidden from UI but available for export */}
          <div id="receiver-pdf-container" style={{ display: 'none' }}>
            <PODocument
              id="pdf-receiver"
              copyType="Duplicate for Receiver"
              isReceiver={true}
              partyName={activeParty}
              items={itemsForActiveParty}
              poNumber={nextPoNumber || "Loading..."}
              poDate={poDate}
              dbParties={dbParties}
              onPartyChange={setActiveParty}
              vendorDetails={activeVendorDetails}
              companyInfo={companySettings}
              companyTerms={companySettings?.terms || []}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchaseOrder;
