import React, { useState, useRef, useEffect } from "react";
import * as XLSX from 'xlsx';
import { Upload, Settings2, Loader2, List, Clock, CheckCircle, Send, ChevronDown, ChevronRight, Package, Trash2 } from "lucide-react";
import "../styles/Pages.css";

import Toast, { useToast } from "../components/Toast";
import { supabase } from "../../utils/supabase";

const Indent = () => {
  const [tableData, setTableData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('indent_tableData');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [masterItemsList, setMasterItemsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toasts, addToast, removeToast } = useToast();
  const [submittedHistory, setSubmittedHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedSubmissions, setExpandedSubmissions] = useState({});
  const [submissionItems, setSubmissionItems] = useState({});

  const fetchSubmittedHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("indents")
        .select(`
          id,
          shop_name,
          status,
          created_at,
          indent_items ( id )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        addToast("Error fetching history: " + error.message, "error");
        throw error;
      }

      const historyData = (data || []).map(row => ({
        ...row,
        itemCount: row.indent_items ? row.indent_items.length : 0
      }));
      setSubmittedHistory(historyData);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSubmittedHistory();
  }, []);

  React.useEffect(() => {
    sessionStorage.setItem('indent_tableData', JSON.stringify(tableData));
  }, [tableData]);

  React.useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("masterItem")
        .select("item_name, avg_sale, shop_id");

      if (error) throw error;

      const rawItems = (data || []).map((item) => ({
        itemName: (item.item_name || "").trim(),
        avgSale: parseFloat(item.avg_sale) || 0,
        shopId: (item.shop_id || "").trim().toLowerCase(),
      }));

      setMasterItemsList(rawItems);
    } catch (error) {
      console.error("Error fetching master data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [thresholdDays, setThresholdDays] = useState(() => {
    try {
      const saved = localStorage.getItem('indent_thresholdDays');
      return saved ? JSON.parse(saved) : {
        IMFL: 4,
        BEER: 6,
        WINE: 4,
        MML: 4
      };
    } catch (e) {
      return {
        IMFL: 4,
        BEER: 6,
        WINE: 4,
        MML: 4
      };
    }
  });

  React.useEffect(() => {
    localStorage.setItem('indent_thresholdDays', JSON.stringify(thresholdDays));
  }, [thresholdDays]);

  const [daysDivisor, setDaysDivisor] = useState(() => {
    try {
      const saved = localStorage.getItem('indent_daysDivisor');
      return saved ? JSON.parse(saved) : 30;
    } catch (e) {
      return 30;
    }
  });

  React.useEffect(() => {
    localStorage.setItem('indent_daysDivisor', JSON.stringify(daysDivisor));
  }, [daysDivisor]);

  const [showModal, setShowModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  const shops = ["FRIENDS", "VISHAL", "MADHURA", "KUNAL", "BALAJI"];

  const fileInputRef = useRef(null);

  // ── Shared row processing: takes a 2D array of strings (rows × cols) ──
  const processRows = (allRows) => {
    if (allRows.length < 2) return;

    const knownKeywords = ['party name', 'brand name', 'liquor type', 'size', 'mls', 'ml', 'item', 'name'];
    let headerRowIdx = -1;
    let headers = [];

    // Find real header row (scan first 15 rows)
    for (let i = 0; i < Math.min(15, allRows.length); i++) {
      const row = allRows[i].map(c => String(c ?? '').toLowerCase().trim());
      if (row.some(h => knownKeywords.some(k => h.includes(k)))) {
        headerRowIdx = i;
        headers = row;
        break;
      }
    }
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      headers = allRows[0].map(c => String(c ?? '').toLowerCase().trim());
    }

    console.log('[File Debug] Headers found:', headers);
    console.log('[File Debug] Header row index:', headerRowIdx);

    // Exact match first, then partial
    const getIndex = (exact, partial) => {
      let idx = headers.findIndex(h => exact.some(p => h === p));
      if (idx !== -1) return idx;
      return headers.findIndex(h => partial.some(p => h.includes(p)));
    };

    // Column letters from user spec: E=4, G=6, J=9, L=11 (0-indexed)
    const partyNameIdx = getIndex(['party name'], ['party name', 'party', 'shop', 'store']);
    const itemNameIdx = getIndex(['item name'], ['item name', 'item', 'product', 'particulars', 'description']);
    const brandNameIdx = getIndex(['brand name'], ['brand name', 'brand']);
    const mlsIdx = getIndex(['size (mls)', 'size (mis)', 'size(mls)', 'size(mis)'], ['size (mls)', 'size (mis)', 'size', 'mls', 'ml', 'volume']);
    const liquorTypeIdx = getIndex(['liquor type'], ['liquor type', 'liquor', 'type', 'category']);
    // 'qty out' / 'quantity out' only — NOT 'sale' to avoid matching avg-sale columns
    const qtyOutIdx = getIndex(['quantity out', 'qty out', 'qty out (bottles)'], ['quantity out', 'qty out', 'opening stock']);
    // closing stock in BOTTLE (not box) — prioritise 'bottle' over generic 'closing'
    const closingQtyIdx = getIndex(['closing stock in bottle', 'closing qty', 'closing quantity', 'closing stock (bottles)'],
      ['closing stock in bottle', 'closing qty', 'closing', 'balance']);
    // bpc = bottles per case; also b/cs, bcs
    const bcsIdx = getIndex(['bpc', 'b/cs', 'bcs', 'bottles per case'], ['bpc', 'b/cs', 'bcs', 'b cs', 'bottles per case', 'per case']);

    // Hard fallbacks to exact column positions if no header matched
    const fPartyName = partyNameIdx !== -1 ? partyNameIdx : (headers.length > 4 ? 4 : -1);
    // prefer item name (full) for matching; fall back to brand name, then col G=6
    const fItemName = itemNameIdx !== -1 ? itemNameIdx : (brandNameIdx !== -1 ? brandNameIdx : (headers.length > 6 ? 6 : 0));
    const fBrandName = brandNameIdx !== -1 ? brandNameIdx : fItemName;
    const fMls = mlsIdx !== -1 ? mlsIdx : (headers.length > 9 ? 9 : -1);
    const fLiquorType = liquorTypeIdx !== -1 ? liquorTypeIdx : (headers.length > 11 ? 11 : -1);

    console.log('[File Debug] Cols → partyName:', fPartyName, 'itemName:', fItemName, 'brandName:', fBrandName, 'mls:', fMls, 'liquorType:', fLiquorType, 'qtyOut:', qtyOutIdx, 'closingQty:', closingQtyIdx, 'bcs:', bcsIdx);

    const records = [];
    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const row = allRows[i].map(c => String(c ?? '').trim());
      // Use item name as the primary key for matching; fall back to brand name
      const itemVal = fItemName !== -1 ? row[fItemName] : '';
      const brandVal = fBrandName !== -1 ? row[fBrandName] : '';
      if (!itemVal && !brandVal) continue;

      records.push({
        itemName: itemVal || brandVal,   // full item name used for master-data matching
        brandName: brandVal || itemVal,    // brand name shown in Brand Name column
        partyName: fPartyName !== -1 ? (row[fPartyName] || '') : '',
        mls: fMls !== -1 ? (row[fMls] || '') : '',
        liquorType: fLiquorType !== -1 ? (row[fLiquorType] || '') : '',
        qtyOut: qtyOutIdx !== -1 && row[qtyOutIdx] ? parseFloat(row[qtyOutIdx]) : null,
        closingQty: closingQtyIdx !== -1 && row[closingQtyIdx] ? parseFloat(row[closingQtyIdx]) : null,
        bcs: bcsIdx !== -1 && row[bcsIdx] ? parseFloat(row[bcsIdx]) : null,
      });
    }

    console.log('[File Debug] Records parsed:', records.length, records[0] ?? '(none)');

    setTableData(() => {
      const matchedRecords = [];
      const shopKey = (selectedShop || "").trim().toLowerCase();

      records.forEach((record, idx) => {
        // Find match in master data to get avgSale, filtering by BOTH selected shop and item name
        const masterMatch = masterItemsList.find(
          m => m.shopId === shopKey && m.itemName.toLowerCase() === record.itemName.toLowerCase()
        );

        // ONLY include/show if there is a match in the masterItem table for the selected shop!
        if (masterMatch) {
          matchedRecords.push({
            id: Date.now() + idx,
            itemName: masterMatch.itemName, // use item name from masterItem for exact match
            avgSale: masterMatch.avgSale,
            qtyOut: record.qtyOut,
            closingQty: record.closingQty,
            brandName: record.brandName,
            bcs: record.bcs,
            mls: record.mls,
            liquorType: record.liquorType,
            partyName: record.partyName || selectedShop,
          });
        }
      });
      return matchedRecords;
    });

    setIsProcessing(false);
    setShowModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── File upload handler — supports .xlsx, .xls AND .csv ──
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setShowModal(false);

    // Yield to browser rendering so spinner can appear
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Score keywords we must find in a header row
        const targetKeywords = ['party name', 'brand name', 'liquor type', 'size', 'mls', 'ml'];

        let bestRows = null;
        let bestScore = -1;

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          // Look in first 15 rows for the best header row
          for (let i = 0; i < Math.min(15, rows.length); i++) {
            const row = rows[i].map(c => String(c ?? '').toLowerCase().trim());
            const score = targetKeywords.filter(kw => row.some(h => h.includes(kw))).length;
            if (score > bestScore) {
              bestScore = score;
              bestRows = rows;
            }
          }
        }

        console.log('[File Debug] Best sheet score:', bestScore, '— using', bestScore > 0 ? 'matched sheet' : 'first sheet');
        processRows(bestRows ?? XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' }
        ));
      };
      reader.readAsArrayBuffer(file);
    }, 150);
  };


  const handleThresholdChange = (type, value) => {
    setThresholdDays(prev => ({ ...prev, [type]: parseFloat(value) || 0 }));
  };

  const handleInlineChange = (id, field, value) => {
    setTableData(prevData => prevData.map(item => {
      if (item.id === id) {
        let parsedValue = value;
        if (field === 'qtyOut' || field === 'closingQty' || field === 'bcs') {
          parsedValue = value === "" ? null : parseFloat(value);
        }
        return { ...item, [field]: parsedValue };
      }
      return item;
    }));
  };



  const calculateRow = (row) => {
    // Only calculate if we have numbers for the required fields
    const hasData = row.qtyOut !== null && row.bcs !== null && row.closingQty !== null && row.bcs !== 0;

    let lastMonthSale = 0;
    let perDaySaleLastMonth = 0;
    let finalAvgSale = 0;
    let thresholdSale = 0;
    let boxClosingQty = 0;
    let orderBox = 0;
    let orderQty = 0;

    if (hasData) {
      // Helper to parse overrides safely and cascade them downstream
      const getActive = (val, calculated) => {
        if (val !== undefined && val !== null && val !== "") {
          const num = parseFloat(val);
          return isNaN(num) ? calculated : num;
        }
        return calculated;
      };

      lastMonthSale = getActive(row.lastMonthSale, row.qtyOut / row.bcs);
      perDaySaleLastMonth = getActive(row.perDaySaleLastMonth, (row.qtyOut / daysDivisor) / row.bcs);
      finalAvgSale = getActive(row.finalAvgSale, (row.avgSale + perDaySaleLastMonth) / 2);
      thresholdSale = getActive(row.thresholdSale, finalAvgSale * 6);
      boxClosingQty = getActive(row.boxClosingQty, Math.max(0, row.closingQty) / row.bcs);
      orderBox = getActive(row.orderBox, thresholdSale - boxClosingQty);
      orderQty = getActive(row.orderQty, orderBox * row.bcs);
    }

    return {
      lastMonthSale: hasData ? (row.lastMonthSale !== undefined && row.lastMonthSale !== null && row.lastMonthSale !== "" ? row.lastMonthSale : lastMonthSale.toFixed(2)) : "",
      perDaySaleLastMonth: hasData ? (row.perDaySaleLastMonth !== undefined && row.perDaySaleLastMonth !== null && row.perDaySaleLastMonth !== "" ? row.perDaySaleLastMonth : perDaySaleLastMonth.toFixed(2)) : "",
      finalAvgSale: hasData ? (row.finalAvgSale !== undefined && row.finalAvgSale !== null && row.finalAvgSale !== "" ? row.finalAvgSale : finalAvgSale.toFixed(2)) : "",
      thresholdSale: hasData ? (row.thresholdSale !== undefined && row.thresholdSale !== null && row.thresholdSale !== "" ? row.thresholdSale : thresholdSale.toFixed(2)) : "",
      boxClosingQty: hasData ? (row.boxClosingQty !== undefined && row.boxClosingQty !== null && row.boxClosingQty !== "" ? row.boxClosingQty : boxClosingQty.toFixed(2)) : "",
      orderBox: hasData ? (row.orderBox !== undefined && row.orderBox !== null && row.orderBox !== "" ? row.orderBox : orderBox.toFixed(2)) : "",
      orderQty: hasData ? (row.orderQty !== undefined && row.orderQty !== null && row.orderQty !== "" ? row.orderQty : orderQty.toFixed(2)) : ""
    };
  };

  const toggleSubmission = async (indentId) => {
    const isExpanding = !expandedSubmissions[indentId];
    setExpandedSubmissions(prev => ({ ...prev, [indentId]: isExpanding }));

    if (isExpanding && !submissionItems[indentId]) {
      try {
        const { data, error } = await supabase
          .from('indent_items')
          .select('*')
          .eq('indent_id', indentId);

        if (error) throw error;
        setSubmissionItems(prev => ({ ...prev, [indentId]: data }));
      } catch (error) {
        console.error("Error fetching details:", error);
        addToast("Failed to load submission details.", "error");
      }
    }
  };

  const handleIndentSubmit = async () => {
    setIsProcessing(true);
    try {
      const validItems = [];

      tableData.forEach((item) => {
        const calcs = calculateRow(item);
        const orderBoxVal = parseFloat(calcs.orderBox);

        // Filter out orderBox values that are NaN, or <= 0.5 (including negative)
        if (!isNaN(orderBoxVal) && orderBoxVal > 0.5) {
          validItems.push({ item, calcs });
        }
      });

      if (validItems.length === 0) {
        addToast("No valid data to submit. Only items with 'Order in Box' > 0.5 are allowed.", "error");
        setIsProcessing(false);
        return;
      }

      // 1. Fetch highest party index from Supabase
      let nextPartyIndex = 1;
      const { data: maxIdData, error: maxIdError } = await supabase
        .from("indent_items")
        .select("party_indent_id")
        .not("party_indent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!maxIdError && maxIdData && maxIdData.length > 0) {
        let maxIdx = 0;
        maxIdData.forEach(row => {
          if (row.party_indent_id && typeof row.party_indent_id === 'string') {
            const parts = row.party_indent_id.split('-');
            if (parts.length >= 3 && parts[0] === 'IN') {
              const idx = parseInt(parts[1], 10);
              if (!isNaN(idx) && idx > maxIdx) {
                maxIdx = idx;
              }
            }
          }
        });
        nextPartyIndex = maxIdx + 1;
      }

      // 2. Insert Header record into `indents`
      const headerPayload = {
        shop_name: selectedShop || 'UNKNOWN',
        status: 'Pending'
      };

      const { data: headerData, error: headerError } = await supabase
        .from("indents")
        .insert(headerPayload)
        .select()
        .single();

      if (headerError) throw headerError;
      const indentId = headerData.id;

      // 3. Generate IDs and create Line Items payload
      const partyMap = new Map();
      const itemsPayload = [];

      validItems.forEach(({ item, calcs }) => {
        const partyName = item.partyName || 'UNKNOWN';
        if (!partyMap.has(partyName)) {
          partyMap.set(partyName, { index: nextPartyIndex++, count: 1 });
        }
        const partyInfo = partyMap.get(partyName);
        const currentCount = partyInfo.count++;
        const partyIndentId = `IN-${partyInfo.index}-${currentCount.toString().padStart(2, '0')}`;

        itemsPayload.push({
          indent_id: indentId,
          party_indent_id: partyIndentId,
          item_name: item.itemName,
          fix_per_day_avg_sale: item.avgSale,
          qty_out: item.qtyOut,
          closing_qty: item.closingQty,
          brand_name: item.brandName,
          bcs: item.bcs,
          mls: item.mls,
          liquor_type: item.liquorType,
          party_name: item.partyName,
          last_month_sale_box: parseFloat(calcs.lastMonthSale) || 0,
          per_day_sale_last_month: parseFloat(calcs.perDaySaleLastMonth) || 0,
          final_avg_sale: parseFloat(calcs.finalAvgSale) || 0,
          threshold_sale: parseFloat(calcs.thresholdSale) || 0,
          closing_qty_box: parseFloat(calcs.boxClosingQty) || 0,
          order_box: parseFloat(calcs.orderBox) || 0,
          order_qty: parseFloat(calcs.orderQty) || 0,
        });
      });

      // 4. Insert into `indent_items`
      const { error: itemsError } = await supabase
        .from("indent_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      addToast(`Successfully submitted ${itemsPayload.length} records to Supabase!`, "success");
      setTableData([]); // clear CSV data
      sessionStorage.removeItem('indent_tableData');
      fetchSubmittedHistory(); // Refresh history table
    } catch (error) {
      console.error("Error submitting indent data:", error);
      addToast("Failed to submit data. Please check the console for details.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const tableHeaderStyle = {
    border: '1px solid #ffffff',
    padding: '12px 14px',
    textAlign: 'center',
    fontWeight: '600',
    color: '#334155', // Soft slate-700
    fontSize: '12px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  };

  const inlineInputStyle = {
    width: '100%',
    minWidth: '70px',
    padding: '10px 8px',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s',
    fontWeight: '500',
  };

  return (
    <div className="page-container" style={{ padding: '20px', maxWidth: '100%' }}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px', gap: '20px' }}>

        {/* Title and Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '700',
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: '1.2'
            }}>
              Indent Calculations
            </h1>
            {!isLoading && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: '600',
                border: '1px solid #bfdbfe',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <span style={{ marginRight: '6px', fontSize: '10px' }}>●</span>
                {tableData.length} Items
              </div>
            )}
          </div>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '15px',
            fontWeight: '400',
            letterSpacing: '0.01em'
          }}>
            Upload CSV or edit cells directly to calculate indents
          </p>
        </div>

        {/* Right Side Controls Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Professional Strip Format for Days Master */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#f8fafc',
            padding: '0 16px',
            height: '40px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>
              <Settings2 size={16} />
              <span>Threshold Days:</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {Object.entries(thresholdDays).map(([type, days]) => (
                <div key={type} style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    backgroundColor: '#f1f5f9',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#334155',
                    borderRight: '1px solid #cbd5e1'
                  }}>
                    {type}
                  </span>
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => handleThresholdChange(type, e.target.value)}
                    style={{
                      width: '45px',
                      padding: '4px',
                      textAlign: 'center',
                      border: 'none',
                      outline: 'none',
                      fontWeight: '600',
                      color: '#0f172a',
                      fontSize: '13px'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Divisor Selection UI */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#f8fafc',
            padding: '0 16px',
            height: '40px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>
              <Settings2 size={16} />
              <span>Divisor:</span>
            </div>
            <select
              value={daysDivisor}
              onChange={(e) => setDaysDivisor(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                fontWeight: '600',
                color: '#0f172a',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: '#fff'
              }}
            >
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>

          {/* Action Buttons: Upload & Submit */}
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  padding: '0 16px',
                  height: '40px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
              >
                <Upload size={18} />
                Upload CSV
              </button>
            </div>

            {tableData.length > 0 && !tableData[0]?.partyIndentId && (
              <div>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    padding: '0 16px',
                    height: '40px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: 'none',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#4338ca';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#4f46e5';
                  }}
                  onClick={handleIndentSubmit}
                >
                  <Send size={18} />
                  Submit Indent
                </button>
              </div>
            )}

            {tableData.length > 0 && (
              <div>
                <button
                  onClick={() => {
                    setTableData([]);
                    sessionStorage.removeItem('indent_tableData');
                    addToast("Data cleared successfully", "success");
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '0 16px',
                    height: '40px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: 'none',
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    flexShrink: 0,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; }}
                >
                  <Trash2 size={18} />
                  Clear Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {tableData.length > 0 ? (
        <>
          <div style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: '75vh',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#fff',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            willChange: 'transform'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'normal', tableLayout: 'auto' }}>
              <style>
                {`
              .page-container div::-webkit-scrollbar {
                height: 8px;
                width: 8px;
              }
              .page-container div::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
              }
              .page-container div::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              .page-container div::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `}
              </style>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th colSpan={tableData[0]?.partyIndentId ? "3" : "2"} style={{ ...tableHeaderStyle, backgroundColor: '#cbd5e1' }}>
                    Item Master File
                  </th>
                  <th colSpan="7" style={{ ...tableHeaderStyle, backgroundColor: '#e2e8f0' }}>
                    Excel File (Editable)
                  </th>
                  <th colSpan="7" style={{ ...tableHeaderStyle, backgroundColor: '#c7d2fe' }}>
                    Calculations
                  </th>
                </tr>
                <tr style={{ color: '#475569', whiteSpace: 'nowrap', fontSize: '12px' }}>
                  {tableData[0]?.partyIndentId && (
                    <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', minWidth: '100px', backgroundColor: '#e2e8f0' }}>Indent ID</th>
                  )}
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'left', minWidth: '220px', whiteSpace: 'normal', backgroundColor: '#e2e8f0' }}>Item Name</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', minWidth: '100px', whiteSpace: 'normal', backgroundColor: '#e2e8f0' }}>Fix per day avg sale in box</th>

                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>Quantity out</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>Closing Qty</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#f1f5f9', minWidth: '150px' }}>Brand Name</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>B/Cs</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>Mls</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>Liquor Type</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#f1f5f9', minWidth: '150px' }}>Party Name</th>

                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#e0e7ff', whiteSpace: 'normal', minWidth: '140px' }}>Last Month sale in box</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#e0e7ff', whiteSpace: 'normal', minWidth: '140px' }}>Per day sale </th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#e0e7ff', whiteSpace: 'normal', minWidth: '140px' }}>Final Avg Sale</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#e0e7ff', whiteSpace: 'normal', minWidth: '140px' }}>Threshold sale</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#e0e7ff', whiteSpace: 'normal', minWidth: '140px' }}>Closing qty in Box</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#e0e7ff', whiteSpace: 'normal', minWidth: '140px' }}>Order in Box</th>
                  <th style={{ border: '1px solid #fff', padding: '12px 8px', textAlign: 'center', backgroundColor: '#e0e7ff', whiteSpace: 'normal', minWidth: '140px' }}>Order in Qty</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((item, index) => {
                  const calcs = calculateRow(item);
                  const cellStyle = { border: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', color: '#475569' };
                  const rowBgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                  const inputBgColor = 'transparent';
                  const inputFocusBgColor = 'rgba(99, 102, 241, 0.05)';
                  const calcCellBgColor = index % 2 === 0 ? '#f8faff' : '#f4f7ff'; // Very soft indigo tint for calcs

                  return (
                    <tr key={item.id} className="indent-table-row" style={{ backgroundColor: rowBgColor }}>
                      {tableData[0]?.partyIndentId && (
                        <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'center', fontWeight: '600', color: '#0f172a', backgroundColor: '#f8fafc' }}>
                          {item.partyIndentId}
                        </td>
                      )}
                      <td style={{ ...cellStyle, padding: '12px 10px', fontWeight: '500', color: '#1e293b' }}>{item.itemName}</td>
                      <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'right', fontWeight: '500' }}>{item.avgSale}</td>

                      {/* Inline Editable Inputs */}
                      <td style={{ ...cellStyle, padding: 0 }}>
                        <input
                          type="number"
                          step="any"
                          value={item.qtyOut !== null ? item.qtyOut : ""}
                          onChange={(e) => handleInlineChange(item.id, 'qtyOut', e.target.value)}
                          style={{ ...inlineInputStyle, textAlign: 'right', backgroundColor: inputBgColor }}
                          placeholder="-"
                          onFocus={(e) => e.target.style.backgroundColor = inputFocusBgColor}
                          onBlur={(e) => e.target.style.backgroundColor = inputBgColor}
                        />
                      </td>
                      <td style={{ ...cellStyle, padding: 0 }}>
                        <input
                          type="number"
                          step="any"
                          value={item.closingQty !== null ? item.closingQty : ""}
                          onChange={(e) => handleInlineChange(item.id, 'closingQty', e.target.value)}
                          style={{ ...inlineInputStyle, textAlign: 'right', backgroundColor: inputBgColor }}
                          placeholder="-"
                          onFocus={(e) => e.target.style.backgroundColor = inputFocusBgColor}
                          onBlur={(e) => e.target.style.backgroundColor = inputBgColor}
                        />
                      </td>
                      <td style={{ ...cellStyle, padding: '12px 10px', color: '#1e293b', fontWeight: '500' }}>
                        {item.brandName || "—"}
                      </td>
                      <td style={{ ...cellStyle, padding: 0 }}>
                        <input
                          type="number"
                          step="any"
                          value={item.bcs !== null ? item.bcs : ""}
                          onChange={(e) => handleInlineChange(item.id, 'bcs', e.target.value)}
                          style={{ ...inlineInputStyle, textAlign: 'right', backgroundColor: inputBgColor }}
                          placeholder="-"
                          onFocus={(e) => e.target.style.backgroundColor = inputFocusBgColor}
                          onBlur={(e) => e.target.style.backgroundColor = inputBgColor}
                        />
                      </td>
                      <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'center' }}>
                        {item.mls || "—"}
                      </td>
                      <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'center' }}>
                        {item.liquorType || "—"}
                      </td>
                      <td style={{ ...cellStyle, padding: '12px 10px' }}>
                        {item.partyName || "—"}
                      </td>

                      {/* Calculation Display */}
                      <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'right', fontWeight: '500', color: '#4338ca', backgroundColor: calcCellBgColor }}>
                        {calcs.lastMonthSale || "—"}
                      </td>
                      <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'right', fontWeight: '500', color: '#4338ca', backgroundColor: calcCellBgColor }}>
                        {calcs.perDaySaleLastMonth || "—"}
                      </td>
                      <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'right', fontWeight: '500', color: '#4338ca', backgroundColor: calcCellBgColor }}>
                        {calcs.finalAvgSale || "—"}
                      </td>
                      <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'right', fontWeight: '500', color: '#4338ca', backgroundColor: calcCellBgColor }}>
                        {calcs.thresholdSale || "—"}
                      </td>
                      <td style={{ ...cellStyle, padding: '12px 10px', textAlign: 'right', fontWeight: '500', color: '#4338ca', backgroundColor: calcCellBgColor }}>
                        {calcs.boxClosingQty || "—"}
                      </td>
                      <td style={{ ...cellStyle, padding: 0, backgroundColor: calcCellBgColor }}>
                        <input
                          type="number"
                          step="any"
                          value={calcs.orderBox}
                          onChange={(e) => handleInlineChange(item.id, 'orderBox', e.target.value)}
                          style={{ ...inlineInputStyle, textAlign: 'right', fontWeight: '600', color: '#4338ca' }}
                          placeholder="-"
                        />
                      </td>
                      <td style={{ ...cellStyle, padding: 0, backgroundColor: calcCellBgColor }}>
                        <input
                          type="number"
                          step="any"
                          value={calcs.orderQty}
                          onChange={(e) => handleInlineChange(item.id, 'orderQty', e.target.value)}
                          style={{ ...inlineInputStyle, textAlign: 'right', fontWeight: '600', color: '#4338ca' }}
                          placeholder="-"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </>
      ) : (
        <div
          onClick={() => {
            if (!isLoading) setShowModal(true);
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1',
            color: '#64748b',
            cursor: isLoading ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            margin: '20px 0 40px 0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
          {isLoading ? (
            <>
              <Loader2 className="search-icon" style={{ animation: 'spin 1s linear infinite', width: '32px', height: '32px', color: '#94a3b8', marginBottom: '16px' }} />
              <p style={{ fontSize: '16px' }}>Loading master database reference...</p>
            </>
          ) : (
            <>
              <div style={{ padding: '12px', backgroundColor: '#e2e8f0', borderRadius: '50%', marginBottom: '12px' }}>
                <Upload style={{ width: '24px', height: '24px', color: '#475569' }} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#334155', margin: 0 }}>No Data Available</p>
              <p style={{ fontSize: '14px', marginTop: '6px', color: '#94a3b8' }}>Click here to upload your Indent CSV file</p>
            </>
          )}
        </div>
      )}

      {/* Submitted History Section */}
      <div style={{ marginTop: '40px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <List size={20} />
          Recent Indent Submissions
        </h2>

        {isLoadingHistory ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />
          </div>
        ) : submittedHistory.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {submittedHistory.map((history) => {
              const isExpanded = expandedSubmissions[history.id];
              const items = submissionItems[history.id] || [];

              return (
                <div key={history.id} style={{
                  backgroundColor: '#ffffff',
                  border: isExpanded ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: isExpanded ? '0 10px 25px -5px rgba(79, 70, 229, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease'
                }}>
                  {/* Header Row */}
                  <div
                    onClick={() => toggleSubmission(history.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 24px', backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '40px', height: '40px', borderRadius: '10px',
                        backgroundColor: isExpanded ? '#e0e7ff' : '#f1f5f9',
                        color: isExpanded ? '#4f46e5' : '#64748b'
                      }}>
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                          {history.shop_name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                            {history.itemCount} items
                          </span>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8' }}>
                            <Clock size={12} />
                            {new Date(history.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        backgroundColor: history.status === 'Pending' ? '#fef3c7' : '#dcfce7',
                        color: history.status === 'Pending' ? '#d97706' : '#16a34a',
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {history.status === 'Pending' ? <Clock size={12} /> : <CheckCircle size={12} />}
                        {history.status}
                      </span>
                      <div style={{ color: isExpanded ? '#4f46e5' : '#94a3b8', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                        <ChevronDown size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Sub-Table */}
                  <div style={{
                    maxHeight: isExpanded ? '10000px' : '0',
                    opacity: isExpanded ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 0.4s ease'
                  }}>
                    <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px' }}>
                      {items.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading items...</div>
                      ) : (
                        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '12px 16px' }}>Party Name</th>
                                <th style={{ padding: '12px 16px' }}>Item Name</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Avg Sale</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Order Box</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Order Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, idx) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', fontSize: '13px' }}>
                                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.party_name || "-"}</td>
                                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{item.item_name}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{item.fix_per_day_avg_sale || "-"}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#4338ca' }}>{item.order_box || "-"}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#4338ca' }}>{item.order_qty || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            No submissions found.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '450px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h2 style={{ margin: 0, textAlign: 'center', color: '#333' }}>Select Shop</h2>

            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '16px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="" disabled>Select Shop...</option>
              {shops.map(shop => (
                <option key={shop} value={shop}>{shop}</option>
              ))}
            </select>

            {selectedShop && (
              <div style={{ marginTop: '10px' }}>
                <label
                  htmlFor="csvUploadModal"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      handleFileUpload({ target: { files: [file] } });
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '24px',
                    backgroundColor: isDragging ? '#f0fdf4' : '#f8fafc',
                    color: isDragging ? '#15803d' : '#475569',
                    border: isDragging ? '2px dashed #22c55e' : '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '15px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    minHeight: '120px'
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '12px', backgroundColor: isDragging ? '#dcfce7' : '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Upload size={24} color={isDragging ? '#16a34a' : '#64748b'} />
                    </div>
                    <span>Click to Upload Excel / CSV</span>
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 'normal', marginTop: '8px', color: '#94a3b8' }}>
                    (or drag & drop file here)
                  </span>
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  id="csvUploadModal"
                />
              </div>
            )}

            <button
              onClick={() => {
                setShowModal(false);
                setSelectedShop("");
              }}
              style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: 'transparent',
                color: '#666',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite', width: '48px', height: '48px', color: '#10b981' }} />
          <h2 style={{ marginTop: '20px', color: '#334155', fontWeight: 'bold' }}>Processing File Data...</h2>
          <p style={{ color: '#64748b', fontSize: '15px' }}>Please wait while we prepare the indents.</p>
        </div>
      )}

    </div>
  );
};

export default Indent;
