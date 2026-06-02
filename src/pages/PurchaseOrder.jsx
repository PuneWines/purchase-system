import React, { useState, useMemo, useEffect, useRef } from "react";
import { Printer, ShoppingCart, FileText } from "lucide-react";
import useCompanyStore from "../store/useCompanyStore";
import useShopStore from "../store/useShopStore";
import "../styles/PurchaseOrder.css";

// Components
import PurchaseOrderPreview from "../components/purchase-order/PurchaseOrderPreview";

// PDF Templates
import TraderPDF from "../pdf/TraderPDF";
import ReceiverPDF from "../pdf/ReceiverPDF";

// Services
import {
  fetchPageData,
  fetchNextPoNumber,
  generateVendorId,
  insertPurchaseOrder,
  getOrCreateVendorPortalLink,
  getOrCreateTransporterPortalLink,
  getOrCreateReceiverPortalLink
} from "../services/purchaseOrderService";
import { generatePdfBlob, uploadPdfBlob, previewPdfInNewTab } from "../services/pdfService";
import { sendPOConfirmationMessage, sendTransporterConfirmationMessage } from "../services/whatsappService";

// Utilities
import { transformActivePartyItems } from "../utils/poTransformer";
import { today } from "../utils/poHelpers";
import { COMPANY } from "../utils/constants";

