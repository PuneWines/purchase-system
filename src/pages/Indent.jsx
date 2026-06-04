import React, { useState, useRef, useEffect } from "react";
import * as XLSX from 'xlsx';
import { Upload, Settings2, Loader2, List, Clock, CheckCircle, Send, ChevronDown, Package, Trash2, AlertTriangle, X, TrendingUp, TrendingDown, Database, RefreshCw, Eye, Filter, Search } from "lucide-react";
import "../styles/Pages.css";

import Toast, { useToast } from "../components/Toast";
import { supabase } from "../../utils/supabase";

// Accordion row for mobile view — must be a separate component so useState is not called inside .map()
const AccordionItem = ({ item, calcs, handleInlineChange }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex justify-between items-center hover:bg-[#f8fafc] transition-colors"
      >
        <div className="text-left">
          <p className="font-semibold text-[#0f172a] text-sm">{item.itemName}</p>
          <p className="text-[10px] text-[#64748b]">{item.brandName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#4338ca]">{calcs.orderBox} boxes</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="p-3 border-t border-[#e2e8f0] bg-[#faf9ff] space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#64748b] block">Qty Out:</span>
              <span className="font-semibold text-[#0f172a]">{item.qtyOut !== null ? item.qtyOut : "—"}</span>
            </div>
            <div>
              <span className="text-[#64748b] block">Closing Qty:</span>
              <span className="font-semibold text-[#0f172a]">{item.closingQty !== null ? item.closingQty : "—"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[#64748b] block">B/Cs:</span>
              <span className="font-semibold text-[#0f172a]">{item.bcs !== null ? item.bcs : "—"}</span>
            </div>
            <div className="col-span-2 mt-1">
              <span className="text-[#64748b] block">Order Qty (Editable):</span>
              <input
                type="number"
                value={calcs.orderQty}
                onChange={(e) => handleInlineChange(item.id, 'orderQty', e.target.value)}
                className="w-full mt-1 px-2 py-1 border rounded font-semibold text-[#4338ca] text-xs bg-white"
                placeholder="-"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Pill Component
const StatPill = ({ label, value, icon: Icon, color }) => (
  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${color} bg-white shadow-sm`}>
    <Icon size={14} />
    <span className="text-xs font-medium">{label}</span>
    <span className="text-xs font-bold">{value}</span>
  </div>
);

// View Modal Component
const SubmissionViewModal = ({ isOpen, onClose, submission, items, onDeleteItem, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.party_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm flex justify-center items-center z-[10000] p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0]">
          <div>
            <h2 className="text-xl font-bold text-[#0f172a]">{submission?.shop_name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[#64748b] flex items-center gap-1">
                <Clock size={12} />
                {new Date(submission?.created_at).toLocaleString()}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${submission?.status === 'Pending' ? 'bg-[#fef3c7] text-[#d97706]' : 'bg-[#dcfce7] text-[#16a34a]'
                }`}>
                {submission?.status === 'Pending' ? <Clock size={10} /> : <CheckCircle size={10} />}
                {submission?.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#f1f5f9] rounded-lg transition-colors">
            <X size={20} className="text-[#64748b]" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[#e2e8f0]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search items by name or party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[#e2e8f0]">
                <th className="text-left py-2 px-3 text-xs font-semibold text-[#64748b]">Item Name</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-[#64748b]">Party Name</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-[#64748b]">Order Box</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-[#64748b]">Order Qty</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-[#64748b]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                  <td className="py-2 px-3 text-[#0f172a] font-medium">{item.item_name}</td>
                  <td className="py-2 px-3 text-[#64748b] text-sm">{item.party_name || "-"}</td>
                  <td className="py-2 px-3 text-right font-bold text-[#4338ca]">{item.order_box}</td>
                  <td className="py-2 px-3 text-right font-bold text-[#4338ca]">{item.order_qty}</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => onDeleteItem(item.id, submission.id)}
                      className="p-1 text-[#ef4444] hover:bg-[#fee2e2] rounded transition-colors"
                      title="Delete item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-[#94a3b8]">No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e2e8f0] flex justify-between items-center">
          <span className="text-xs text-[#64748b]">{items.length} items total</span>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm font-medium hover:bg-[#4338ca] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

const Indent = () => {
  const [tableData, setTableData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('indent_tableData');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [duplicateCount, setDuplicateCount] = useState(() => {
    try {
      const saved = sessionStorage.getItem('indent_duplicateCount');
      return saved ? JSON.parse(saved) : 0;
    } catch (e) {
      return 0;
    }
  });

  useEffect(() => {
    sessionStorage.setItem('indent_duplicateCount', JSON.stringify(duplicateCount));
  }, [duplicateCount]);

  const [isLoading, setIsLoading] = useState(false);

  const { toasts, addToast, removeToast } = useToast();
  const [submittedHistory, setSubmittedHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [submissionItems, setSubmissionItems] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [mobileView, setMobileView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedSubmissionItems, setSelectedSubmissionItems] = useState([]);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchSubmittedHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data: indents, error } = await supabase
        .from("indents")
        .select(`
          id,
          shop_name,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        addToast("Error fetching history: " + error.message, "error");
        throw error;
      }

      if (!indents || indents.length === 0) {
        setSubmittedHistory([]);
        return;
      }

      // Fetch all indent items for these indents, paginated to bypass the 1000-row limit
      const indentIds = indents.map(indent => indent.id);
      let allItems = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from("indent_items")
          .select("indent_id, is_excluded")
          .in("indent_id", indentIds)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (pageError) throw pageError;
        if (pageData && pageData.length > 0) {
          allItems = [...allItems, ...pageData];
          page++;
          if (pageData.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Group items by indent_id
      const itemsByIndent = allItems.reduce((acc, item) => {
        if (!acc[item.indent_id]) {
          acc[item.indent_id] = [];
        }
        acc[item.indent_id].push(item);
        return acc;
      }, {});

      const historyData = indents.map(row => {
        const items = itemsByIndent[row.id] || [];
        return {
          ...row,
          itemCount: items.filter(i => !i.is_excluded).length,
          excludedCount: items.filter(i => i.is_excluded).length
        };
      });
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
  const [uploadStep, setUploadStep] = useState(1); // 1: Select Shop, 2: Upload File

  const shops = ["FRIENDS", "VISHAL", "MADHURA", "KUNAL", "BALAJI"];
  const fileInputRef = useRef(null);

  // Calculate statistics
  const getStatistics = () => {
    const totalItems = tableData.length;
    const activeItems = tableData.filter(item => {
      const calcs = calculateRow(item);
      return parseFloat(calcs.orderQty) >= 3.0;
    }).length;
    const excludedItems = tableData.filter(item => {
      const calcs = calculateRow(item);
      return parseFloat(calcs.orderQty) < 3.0;
    }).length;
    return { totalItems, activeItems, excludedItems };
  };

  // ── Shared row processing: takes a 2D array of strings (rows × cols) ──
  const processRows = (allRows) => {
    if (allRows.length < 2) return;

    const knownKeywords = ['party name', 'brand name', 'liquor type', 'size', 'mls', 'ml', 'item', 'name'];
    let headerRowIdx = -1;
    let headers = [];

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

    const getIndex = (exact, partial) => {
      let idx = headers.findIndex(h => exact.some(p => h === p));
      if (idx !== -1) return idx;
      return headers.findIndex(h => partial.some(p => h.includes(p)));
    };

    const partyNameIdx = getIndex(['party name'], ['party name', 'party', 'shop', 'store']);
    const itemNameIdx = getIndex(['item name'], ['item name', 'item', 'product', 'particulars', 'description']);
    const brandNameIdx = getIndex(['brand name'], ['brand name', 'brand']);
    const mlsIdx = getIndex(['size (mls)', 'size (mis)', 'size(mls)', 'size(mis)', 'size (ml)', 'size(ml)', 'mls', 'ml', 'size', 'volume'], ['size (ml)', 'size(ml)', 'size (mls)', 'size (mis)', 'mls', 'ml', 'volume']);
    const liquorTypeIdx = getIndex(['liquor type'], ['liquor type', 'liquor', 'type', 'category']);
    const qtyOutIdx = getIndex(['quantity out', 'qty out', 'qty out (bottles)'], ['quantity out', 'qty out', 'opening stock']);
    const closingQtyIdx = getIndex(['closing stock in bottle', 'closing qty', 'closing quantity', 'closing stock (bottles)'],
      ['closing stock in bottle', 'closing qty', 'closing', 'balance']);
    const bcsIdx = getIndex(['bpc', 'b/cs', 'bcs', 'bottles per case', 'pack size'], ['bpc', 'b/cs', 'bcs', 'b cs', 'bottles per case', 'per case', 'pack size']);

    const fPartyName = partyNameIdx !== -1 ? partyNameIdx : (headers.length > 4 ? 4 : -1);
    const fItemName = itemNameIdx !== -1 ? itemNameIdx : (brandNameIdx !== -1 ? brandNameIdx : (headers.length > 6 ? 6 : 0));
    const fBrandName = brandNameIdx !== -1 ? brandNameIdx : fItemName;
    const fMls = mlsIdx !== -1 ? mlsIdx : (headers.length > 9 ? 9 : -1);
    const fLiquorType = liquorTypeIdx !== -1 ? liquorTypeIdx : (headers.length > 11 ? 11 : -1);

    const records = [];
    let duplicateCount = 0;

    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const row = allRows[i].map(c => String(c ?? '').trim());
      const itemVal = fItemName !== -1 ? row[fItemName] : '';
      const brandVal = fBrandName !== -1 ? row[fBrandName] : '';
      if (!itemVal && !brandVal) continue;

      const newRecord = {
        itemName: itemVal || brandVal,
        brandName: brandVal || itemVal,
        partyName: fPartyName !== -1 ? (row[fPartyName] || '') : '',
        mls: fMls !== -1 ? (row[fMls] || '') : '',
        liquorType: fLiquorType !== -1 ? (row[fLiquorType] || '') : '',
        qtyOut: qtyOutIdx !== -1 && row[qtyOutIdx] ? parseFloat(row[qtyOutIdx]) : null,
        closingQty: (() => {
          if (closingQtyIdx === -1 || !row[closingQtyIdx]) return null;
          const parsed = parseFloat(row[closingQtyIdx]);
          if (isNaN(parsed)) return null;
          return parsed < 0 ? 0 : parsed;
        })(),
        bcs: bcsIdx !== -1 && row[bcsIdx] ? parseFloat(row[bcsIdx]) : null,
      };

      const isDuplicate = records.some(r => 
        r.itemName.toLowerCase() === newRecord.itemName.toLowerCase() &&
        r.brandName.toLowerCase() === newRecord.brandName.toLowerCase() &&
        r.partyName.toLowerCase() === newRecord.partyName.toLowerCase() &&
        r.mls.toLowerCase() === newRecord.mls.toLowerCase() &&
        r.liquorType.toLowerCase() === newRecord.liquorType.toLowerCase() &&
        Object.is(r.qtyOut, newRecord.qtyOut) &&
        Object.is(r.closingQty, newRecord.closingQty) &&
        Object.is(r.bcs, newRecord.bcs)
      );

      if (isDuplicate) {
        duplicateCount++;
      } else {
        records.push(newRecord);
      }
    }

    setTableData(() => {
      const matchedRecords = [];
      records.forEach((record, idx) => {
        matchedRecords.push({
          id: Date.now() + idx,
          itemName: record.itemName,
          avgSale: 0,
          qtyOut: record.qtyOut,
          closingQty: record.closingQty,
          brandName: record.brandName,
          bcs: record.bcs,
          mls: record.mls,
          liquorType: record.liquorType,
          partyName: record.partyName || selectedShop,
        });
      });
      return matchedRecords;
    });

    setIsProcessing(false);
    setShowModal(false);
    setUploadStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setDuplicateCount(duplicateCount);
    addToast("File loaded successfully.", "success");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setShowModal(false);

    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const targetKeywords = ['party name', 'brand name', 'liquor type', 'size', 'mls', 'ml'];

        let bestRows = null;
        let bestScore = -1;

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          for (let i = 0; i < Math.min(15, rows.length); i++) {
            const row = rows[i].map(c => String(c ?? '').toLowerCase().trim());
            const score = targetKeywords.filter(kw => row.some(h => h.includes(kw))).length;
            if (score > bestScore) {
              bestScore = score;
              bestRows = rows;
            }
          }
        }

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
    const hasData = row.qtyOut !== null && row.bcs !== null && row.closingQty !== null && row.bcs !== 0;

    let lastMonthSale = 0;
    let perDaySaleLastMonth = 0;
    let thresholdSale = 0;
    let boxClosingQty = 0;
    let orderBox = 0;
    let orderQty = 0;

    if (hasData) {
      const getActive = (val, calculated) => {
        if (val !== undefined && val !== null && val !== "") {
          const num = parseFloat(val);
          return isNaN(num) ? calculated : num;
        }
        return calculated;
      };

      lastMonthSale = getActive(row.lastMonthSale, row.qtyOut / row.bcs);
      perDaySaleLastMonth = getActive(row.perDaySaleLastMonth, (row.qtyOut / daysDivisor) / row.bcs);
      const typeKey = (row.liquorType || "").trim().toUpperCase();
      const matchedKey = typeKey ? Object.keys(thresholdDays).find(
        key => typeKey.includes(key) || key.includes(typeKey)
      ) : null;
      const multiplier = matchedKey ? thresholdDays[matchedKey] : 6;
      thresholdSale = getActive(row.thresholdSale, perDaySaleLastMonth * multiplier);
      boxClosingQty = getActive(row.boxClosingQty, Math.max(0, row.closingQty) / row.bcs);
      orderBox = getActive(row.orderBox, thresholdSale - boxClosingQty);
      orderQty = getActive(row.orderQty, orderBox * row.bcs);
    }

    return {
      lastMonthSale: hasData ? (row.lastMonthSale !== undefined && row.lastMonthSale !== null && row.lastMonthSale !== "" ? row.lastMonthSale : lastMonthSale.toFixed(2)) : "",
      perDaySaleLastMonth: hasData ? (row.perDaySaleLastMonth !== undefined && row.perDaySaleLastMonth !== null && row.perDaySaleLastMonth !== "" ? row.perDaySaleLastMonth : perDaySaleLastMonth.toFixed(2)) : "",
      thresholdSale: hasData ? (row.thresholdSale !== undefined && row.thresholdSale !== null && row.thresholdSale !== "" ? row.thresholdSale : thresholdSale.toFixed(2)) : "",
      boxClosingQty: hasData ? (row.boxClosingQty !== undefined && row.boxClosingQty !== null && row.boxClosingQty !== "" ? row.boxClosingQty : boxClosingQty.toFixed(2)) : "",
      orderBox: hasData ? (row.orderBox !== undefined && row.orderBox !== null && row.orderBox !== "" ? row.orderBox : orderBox.toFixed(2)) : "",
      orderQty: hasData ? (row.orderQty !== undefined && row.orderQty !== null && row.orderQty !== "" ? row.orderQty : orderQty.toFixed(2)) : ""
    };
  };

  const handleViewSubmission = async (history) => {
    setSelectedSubmission(history);
    try {
      let allItems = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('indent_items')
          .select('*')
          .eq('indent_id', history.id)
          .eq('is_excluded', false)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allItems = [...allItems, ...data];
          page++;
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      setSelectedSubmissionItems(allItems);
    } catch (error) {
      console.error("Error fetching details:", error);
      addToast("Failed to load submission details.", "error");
    }
  };

  const handleDeleteIndent = (indentId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Entire Indent?",
      message: "Are you sure you want to delete this entire indent? This action will permanently delete all records of this indent and its items across all pipeline steps.",
      onConfirm: () => performDeleteIndent(indentId)
    });
  };

  const performDeleteIndent = async (indentId) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setIsProcessing(true);
    try {
      let allItems = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: items, error: itemsError } = await supabase
          .from('indent_items')
          .select('unique_indent_id')
          .eq('indent_id', indentId)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (itemsError) throw itemsError;
        if (items && items.length > 0) {
          allItems = [...allItems, ...items];
          page++;
          if (items.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const uniqueIndentIds = [...new Set((allItems || []).map(i => i.unique_indent_id).filter(Boolean))];

      if (uniqueIndentIds.length > 0) {
        const { error: poError } = await supabase
          .from('purchase_orders')
          .delete()
          .in('indent_id', uniqueIndentIds);
        if (poError) throw poError;
      }

      const { error: delItemsError } = await supabase
        .from('indent_items')
        .delete()
        .eq('indent_id', indentId);
      if (delItemsError) throw delItemsError;

      const { error: delIndentError } = await supabase
        .from('indents')
        .delete()
        .eq('id', indentId);
      if (delIndentError) throw delIndentError;

      addToast("Successfully deleted indent and associated pipeline records.", "success");
      fetchSubmittedHistory();
      if (selectedSubmission?.id === indentId) setSelectedSubmission(null);
    } catch (error) {
      console.error("Error deleting indent:", error);
      addToast("Failed to delete indent: " + error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItem = (itemId, indentId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Specific Item?",
      message: "Are you sure you want to delete this specific item? This action will permanently remove the item from this indent and update or delete any associated Purchase Order.",
      onConfirm: () => performDeleteItem(itemId, indentId)
    });
  };

  const performDeleteItem = async (itemId, indentId) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setIsProcessing(true);
    try {
      const { data: itemData, error: itemError } = await supabase
        .from('indent_items')
        .select('*')
        .eq('id', itemId)
        .single();
      if (itemError) throw itemError;

      const uniqueIndentId = itemData.unique_indent_id;
      const vendorName = itemData.party_name;

      if (uniqueIndentId && vendorName) {
        const { data: poData, error: poError } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('indent_id', uniqueIndentId)
          .eq('vendor_name', vendorName);

        if (!poError && poData && poData.length > 0) {
          const po = poData[0];

          const { data: otherItems } = await supabase
            .from('indent_items')
            .select('id')
            .eq('unique_indent_id', uniqueIndentId)
            .eq('party_name', vendorName)
            .eq('approval_status', 'approved');

          const remaining = (otherItems || []).filter(i => i.id !== itemId);

          if (remaining.length === 0) {
            const { error: delPoError } = await supabase
              .from('purchase_orders')
              .delete()
              .eq('id', po.id);
            if (delPoError) throw delPoError;
          } else {
            const updatedReceivedItems = { ...(po.received_items || {}) };
            delete updatedReceivedItems[itemId];

            const orderBox = itemData.order_box !== null ? parseFloat(itemData.order_box) : 0;
            const orderQty = itemData.order_qty !== null ? parseFloat(itemData.order_qty) : 0;
            const qtyType = orderBox >= 0.90 ? "Box" : "Bottles";

            let newTotalQty = po.total_order_qty || 0;
            let newTotalBox = po.total_order_box || 0;

            if (qtyType === "Box") {
              newTotalBox = Math.max(0, newTotalBox - Math.round(orderBox));
            } else {
              newTotalQty = Math.max(0, newTotalQty - Math.ceil(orderQty));
            }

            const { error: updPoError } = await supabase
              .from('purchase_orders')
              .update({
                received_items: updatedReceivedItems,
                total_order_qty: newTotalQty,
                total_order_box: newTotalBox
              })
              .eq('id', po.id);
            if (updPoError) throw updPoError;
          }
        }
      }

      const { error: delItemError } = await supabase
        .from('indent_items')
        .delete()
        .eq('id', itemId);
      if (delItemError) throw delItemError;

      addToast("Successfully deleted item from indent.", "success");

      if (selectedSubmission?.id === indentId) {
        let allRefreshed = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: refreshedItems, error: refError } = await supabase
            .from('indent_items')
            .select('*')
            .eq('indent_id', indentId)
            .eq('is_excluded', false)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (refError) throw refError;
          if (refreshedItems && refreshedItems.length > 0) {
            allRefreshed = [...allRefreshed, ...refreshedItems];
            page++;
            if (refreshedItems.length < pageSize) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        setSelectedSubmissionItems(allRefreshed || []);
      }

      fetchSubmittedHistory();
    } catch (error) {
      console.error("Error deleting item:", error);
      addToast("Failed to delete item: " + error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIndentSubmit = async () => {
    setIsProcessing(true);
    try {
      const activeItems = [];
      const excludedItems = [];

      tableData.forEach((item) => {
        const calcs = calculateRow(item);
        const orderQtyVal = parseFloat(calcs.orderQty);

        if (!isNaN(orderQtyVal) && orderQtyVal >= 3.0) {
          activeItems.push({ item, calcs });
        } else if (!isNaN(orderQtyVal) && orderQtyVal < 3.0) {
          excludedItems.push({ item, calcs });
        }
      });

      if (activeItems.length === 0) {
        addToast("No valid data to submit. Only items with 'Order in Qty' >= 3.0 are allowed.", "error");
        setIsProcessing(false);
        return;
      }

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

      const partyMap = new Map();
      const itemsPayload = [];

      activeItems.forEach(({ item, calcs }) => {
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
          threshold_sale: parseFloat(calcs.thresholdSale) || 0,
          closing_qty_box: parseFloat(calcs.boxClosingQty) || 0,
          order_box: parseFloat(calcs.orderBox) || 0,
          order_qty: parseFloat(calcs.orderQty) || 0,
          is_excluded: false,
          exclusion_reason: null
        });
      });

      excludedItems.forEach(({ item, calcs }) => {
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
          threshold_sale: parseFloat(calcs.thresholdSale) || 0,
          closing_qty_box: parseFloat(calcs.boxClosingQty) || 0,
          order_box: parseFloat(calcs.orderBox) || 0,
          order_qty: parseFloat(calcs.orderQty) || 0,
          is_excluded: true,
          exclusion_reason: parseFloat(calcs.orderQty) < 0 ? "negative_order_qty" : "low_order_qty"
        });
      });

      const { error: itemsError } = await supabase
        .from("indent_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      addToast(`Successfully submitted ${itemsPayload.length} records to Supabase!`, "success");
      setTableData([]);
      setDuplicateCount(0);
      sessionStorage.removeItem('indent_tableData');
      sessionStorage.removeItem('indent_duplicateCount');
      fetchSubmittedHistory();
    } catch (error) {
      console.error("Error submitting indent data:", error);
      addToast("Failed to submit data. Please check the console for details.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = getStatistics();

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-6">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Page Shell */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#0f172a] to-[#1e293b] bg-clip-text text-transparent tracking-tight">
            Indent Calculations
          </h1>
          <p className="text-[#64748b] text-sm mt-2">
            Upload CSV or edit cells directly to calculate indents
          </p>
        </div>

        {/* Compact Stats Pills - Only when data exists */}
        {tableData.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <StatPill label="Items" value={stats.totalItems} icon={Database} color="border-blue-200 text-blue-600" />
            <StatPill label="Active" value={stats.activeItems} icon={TrendingUp} color="border-green-200 text-green-600" />
            <StatPill label="Excluded" value={stats.excludedItems} icon={TrendingDown} color="border-red-200 text-red-600" />
            {duplicateCount > 0 && (
              <StatPill label="Duplicates Removed" value={duplicateCount} icon={AlertTriangle} color="border-amber-200 text-amber-600" />
            )}
            <StatPill label="Shop" value={selectedShop || 'Not Selected'} icon={Package} color="border-purple-200 text-purple-600" />
          </div>
        )}



        {/* Upload Button Area */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {tableData.length > 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all text-sm"
              >
                <Upload size={16} />
                Upload CSV
              </button>
            )}

            {tableData.length > 0 && !tableData[0]?.partyIndentId && (
              <button
                className="flex items-center gap-2 bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:from-[#4338ca] hover:to-[#3730a3] text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all text-sm"
                onClick={handleIndentSubmit}
              >
                <Send size={16} />
                Submit Indent
              </button>
            )}

            {tableData.length > 0 && (
              <button
                onClick={() => {
                  setTableData([]);
                  setDuplicateCount(0);
                  sessionStorage.removeItem('indent_tableData');
                  sessionStorage.removeItem('indent_duplicateCount');
                  addToast("Data cleared successfully", "success");
                }}
                className="flex items-center gap-2 bg-white border border-[#e2e8f0] hover:bg-[#fef2f2] hover:border-[#fecaca] text-[#ef4444] px-4 py-2 rounded-lg font-semibold transition-all text-sm"
              >
                <Trash2 size={16} />
                Clear Data
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Settings */}
        <div className="mb-6">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-sm font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors"
          >
            <Settings2 size={16} />
            Calculation Settings
            <ChevronDown size={14} className={`transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} />
          </button>

          {showSettings && (
            <div className="mt-4 p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {Object.entries(thresholdDays).map(([type, days]) => (
                  <div key={type} className="bg-white border border-[#e2e8f0] rounded-lg p-2">
                    <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">{type}</div>
                    <input
                      type="number"
                      value={days}
                      onChange={(e) => handleThresholdChange(type, e.target.value)}
                      className="w-full text-lg font-bold text-[#0f172a] border border-[#e2e8f0] rounded px-2 py-1 outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]"
                      style={{ MozAppearance: 'textfield' }}
                    />
                    <div className="text-[9px] text-[#64748b] mt-1">Days threshold</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#475569]">Calculation Period:</span>
                <select
                  value={daysDivisor}
                  onChange={(e) => setDaysDivisor(Number(e.target.value))}
                  className="px-3 py-1.5 border border-[#cbd5e1] rounded-md outline-none font-medium text-[#0f172a] text-xs cursor-pointer bg-white hover:border-[#4f46e5]"
                >
                  <option value={7}>7 Days (Weekly)</option>
                  <option value={30}>30 Days (Monthly)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Data Table Section */}
        {tableData.length > 0 ? (
          <div className="animate-fade-in">
            <div className="overflow-x-auto overflow-y-auto max-h-[65vh] rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
              {mobileView ? (
                // Mobile Accordion View — uses AccordionItem component to avoid hooks-in-map
                <div className="space-y-2 p-3">
                  {tableData.map((item) => {
                    const calcs = calculateRow(item);
                    return (
                      <AccordionItem
                        key={item.id}
                        item={item}
                        calcs={calcs}
                        handleInlineChange={handleInlineChange}
                      />
                    );
                  })}
                </div>
              ) : (
                // Detailed Table View - All 16 columns grouped section-wise
                <table className="w-full border-collapse text-[11px] table-auto">
                  <thead className="sticky top-0 z-30">
                    <tr className="text-white text-[10px] font-bold tracking-wider uppercase">
                      <th colSpan={tableData[0]?.partyIndentId ? "2" : "1"} className="bg-slate-600 border border-slate-700 px-3 py-1.5 text-center rounded-tl-lg">
                        Item Master File
                      </th>
                      <th colSpan="7" className="bg-emerald-600 border border-emerald-700 px-3 py-1.5 text-center">
                        Excel File Data
                      </th>
                      <th colSpan="6" className="bg-indigo-600 border border-indigo-700 px-3 py-1.5 text-center rounded-tr-lg">
                        Calculations
                      </th>
                    </tr>
                    <tr className="bg-slate-50 border-b border-[#e2e8f0] text-[#475569] text-left">
                      {tableData[0]?.partyIndentId && (
                        <th className="bg-slate-50 border border-white px-3 py-2 text-center font-semibold min-w-[80px]">Indent ID</th>
                      )}
                      <th className="sticky left-0 bg-slate-50 border border-white z-20 px-3 py-2 text-left font-semibold min-w-[280px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Item Name</th>

                      <th className="bg-[#f0fdf4] border border-white px-3 py-2 text-right font-semibold min-w-[100px]">Qty Out</th>
                      <th className="bg-[#f0fdf4] border border-white px-3 py-2 text-right font-semibold min-w-[100px]">Closing Qty</th>
                      <th className="bg-[#f8fafc] border border-white px-3 py-2 font-semibold min-w-[150px]">Brand Name</th>
                      <th className="bg-[#f0fdf4] border border-white px-3 py-2 text-right font-semibold min-w-[95px]">B/Cs</th>
                      <th className="bg-[#f8fafc] border border-white px-3 py-2 text-center font-semibold min-w-[80px]">Mls</th>
                      <th className="bg-[#f8fafc] border border-white px-3 py-2 text-center font-semibold min-w-[110px]">Liquor Type</th>
                      <th className="bg-[#f8fafc] border border-white px-3 py-2 font-semibold min-w-[150px]">Party Name</th>

                      <th className="bg-indigo-50 border border-white px-3 py-2 text-right font-semibold min-w-[115px]">Last Month</th>
                      <th className="bg-indigo-50 border border-white px-3 py-2 text-right font-semibold min-w-[115px]">Per Day Sale</th>
                      <th className="bg-indigo-50 border border-white px-3 py-2 text-right font-semibold min-w-[115px]">Threshold</th>
                      <th className="bg-indigo-50 border border-white px-3 py-2 text-right font-semibold min-w-[115px]">Closing Box</th>
                      <th className="bg-indigo-100 border border-white px-3 py-2 text-right font-bold text-[#4338ca] min-w-[115px]">Order In Box</th>
                      <th className="bg-indigo-100 border border-white px-3 py-2 text-right font-bold text-[#4338ca] min-w-[115px]">Order In Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((item, index) => {
                      const calcs = calculateRow(item);
                      const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                      return (
                        <tr key={item.id} className={`${rowBg} hover:bg-indigo-50/30 transition-colors border-b border-[#f1f5f9] text-[11px]`}>
                          {tableData[0]?.partyIndentId && (
                            <td className="border-r border-[#e2e8f0] px-3 py-2 text-center font-medium text-[#475569]">{item.partyIndentId}</td>
                          )}
                          <td className={`sticky left-0 ${rowBg} z-10 px-3 py-2 font-semibold text-[#1e293b] border-r border-[#e2e8f0] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]`}>
                            {item.itemName}
                          </td>

                          {/* Excel Part - Non-editable text displays */}
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-right text-[#475569] font-medium">
                            {item.qtyOut !== null ? item.qtyOut : "—"}
                          </td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-right text-[#475569] font-medium">
                            {item.closingQty !== null ? item.closingQty : "—"}
                          </td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-[#475569]">{item.brandName || "—"}</td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-right text-[#475569] font-medium">
                            {item.bcs !== null ? item.bcs : "—"}
                          </td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-center text-[#475569]">{item.mls || "—"}</td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-center text-[#475569]">{item.liquorType || "—"}</td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-[#475569]">{item.partyName || "—"}</td>

                          {/* Calculations Display */}
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-right font-medium text-indigo-950 bg-indigo-50/10">{calcs.lastMonthSale || "—"}</td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-right font-medium text-indigo-950 bg-indigo-50/10">{calcs.perDaySaleLastMonth || "—"}</td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-right font-medium text-indigo-950 bg-indigo-50/10">{calcs.thresholdSale || "—"}</td>
                          <td className="border-r border-[#e2e8f0] px-3 py-2 text-right font-medium text-indigo-950 bg-indigo-50/10">{calcs.boxClosingQty || "—"}</td>

                          {/* Non-sticky calculation editable inputs */}
                          <td className="bg-indigo-50 hover:bg-indigo-100/90 px-1 py-1 text-right border-r border-[#cbd5e1]">
                            <input
                              type="number"
                              step="any"
                              value={calcs.orderBox}
                              onChange={(e) => handleInlineChange(item.id, 'orderBox', e.target.value)}
                              className="w-full text-right font-bold text-[#4338ca] px-1.5 py-1 border border-transparent hover:border-indigo-300 rounded focus:border-[#4f46e5] focus:bg-white outline-none bg-transparent transition-all"
                              placeholder="-"
                            />
                          </td>
                          <td className="bg-indigo-50 hover:bg-indigo-100/90 px-1 py-1 text-right border-l border-[#cbd5e1]">
                            <input
                              type="number"
                              step="any"
                              value={calcs.orderQty}
                              onChange={(e) => handleInlineChange(item.id, 'orderQty', e.target.value)}
                              className="w-full text-right font-bold text-[#4338ca] px-1.5 py-1 border border-transparent hover:border-indigo-300 rounded focus:border-[#4f46e5] focus:bg-white outline-none bg-transparent transition-all"
                              placeholder="-"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          // Compact Empty State
          <div
            onClick={() => {
              if (!isLoading) setShowModal(true);
            }}
            className={`flex flex-col items-center justify-center py-8 px-4 bg-gradient-to-b from-[#f8fafc] to-white border-2 border-dashed border-[#cbd5e1] hover:border-[#4f46e5] rounded-lg transition-all duration-300 cursor-pointer ${isLoading ? 'cursor-default opacity-50' : 'hover:shadow-md'
              }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin w-5 h-5 text-[#4f46e5]" />
                <p className="text-xs font-medium text-[#64748b]">Loading master database reference...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5 text-[#4f46e5]" />
                </div>
                <p className="text-sm font-semibold text-[#0f172a] mb-1">No Data Available</p>
                <p className="text-xs text-[#64748b]">Upload your Indent CSV or Excel file to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Recent Submissions Section - Compact Table */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
              <List size={18} />
              Recent Indent Submissions
            </h2>
            {submittedHistory.length > 0 && (
              <button
                onClick={fetchSubmittedHistory}
                className="p-1.5 hover:bg-[#f1f5f9] rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} className="text-[#64748b]" />
              </button>
            )}
          </div>

          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin w-6 h-6 text-[#94a3b8]" />
            </div>
          ) : submittedHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b]">Shop</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#64748b]">Date & Time</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-[#64748b]">Items</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-[#64748b]">Excluded</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-[#64748b]">Status</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-[#64748b]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedHistory.map((history) => (
                    <tr key={history.id} className="border-b border-[#f1f5f9] hover:bg-[#faf9ff] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#0f172a]">{history.shop_name}</td>
                      <td className="py-3 px-4 text-[#64748b] text-xs">
                        {new Date(history.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} at{' '}
                        {new Date(history.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{history.itemCount}</td>
                      <td className="py-3 px-4 text-center text-[#ef4444]">{history.excludedCount || 0}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#faf9ff]">
                          {history.status === 'Pending' ? <Clock size={10} className="text-[#d97706]" /> : <CheckCircle size={10} className="text-[#16a34a]" />}
                          <span className={history.status === 'Pending' ? 'text-[#d97706]' : 'text-[#16a34a]'}>{history.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewSubmission(history)}
                            className="p-1.5 text-[#4f46e5] hover:bg-[#e0e7ff] rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteIndent(history.id)}
                            className="p-1.5 text-[#ef4444] hover:bg-[#fee2e2] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center bg-[#f8fafc] rounded-lg border border-dashed border-[#cbd5e1]">
              <Package size={32} className="mx-auto text-[#cbd5e1] mb-2" />
              <p className="text-sm text-[#64748b]">No submissions found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0f172a]/50 backdrop-blur-sm flex justify-center items-center z-[1000] p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-[#0f172a]">
                  {uploadStep === 1 ? "Select Shop" : "Upload File"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedShop("");
                    setUploadStep(1);
                  }}
                  className="p-1 hover:bg-[#f1f5f9] rounded-lg"
                >
                  <X size={18} className="text-[#64748b]" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2 mb-5">
                <div className={`flex-1 h-1 rounded-full transition-all ${uploadStep >= 1 ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'}`} />
                <div className={`flex-1 h-1 rounded-full transition-all ${uploadStep >= 2 ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'}`} />
              </div>

              {uploadStep === 1 ? (
                <>
                  <select
                    value={selectedShop}
                    onChange={(e) => setSelectedShop(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#e2e8f0] text-sm outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 transition-all mb-4"
                  >
                    <option value="" disabled>Select Shop...</option>
                    {shops.map(shop => (
                      <option key={shop} value={shop}>{shop}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => selectedShop && setUploadStep(2)}
                    disabled={!selectedShop}
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${selectedShop
                        ? 'bg-[#4f46e5] text-white hover:bg-[#4338ca]'
                        : 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
                      }`}
                  >
                    Next: Upload File
                  </button>
                </>
              ) : (
                <>
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
                    className={`flex flex-col items-center justify-center p-6 rounded-lg cursor-pointer transition-all duration-200 ${isDragging
                        ? 'bg-[#f0fdf4] border-2 border-[#22c55e] border-dashed'
                        : 'bg-[#f8fafc] border-2 border-dashed border-[#cbd5e1] hover:border-[#4f46e5]'
                      }`}
                  >
                    <div className={`p-2 rounded-full mb-2 ${isDragging ? 'bg-[#dcfce7]' : 'bg-[#e2e8f0]'}`}>
                      <Upload size={20} className={isDragging ? 'text-[#16a34a]' : 'text-[#64748b]'} />
                    </div>
                    <p className="font-medium text-[#0f172a] text-sm text-center">
                      Click to Upload Excel / CSV
                    </p>
                    <p className="text-xs text-[#94a3b8] mt-1">
                      or drag & drop file here
                    </p>
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                    id="csvUploadModal"
                  />

                  <button
                    onClick={() => setUploadStep(1)}
                    className="w-full mt-3 py-2 rounded-lg text-sm font-medium text-[#64748b] hover:bg-[#f8fafc] transition-all"
                  >
                    Back to Shop Selection
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submission View Modal */}
      {selectedSubmission && (
        <SubmissionViewModal
          isOpen={!!selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          submission={selectedSubmission}
          items={selectedSubmissionItems}
          onDeleteItem={handleDeleteItem}
          onRefresh={() => handleViewSubmission(selectedSubmission)}
        />
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-md flex justify-center items-center z-[10000] p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-[#fee2e2] rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-[#ef4444]" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">{confirmModal.title}</h3>
              <p className="text-[#64748b] text-sm leading-relaxed mb-5">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white font-medium text-sm shadow-md"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      {tableData.length > 0 && (
        <div className="sticky bottom-0 z-40 bg-white border-t border-[#e2e8f0] shadow-lg -mx-4 md:-mx-6 lg:-mx-8 -mb-6 mt-8">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-[#64748b]">Items: <strong className="text-[#0f172a]">{stats.totalItems}</strong></span>
              <span className="text-sm text-[#64748b]">Active: <strong className="text-[#10b981]">{stats.activeItems}</strong></span>
              <span className="text-sm text-[#64748b]">Excluded: <strong className="text-[#ef4444]">{stats.excludedItems}</strong></span>
              {duplicateCount > 0 && (
                <span className="text-sm text-[#64748b]">Duplicates Removed: <strong className="text-[#d97706]">{duplicateCount}</strong></span>
              )}
            </div>
            <button
              className="flex items-center gap-2 bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:from-[#4338ca] hover:to-[#3730a3] text-white px-5 py-2 rounded-lg font-semibold shadow-md transition-all text-sm"
              onClick={handleIndentSubmit}
            >
              <Send size={16} />
              Submit Indent
            </button>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex flex-col justify-center items-center z-[9999] transition-all duration-300 ease-in-out animate-fade-in">
          <div className="bg-white rounded-xl p-6 shadow-xl text-center max-w-sm mx-4 transform scale-100 transition-transform duration-300">
            <Loader2 className="animate-spin w-10 h-10 text-[#4f46e5] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0f172a] mb-1">Processing File Data...</h3>
            <p className="text-xs text-[#64748b]">Please wait while we prepare the indents.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Indent;