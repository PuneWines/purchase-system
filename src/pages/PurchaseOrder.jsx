import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, ShoppingCart, FileText, Trash2 } from "lucide-react";
import useCompanyStore from "../store/useCompanyStore";
import useShopStore from "../store/useShopStore";
import "../styles/PurchaseOrder.css";

// Components
import PurchaseOrderPreview from "../components/purchase-order/PurchaseOrderPreview";
import Toast, { useToast } from "../components/Toast";

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
  getOrCreateReceiverPortalLink,
  excludeIndentItems,
  deleteIndentAfterPO,
  markApprovedItemsAsOrdered,
  fetchItemList
} from "../services/purchaseOrderService";
import { generatePdfBlob, uploadPdfBlob, previewPdfInNewTab } from "../services/pdfService";
import { sendPOConfirmationMessage, sendTransporterConfirmationMessage, sendReceiverConfirmationMessage } from "../services/whatsappService";

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

  const { toasts, addToast, removeToast } = useToast();
  const [removedItemIds, setRemovedItemIds] = useState(new Set());

  // Manual PO states
  const [poMode, setPoMode] = useState("standard"); // "standard" or "manual"
  const [manualItems, setManualItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemBox, setNewItemBox] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [itemList, setItemList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemOverrides, setItemOverrides] = useState({});

  const normalizePoItem = (item) => {
    const closingQty = item.closingQty != null && item.closingQty !== ""
      ? parseFloat(item.closingQty) || 0
      : item.closingQty;
    const rawOrderBox = item.orderBox != null && item.orderBox !== ""
      ? parseFloat(item.orderBox) || 0
      : 0;
    const rawOrderQty = item.orderQty != null && item.orderQty !== ""
      ? parseFloat(item.orderQty) || 0
      : 0;
    const qtyType = rawOrderBox >= 0.9 ? "Box" : "Bottles";
    const orderBox = rawOrderBox;
    const orderQty = rawOrderQty;
    const displayQty = qtyType === "Box"
      ? Math.round(orderBox).toString()
      : Math.ceil(orderQty).toString();

    return {
      ...item,
      closingQty,
      orderBox,
      orderQty,
      qtyType,
      displayQty
    };
  };

  // Reset states when active vendor changes or PO mode changes
  useEffect(() => {
    setRemovedItemIds(new Set());
    setNewItemName("");
    setNewItemBox("");
    setNewItemQty("");
    setSelectedItem(null);
    setItemOverrides({});
  }, [activeParty, poMode]);

  const queryClient = useQueryClient();

  const { data: pageDataResponse, isLoading: isPageDataLoading } = useQuery({
    queryKey: ["purchaseOrderPageData"],
    queryFn: fetchPageData,
  });

  const { data: nextPoVal } = useQuery({
    queryKey: ["nextPoNumber"],
    queryFn: fetchNextPoNumber,
    staleTime: 0,
  });

  const { data: itemsListVal } = useQuery({
    queryKey: ["itemList"],
    queryFn: fetchItemList,
    staleTime: 0,
    gcTime: 0,
  });

  // Sync React Query data to local state for seamless backwards compatibility
  useEffect(() => {
    if (pageDataResponse) {
      if (pageDataResponse.vendorsData) setVendorsList(pageDataResponse.vendorsData);
      if (pageDataResponse.transpData) setTransporters(pageDataResponse.transpData);
      if (pageDataResponse.recvData) setReceivers(pageDataResponse.recvData);

      const existingPos = pageDataResponse.poData || [];
      const filteredIndentData = (pageDataResponse.indentData || []).filter(item => {
        if (!item.unique_indent_id || !item.party_name) return true;
        const hasPo = existingPos.some(
          po => po.indent_id === item.unique_indent_id &&
            po.vendor_name?.trim().toLowerCase() === item.party_name?.trim().toLowerCase()
        );
        return !hasPo;
      });

      setApprovedItems(filteredIndentData);
    }
  }, [pageDataResponse]);

  useEffect(() => {
    if (nextPoVal) {
      setNextPoNumber(nextPoVal);
    }
  }, [nextPoVal]);

  useEffect(() => {
    if (itemsListVal) {
      setItemList(itemsListVal);
    }
  }, [itemsListVal]);

  useEffect(() => {
    setIsLoading(isPageDataLoading);
  }, [isPageDataLoading]);

  // Keep loadPageData as a compatibility wrapper that invalidates the query client cache
  const loadPageData = async (shouldShowLoading = true) => {
    if (shouldShowLoading) setIsLoading(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderPageData"] }),
      queryClient.invalidateQueries({ queryKey: ["nextPoNumber"] }),
      queryClient.invalidateQueries({ queryKey: ["itemList"] })
    ]);
    if (shouldShowLoading) setIsLoading(false);
  };

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const filteredApprovedItems = useMemo(() => {
    if (selectedShop === "All") return approvedItems;
    return approvedItems.filter(item => item.shop_name === selectedShop);
  }, [approvedItems, selectedShop]);

  const dbParties = useMemo(() => {
    if (poMode === "manual") {
      return [...new Set(vendorsList.map(v => v.party_name).filter(Boolean))];
    }
    return [...new Set(filteredApprovedItems.map(d => d.party_name).filter(Boolean))];
  }, [filteredApprovedItems, vendorsList, poMode]);

  // If the activeParty is no longer valid for the selected shop/mode filter, clear it
  useEffect(() => {
    if (activeParty && !dbParties.includes(activeParty)) {
      setActiveParty("");
    }
  }, [selectedShop, dbParties, activeParty]);

  const itemsForActiveParty = useMemo(() => {
    let list = [];
    if (poMode === "manual") {
      list = [...manualItems];
    } else {
      const rawItems = transformActivePartyItems(filteredApprovedItems, activeParty);
      list = rawItems.filter(item => !removedItemIds.has(item.id));
    }

    list = list.map(item => normalizePoItem({
      ...item,
      ...(itemOverrides[item.id] || {})
    }));

    // Sort items by name (ascending) first, then by ML quantity (ascending)
    return list.sort((a, b) => {
      const nameA = (a.itemName || "").trim();
      const nameB = (b.itemName || "").trim();
      const nameComp = nameA.localeCompare(nameB);
      if (nameComp !== 0) return nameComp;

      const mlA = parseFloat(a.mls !== undefined ? a.mls : a.ml_s) || 0;
      const mlB = parseFloat(b.mls !== undefined ? b.mls : b.ml_s) || 0;
      return mlA - mlB;
    });
  }, [filteredApprovedItems, activeParty, removedItemIds, poMode, manualItems, itemOverrides]);

  const handleUpdatePoItem = (itemId, field, value) => {
    const currentItem = itemsForActiveParty.find(item => item.id === itemId);
    if (!currentItem) return;

    const nextValue = value === "" ? "" : value;
    let nextItem = {
      ...currentItem,
      ...(itemOverrides[itemId] || {}),
      [field]: nextValue
    };

    const bcs = parseFloat(nextItem.bcs ?? nextItem.bc_s) || 0;

    if (field === "orderBox") {
      const parsedBox = value === "" ? "" : parseFloat(value) || 0;
      nextItem.orderBox = parsedBox;
      if (bcs) {
        nextItem.orderQty = value === "" ? "" : Math.round((parseFloat(value) || 0) * bcs);
      }
    }

    if (field === "orderQty") {
      const parsedQty = value === "" ? "" : parseFloat(value) || 0;
      nextItem.orderQty = parsedQty;
      if (bcs) {
        nextItem.orderBox = value === "" ? "" : parseFloat((parsedQty / bcs).toFixed(4));
      }
    }

    const normalizedItem = normalizePoItem(nextItem);

    setItemOverrides(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        closingQty: normalizedItem.closingQty,
        orderBox: normalizedItem.orderBox,
        orderQty: normalizedItem.orderQty,
        qtyType: normalizedItem.qtyType,
        displayQty: normalizedItem.displayQty
      }
    }));
  };

  const handleRemoveItem = (itemId) => {
    if (poMode === "manual") {
      setManualItems(prev => prev.filter(item => item.id !== itemId));
      addToast("Item removed from manual list.", "info");
      return;
    }
    const item = itemsForActiveParty.find(i => i.id === itemId);
    const itemName = item ? item.itemName : "this item";
    if (window.confirm(`Are you sure you want to remove "${itemName}" from the Purchase Order?`)) {
      setRemovedItemIds(prev => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
      addToast(`Removed "${itemName}" from current PO view.`, "info");
    }
  };

  const handleItemSelection = (item) => {
    setSelectedItem(item && !item.isCustom ? item : null);
    setNewItemName(item ? item.item_name : "");

    if (item && !item.isCustom) {
      const bcs = item["bc_s"];
      if (bcs) {
        if (newItemBox && !newItemQty) {
          const boxVal = parseFloat(newItemBox) || 0;
          setNewItemQty(Math.round(boxVal * bcs).toString());
        } else if (newItemQty && !newItemBox) {
          const bottleVal = parseInt(newItemQty, 10) || 0;
          setNewItemBox(parseFloat((bottleVal / bcs).toFixed(4)).toString());
        }
      }
    }
  };

  const handleBoxQtyChange = (val) => {
    setNewItemBox(val);
    if (selectedItem) {
      const bcs = selectedItem["bc_s"];
      if (bcs && val !== "") {
        const boxVal = parseFloat(val) || 0;
        setNewItemQty(Math.round(boxVal * bcs).toString());
      } else if (val === "") {
        setNewItemQty("");
      }
    }
  };

  const handleBottleQtyChange = (val) => {
    setNewItemQty(val);
    if (selectedItem) {
      const bcs = selectedItem["bc_s"];
      if (bcs && val !== "") {
        const bottleVal = parseInt(val, 10) || 0;
        setNewItemBox(parseFloat((bottleVal / bcs).toFixed(4)).toString());
      } else if (val === "") {
        setNewItemBox("");
      }
    }
  };

  const handleManualAddItem = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) {
      addToast("Please enter or select an Item Name.", "error");
      return;
    }

    const boxQty = parseFloat(newItemBox) || 0;
    const bottleQty = parseInt(newItemQty, 10) || 0;

    if (boxQty <= 0 && bottleQty <= 0) {
      addToast("Please enter a valid Box Quantity or Bottle Quantity (> 0).", "error");
      return;
    }

    if (boxQty < 0 || bottleQty < 0) {
      addToast("Quantities cannot be negative.", "error");
      return;
    }

    // Determine the qtyType and displayQty based on quantities
    const qtyType = boxQty >= 0.90 ? "Box" : "Bottles";
    const displayQty = qtyType === "Box" ? Math.round(boxQty).toString() : Math.ceil(bottleQty).toString();

    const newItemObj = {
      id: `manual-${Date.now()}-${Math.random()}`,
      itemName: trimmedName,
      brandName: trimmedName,
      bc_s: selectedItem ? selectedItem["bc_s"] : null,
      ml_s: selectedItem ? selectedItem["ml_s"] : null,
      orderBox: boxQty,
      orderQty: bottleQty,
      qtyType,
      displayQty,
      shopName: selectedShop
    };

    setManualItems(prev => [...prev, newItemObj]);
    setNewItemName("");
    setNewItemBox("");
    setNewItemQty("");
    setSelectedItem(null);
    addToast(`Added item "${trimmedName}" to manual PO.`, "success");
  };

  const handleDeleteVendor = async (vendorName) => {
    const itemsToExclude = filteredApprovedItems.filter(item => item.party_name === vendorName);
    if (itemsToExclude.length === 0) {
      addToast(`No items found to exclude for vendor "${vendorName}".`, "warning");
      return;
    }

    const confirmMsg = `Are you sure you want to delete vendor "${vendorName}" from available PO selection?\n\nThis will exclude all ${itemsToExclude.length} approved item(s) for this vendor under the selected shop "${selectedShop}".`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const idsToExclude = itemsToExclude.map(item => item.id);
      await excludeIndentItems(idsToExclude, "vendor_removed_from_po");

      addToast(`Vendor "${vendorName}" removed from PO selection.`, "success");

      if (activeParty === vendorName) {
        setActiveParty("");
      }

      await loadPageData(false);
    } catch (err) {
      console.error("Error deleting vendor:", err);
      addToast("Failed to delete vendor: " + err.message, "error");
    }
  };

  // Reactively auto-select company based on selected vendor (activeParty) and their items
  useEffect(() => {
    if (!activeParty) {
      setSelectedCompanyId("none");
      return;
    }

    let shopName = "";
    if (poMode === "manual") {
      shopName = (selectedShop || "").trim().toLowerCase();
    } else {
      if (itemsForActiveParty.length > 0) {
        shopName = (itemsForActiveParty[0]?.shopName || itemsForActiveParty[0]?.shop_name || "").trim().toLowerCase();
      }
    }

    if (!shopName || shopName === "all") {
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
  }, [activeParty, itemsForActiveParty, companies, poMode, selectedShop]);

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

    if (poMode === "manual" && selectedShop === "All") {
      addToast("Please select a specific shop from the sidebar filter to create a Manual PO.", "error");
      return;
    }

    if (itemsForActiveParty.length === 0) {
      addToast("Please select a vendor and add at least one item before generating the PO.", "error");
      return;
    }

    if (!activeVendorDetails?.contact) {
      addToast("Error: The selected vendor does not have a contact number. Vendor contact number is mandatory to generate a PO.", "error");
      setShippingError("The selected vendor does not have a contact number. Vendor contact number is mandatory to generate a PO.");
      return;
    }

    const isKunalShop = poMode === "manual"
      ? selectedShop.toUpperCase() === "KUNAL"
      : itemsForActiveParty.some(item => item.shopName?.toUpperCase() === "KUNAL" || item.shop_name?.toUpperCase() === "KUNAL");

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
      const currentIndentId = poMode === "manual" ? null : (itemsForActiveParty.length > 0 ? itemsForActiveParty[0].unique_indent_id : null);
      const firstBrandName = itemsForActiveParty.length > 0 ? itemsForActiveParty[0].brandName : null;
      // Capture shop name at creation time so it survives indent_items deletion
      const currentShopName = poMode === "manual"
        ? selectedShop
        : (itemsForActiveParty.length > 0
          ? (itemsForActiveParty[0].shopName || itemsForActiveParty[0].shop_name || null)
          : null);

      let totalOrderQty = 0;
      let totalOrderBox = 0;

      itemsForActiveParty.forEach((item) => {
        if (item.qtyType === "Box") {
          totalOrderBox += Math.round(item.orderBox || 0);
        } else {
          totalOrderQty += Math.ceil(item.orderQty || 0);
        }
      });

      const insertedData = await insertPurchaseOrder({
        po_number: nextPoNumber,
        vendor_name: activeParty,
        vendor_id: currentVendorId,
        trader_pdf_url: traderUrl,
        receiver_pdf_url: receiverUrl,
        transporter_pdf_url: traderUrl,
        indent_id: currentIndentId,
        first_brand_name: firstBrandName,
        shop_name: currentShopName,
        total_order_qty: totalOrderQty,
        total_order_box: totalOrderBox,
        transporter_number: selectedTransporter || null,
        receiver_number: selectedReceiver || null,
        po_items: itemsForActiveParty,
        po_type: poMode === "manual" ? "manual_po" : "system_po"
      });

      const insertedPoId = insertedData[0]?.id;

      // --- Mark approved items as ordered in approved_indent_items now that PO is created ---
      if (poMode !== "manual" && currentIndentId && insertedPoId) {
        try {
          await markApprovedItemsAsOrdered(currentIndentId, activeParty, insertedPoId);
          console.log("✅ Approved items marked as ordered after PO creation:", currentIndentId);
        } catch (statusError) {
          console.error("⚠️ PO created but failed to update status of approved items:", statusError);
          addToast(
            "PO created successfully, but failed to update status of approved items. Please verify manually.",
            "warning"
          );
        }
      }

      // Update deleted/removed items in database to be is_excluded: true
      if (poMode !== "manual" && removedItemIds.size > 0) {
        try {
          await excludeIndentItems(Array.from(removedItemIds), "removed_from_po");
          console.log("Successfully excluded removed items in DB");
        } catch (exError) {
          console.error("Failed to exclude removed items in DB:", exError);
        }
      }

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

      // 3. Send Receiver Delivery Alert to Receiver via their permanent portal
      if (selectedReceiver && insertedPoId && receiverPortalLink) {
        let formattedPhone = selectedReceiver.replace(/\D/g, "");
        if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;

        whatsappPromises.push(
          sendReceiverConfirmationMessage(
            formattedPhone,
            nextPoNumber,
            receiverPortalLink,
            activeCompany?.name || COMPANY.name,
            activeParty,
            traderUrl
          ).then(res => ({ role: "Receiver", success: res.success, error: res.error }))
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

      addToast("Purchase Orders successfully generated and submitted to Supabase!", "success");

      // Reset all model fields
      setActiveParty("");
      setSelectedTransporter("");
      setSelectedReceiver("");
      setShippingError("");

      // Re-fetch next PO number and refresh page data
      await loadPageData();

    } catch (error) {
      console.error("Error generating/uploading PDF:", error);
      addToast("An error occurred during PDF export: " + error.message, "error");
    } finally {
      isSubmittingRef.current = false;
      setIsUploading(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (isUploading) return;

    if (poMode === "manual" && selectedShop === "All") {
      addToast("Please select a specific shop from the sidebar filter first.", "error");
      return;
    }

    if (itemsForActiveParty.length === 0) {
      addToast("Please select a vendor and add at least one item before previewing the PDF.", "error");
      return;
    }

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
      addToast("An error occurred during PDF preview: " + error.message, "error");
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
      <Toast toasts={toasts} removeToast={removeToast} />

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

      {/* Mode Selector Tab Replacement */}
      {/* Mode Toggle */}
      <div className="flex justify-center px-5 pt-3 bg-white border border-b-0 border-slate-200 rounded-t-xl">
        <div
          role="switch"
          aria-checked={poMode === "manual"}
          tabIndex={0}
          onClick={() => {
            const next = poMode === "standard" ? "manual" : "standard";
            setPoMode(next);
            setActiveParty("");
            if (next === "manual") setManualItems([]);
          }}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              const next = poMode === "standard" ? "manual" : "standard";
              setPoMode(next);
              setActiveParty("");
              if (next === "manual") setManualItems([]);
            }
          }}
          className="relative flex items-center bg-slate-100 border border-slate-300 rounded-full p-[3px] cursor-pointer select-none w-64"
        >
          {/* Sliding thumb */}
          <div
            className={`absolute top-[3px] left-[3px] bottom-[3px] w-[calc(50%-3px)] bg-white rounded-full border border-slate-200 shadow-sm pointer-events-none transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${poMode === "manual" ? "translate-x-[calc(100%+3px)]" : "translate-x-0"
              }`}
          />

          {/* Standard PO */}
          <div className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12.5px] relative z-10 pointer-events-none transition-colors duration-150 ${poMode === "standard" ? "font-medium text-slate-800" : "font-normal text-slate-400"
            }`}>
            <ShoppingCart size={13} />
            Standard PO
          </div>

          {/* Manual PO */}
          <div className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12.5px] relative z-10 pointer-events-none transition-colors duration-150 ${poMode === "manual" ? "font-medium text-slate-800" : "font-normal text-slate-400"
            }`}>
            <FileText size={13} />
            Manual PO
          </div>
        </div>
      </div>
      <div className="h-2.5 bg-white border-x border-slate-200" />

      {/* ✅ Single closing panel — wraps ALL states together */}
      <div className="border border-t-0 border-slate-200 rounded-b-xl bg-white">

        {isLoading && (
          <div className="po-empty" style={{ border: 'none', boxShadow: 'none' }}>
            <h2 style={{ color: '#64748b' }}>Loading data...</h2>
          </div>
        )}

        {!isLoading && poMode === "standard" && dbParties.length === 0 && (
          <div className="po-empty" style={{ border: 'none', boxShadow: 'none' }}>
            <ShoppingCart size={40} style={{ marginBottom: 16, opacity: 0.5 }} />
            <h2>No Pending Approved Indents</h2>
            <p>Please approve indents first, or switch to Manual PO mode.</p>
          </div>
        )}

        {!isLoading && poMode === "manual" && selectedShop === "All" && (
          <div className="po-empty" style={{ border: 'none', boxShadow: 'none' }}>
            <ShoppingCart size={40} style={{ marginBottom: 16, opacity: 0.5 }} />
            <h2>Select a Shop</h2>
            <p>Please select a specific shop from the top-left sidebar filter to create a Manual PO.</p>
          </div>
        )}

        {!isLoading && (poMode === "manual" ? selectedShop !== "All" : dbParties.length > 0) && (
          <div ref={printRef} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
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
              onRemoveItem={handleRemoveItem}
              onUpdateItem={handleUpdatePoItem}
              onDeleteVendor={poMode === "manual" ? null : handleDeleteVendor}
              poMode={poMode}
              itemList={itemList}
              selectedItem={selectedItem}
              onItemSelect={handleItemSelection}
              newItemName={newItemName}
              newItemBox={newItemBox}
              onBoxQtyChange={handleBoxQtyChange}
              newItemQty={newItemQty}
              onBottleQtyChange={handleBottleQtyChange}
              onAddItem={handleManualAddItem}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default PurchaseOrder;