const PurchaseOrder = () => {
  const { companies, companySettings, fetchCompanySettings } = useCompanyStore();
  const { selectedShop } = useShopStore();
  const [selectedCompanyId, setSelectedCompanyId] = useState("none");
  const [approvedItems, setApprovedItems] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [activeParty, setActiveParty] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [nextPoNumber, setNextPoNumber] = useState("");
  const [transporters, setTransporters] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [selectedTransporter, setSelectedTransporter] = useState("");
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [shippingError, setShippingError] = useState("");
  const printRef = useRef();
  const isSubmittingRef = useRef(false);

  const loadPageData = async (shouldShowLoading = true) => {
    if (shouldShowLoading) setIsLoading(true);
    try {
      const nextPo = await fetchNextPoNumber();
      setNextPoNumber(nextPo);
      
      const data = await fetchPageData();
      if (data.vendorsData) setVendorsList(data.vendorsData);
      if (data.transpData) setTransporters(data.transpData);
      if (data.recvData) setReceivers(data.recvData);

      if (data.indentData) {
        const existingPos = data.poData || [];
        const filteredIndentData = data.indentData.filter(item => {
          if (!item.unique_indent_id || !item.party_name) return true;
          const hasPo = existingPos.some(
            po => po.indent_id === item.unique_indent_id && 
                  po.vendor_name?.trim().toLowerCase() === item.party_name?.trim().toLowerCase()
          );
          return !hasPo;
        });

        const shopMap = (data.indentsData || []).reduce((acc, ind) => {
          acc[ind.id] = ind.shop_name;
          return acc;
        }, {});

        const enriched = filteredIndentData.map(item => ({
          ...item,
          shop_name: shopMap[item.indent_id] || "Unknown"
        }));
        setApprovedItems(enriched);
      }
    } catch (error) {
      console.error("Error fetching page data:", error);
    } finally {
      if (shouldShowLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanySettings();
    loadPageData();
  }, []);

  const filteredApprovedItems = useMemo(() => {
    if (selectedShop === "All") return approvedItems;
    return approvedItems.filter(item => item.shop_name === selectedShop);
  }, [approvedItems, selectedShop]);

  const dbParties = useMemo(() => {
    return [...new Set(filteredApprovedItems.map(d => d.party_name).filter(Boolean))];
  }, [filteredApprovedItems]);

  // If the activeParty is no longer valid for the selected shop filter, clear it
  useEffect(() => {
    if (activeParty && !dbParties.includes(activeParty)) {
      setActiveParty("");
    }
  }, [selectedShop, dbParties, activeParty]);

  const itemsForActiveParty = useMemo(() => {
    return transformActivePartyItems(filteredApprovedItems, activeParty);
  }, [filteredApprovedItems, activeParty]);

  // Reactively auto-select company based on selected vendor (activeParty) and their items
  useEffect(() => {
    if (!activeParty || itemsForActiveParty.length === 0) {
      setSelectedCompanyId("none");
      return;
    }

    const shopName = (itemsForActiveParty[0]?.shopName || itemsForActiveParty[0]?.shop_name || "").trim().toLowerCase();
    if (!shopName) {
      setSelectedCompanyId("none");
      return;
    }

    // Search for a company whose name matches the shop name (case-insensitive fuzzy match)
    const matched = companies.find(c => {
      const companyName = (c.name || "").toLowerCase();
      return companyName.includes(shopName) || shopName.includes(companyName);
    });

    if (matched) {
      setSelectedCompanyId(matched.id);
    } else {
      setSelectedCompanyId("none");
    }
  }, [activeParty, itemsForActiveParty, companies]);

  const activeCompany = useMemo(() => {
    if (selectedCompanyId === "none" || !selectedCompanyId) {
      return null;
    }
    return companies.find(c => c.id === selectedCompanyId) || null;
  }, [selectedCompanyId, companies]);

  const activeVendorDetails = useMemo(() => {
    if (!activeParty || !vendorsList.length) return null;
    return vendorsList.find(v => v.party_name === activeParty) || null;
  }, [activeParty, vendorsList]);

  const handleDownloadPDF = async () => {
    if (isSubmittingRef.current || isUploading) return;

    if (!activeVendorDetails?.contact) {
      alert("Error: The selected vendor does not have a contact number. Vendor contact number is mandatory to generate a PO.");
      setShippingError("The selected vendor does not have a contact number. Vendor contact number is mandatory to generate a PO.");
      return;
    }

    const isKunalShop = itemsForActiveParty.some(item => item.shopName?.toUpperCase() === "KUNAL" || item.shop_name?.toUpperCase() === "KUNAL");

    if (isKunalShop) {
      if (!selectedReceiver) {
        setShippingError("Please select Receiver before generating the PO.");
        const shippingSection = document.getElementById('shipping-details-pdf-trader');
        if (shippingSection) {
          shippingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          shippingSection.classList.add('highlight-error');
          setTimeout(() => shippingSection.classList.remove('highlight-error'), 2500);
        }
        return;
      }
    } else {
      if (!selectedTransporter || !selectedReceiver) {
        setShippingError("Please select both Transporter and Receiver before generating the PO.");
        const shippingSection = document.getElementById('shipping-details-pdf-trader');
        if (shippingSection) {
          shippingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          shippingSection.classList.add('highlight-error');
          setTimeout(() => shippingSection.classList.remove('highlight-error'), 2500);
        }
        return;
      }
    }
    setShippingError("");

    setIsUploading(true);
    isSubmittingRef.current = true;
    
    try {
      // Use Vendor party name for PDF file names
      const baseFilename = activeParty ? `PO_${activeParty.replace(/\s+/g, '_')}` : "Purchase_Order";
    
      // Create React-PDF documents
      const traderDoc = (
        <TraderPDF
          partyName={activeParty}
          items={itemsForActiveParty}
          poNumber={nextPoNumber || "Loading..."}
          poDate={poDate}
          vendorDetails={activeVendorDetails}
          companyInfo={activeCompany}
        />
      );

      const receiverDoc = (
        <ReceiverPDF
          partyName={activeParty}
          items={itemsForActiveParty}
          poNumber={nextPoNumber || "Loading..."}
          poDate={poDate}
          vendorDetails={activeVendorDetails}
          companyInfo={activeCompany}
        />
      );

      // Generate PDF Blobs directly in memory
      const traderBlob = await generatePdfBlob(traderDoc);
      const receiverBlob = await generatePdfBlob(receiverDoc);
      
      // --- Upload to Supabase Storage ---
      const timestamp = Date.now();
      const traderStoragePath = `${baseFilename}_Trader_${timestamp}.pdf`;
      const receiverStoragePath = `${baseFilename}_Receiver_${timestamp}.pdf`;

      const traderUrl = await uploadPdfBlob('PO', traderStoragePath, traderBlob);
      const receiverUrl = await uploadPdfBlob('PO', receiverStoragePath, receiverBlob);

      // --- Generate / Fetch Unique Vendor ID ---
      const currentVendorId = await generateVendorId(activeParty);

      // --- Insert Database Record ---
      const currentIndentId = itemsForActiveParty.length > 0 ? itemsForActiveParty[0].unique_indent_id : null;
      const firstBrandName = itemsForActiveParty.length > 0 ? itemsForActiveParty[0].brandName : null;

      let totalOrderQty = 0;
      let totalOrderBox = 0;

      itemsForActiveParty.forEach((item) => {
        totalOrderQty += item.orderQty || 0;
        totalOrderBox += item.orderBox || 0;
      });

      const insertedData = await insertPurchaseOrder({
        po_number: nextPoNumber,
        vendor_name: activeParty,
        vendor_id: currentVendorId,
        trader_pdf_url: traderUrl,
        receiver_pdf_url: receiverUrl,
        indent_id: currentIndentId,
        first_brand_name: firstBrandName,
        total_order_qty: totalOrderQty,
        total_order_box: totalOrderBox,
        transporter_number: selectedTransporter || null,
        receiver_number: selectedReceiver || null
      });

      const insertedPoId = insertedData[0]?.id;

      // --- Fetch / Generate Portal Links ---
      const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;

      // 1. Get/Create Vendor Portal Link
      let vendorPortalLink = "";
      if (activeVendorDetails?.contact) {
        vendorPortalLink = await getOrCreateVendorPortalLink(activeParty, currentVendorId, baseUrl);
      }

      // 2. Get/Create Transporter Portal Link
      let transporterPortalLink = "";
      if (selectedTransporter) {
        transporterPortalLink = await getOrCreateTransporterPortalLink(selectedTransporter, transporters, baseUrl);
      }

      // 3. Get/Create Receiver Portal Link
      let receiverPortalLink = "";
      if (selectedReceiver) {
        receiverPortalLink = await getOrCreateReceiverPortalLink(selectedReceiver, receivers, baseUrl);
      }

      // --- Send WhatsApp Messages ---
      const whatsappPromises = [];

      // 1. Send PO Confirmation to Trader/Vendor via their permanent portal
      if (activeVendorDetails?.contact && insertedPoId && vendorPortalLink) {
        let formattedPhone = activeVendorDetails.contact.replace(/\D/g, "");
        if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;

        whatsappPromises.push(
          sendPOConfirmationMessage(
            formattedPhone,
            activeParty,
            nextPoNumber,
            vendorPortalLink,
            activeCompany?.name || COMPANY.name,
            totalOrderQty,
            traderUrl
          ).then(res => ({ role: "Trader", success: res.success, error: res.error }))
        );
      }

      // 2. Send Transporter Pick-up Request to Transporter via their permanent portal
      if (selectedTransporter && insertedPoId && transporterPortalLink) {
        let formattedPhone = selectedTransporter.replace(/\D/g, "");
        if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;

        whatsappPromises.push(
          sendTransporterConfirmationMessage(
            formattedPhone,
            nextPoNumber,
            transporterPortalLink,
            activeCompany?.name || COMPANY.name,
            activeParty,
            traderUrl
          ).then(res => ({ role: "Transporter", success: res.success, error: res.error }))
        );
      }

      if (whatsappPromises.length > 0) {
        const results = await Promise.all(whatsappPromises);
        results.forEach(res => {
          if (res.success) {
            console.log(`✅ Successfully sent WhatsApp confirmation message to ${res.role}`);
          } else {
            console.error(`❌ Failed to send WhatsApp message to ${res.role}:`, res.error);
          }
        });
      }

      alert("Purchase Orders successfully generated and submitted to Supabase!");
      
      // Reset all model fields
      setActiveParty("");
      setSelectedTransporter("");
      setSelectedReceiver("");
      setShippingError("");
      
      // Re-fetch next PO number and refresh page data
      await loadPageData();

    } catch (error) {
      console.error("Error generating/uploading PDF:", error);
      alert("An error occurred during PDF export: " + error.message);
    } finally {
      isSubmittingRef.current = false;
      setIsUploading(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      const traderDoc = (
        <TraderPDF
          partyName={activeParty}
          items={itemsForActiveParty}
          poNumber={nextPoNumber || "Loading..."}
          poDate={poDate}
          vendorDetails={activeVendorDetails}
          companyInfo={activeCompany}
        />
      );

      await previewPdfInNewTab(traderDoc);
    } catch (error) {
      console.error("Error previewing PDF:", error);
      alert("An error occurred during PDF preview: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

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
  }, [activeParty, isUploading, activeVendorDetails, selectedTransporter, selectedReceiver, itemsForActiveParty]);

  const poDate = today();

  return (
    <div className="po-page">

      {/* Top bar */}
      <div className="po-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div className="po-topbar-left">
          <h1>Purchase Orders</h1>
          <p>Select a vendor to view or print their Purchase Order</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="po-btn-secondary" 
            onClick={handlePreviewPDF} 
            disabled={!activeParty || isUploading}
            style={{ margin: 0 }}
          >
            <FileText size={15} /> Preview PDF
          </button>
          <button 
            className="po-btn-secondary" 
            onClick={handleDownloadPDF} 
            disabled={!activeParty || isUploading}
            style={{ margin: 0 }}
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

      {!isLoading && dbParties.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }} ref={printRef}>
          <PurchaseOrderPreview
            id="shipping-details-pdf-trader"
            partyName={activeParty}
            items={itemsForActiveParty}
            poNumber={nextPoNumber || "Loading..."}
            poDate={poDate}
            dbParties={dbParties}
            onPartyChange={setActiveParty}
            vendorDetails={activeVendorDetails}
            companyInfo={activeCompany}
            transporters={transporters}
            receivers={receivers}
            selectedTransporter={selectedTransporter}
            setSelectedTransporter={setSelectedTransporter}
            selectedReceiver={selectedReceiver}
            setSelectedReceiver={setSelectedReceiver}
            shippingError={shippingError}
          />
        </div>
      )}

    </div>
  );
};

export default PurchaseOrder;

