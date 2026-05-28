import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronUp, ChevronDown, Search, Plus, Loader2, Trash2, Save, Edit2, X, Upload, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../utils/supabase";
import "../styles/Pages.css";

const MasterItem = () => {
  const [data, setData] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [newAvgSale, setNewAvgSale] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [editableRows, setEditableRows] = useState({});
  const [activeTab, setActiveTab] = useState("friends");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Excel Bulk Upload States
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);

  const tabs = ["friends", "vishal", "kunal", "madhura", "balaji"];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    setPreviewData(null);
    setSkippedCount(0);
    try {
      const response = await supabase
        .from("masterItem")
        .select("*")
        .eq("shop_id", activeTab)
        .order("created_at", { ascending: false });
        
      if (response.error) throw response.error;
      setData(response.data || []);
      setEditableRows({});
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load items. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newAvgSale.trim()) {
      showToast("Please enter both Item Name and Average Sale.", "error");
      return;
    }

    try {
      const { data: insertedItem, error: insertError } = await supabase
        .from("masterItem")
        .insert([{
          shop_id: activeTab,
          item_name: newItemName.trim(),
          avg_sale: parseFloat(newAvgSale)
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      
      setData([insertedItem, ...data]);
      setNewItemName("");
      setNewAvgSale("");
      showToast("Item added successfully!", "success");
    } catch (err) {
      console.error("Error adding item:", err);
      showToast(err.message || "Failed to add item. It might already exist.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("masterItem")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Remove item from local state
      setData(prevData => prevData.filter(item => item.id !== id));
      
      // Clear from editable rows if it was being edited
      setEditableRows(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showToast("Item deleted successfully!", "success");
    } catch (err) {
      console.error("Error deleting item:", err);
      showToast(err.message || "Failed to delete item.", "error");
    }
  };

  const handleEditChange = (id, field, value) => {
    setData((prevData) =>
      prevData.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const toggleEdit = (id) => {
    setEditableRows((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleUpdate = async (id) => {
    const itemToUpdate = data.find(item => item.id === id);
    if (!itemToUpdate) return;
    
    try {
      const { error: updateError } = await supabase
        .from("masterItem")
        .update({
          item_name: itemToUpdate.item_name,
          avg_sale: parseFloat(itemToUpdate.avg_sale) || 0
        })
        .eq("id", id);
        
      if (updateError) throw updateError;
      
      showToast("Item updated successfully!", "success");
      // Turn off edit mode
      setEditableRows(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error("Error updating item:", err);
      showToast(err.message || "Failed to save changes.", "error");
    }
  };

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedItems = (itemsToSort) => {
    if (!sortConfig.key) return itemsToSort;
    return [...itemsToSort].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      const aNum = parseFloat(String(aVal).replace(/[^0-9.-]/g, ''));
      const bNum = parseFloat(String(bVal).replace(/[^0-9.-]/g, ''));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.avg_sale).toLowerCase().includes(searchTerm.toLowerCase())
    );
    return getSortedItems(filtered);
  }, [data, searchTerm, sortConfig]);

  // Excel Bulk Upload Handlers
  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
      e.target.value = ""; // Reset
    }
  };

  const processFile = async (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      showToast("Invalid file type. Please upload an Excel file (.xlsx or .xls).", "error");
      return;
    }

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target.result;
        const workbook = XLSX.read(fileContent, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (!rows || rows.length === 0) {
          throw new Error("The selected Excel file is empty.");
        }

        const firstRow = rows[0];
        const keys = Object.keys(firstRow);
        
        const itemKey = keys.find(k => {
          const lowerK = k.trim().toLowerCase();
          return lowerK === 'item' || 
                 lowerK === 'item name' || 
                 lowerK === 'item_name' || 
                 lowerK.includes('item_name') || 
                 lowerK.includes('item name') || 
                 lowerK === 'name';
        });
        
        const avgSaleKey = keys.find(k => {
          const lowerK = k.trim().toLowerCase();
          return lowerK === 'fix per day avg sale in box' || 
                 lowerK === 'fix_per_day_avg_sale_in_box' || 
                 lowerK === 'per day sale in box' ||
                 lowerK === 'per_day_sale_in_box' ||
                 lowerK === 'avg sale' || 
                 lowerK === 'avg_sale' || 
                 lowerK === 'average sale' ||
                 lowerK === 'per day sale' ||
                 lowerK === 'per_day_sale' ||
                 lowerK.includes('avg sale') ||
                 lowerK.includes('per day sale');
        });

        if (!itemKey || !avgSaleKey) {
          throw new Error("Required columns missing. Please ensure your Excel file contains columns for 'Item' and 'Fix per day avg sale in box' (or 'Per day sale in Box').");
        }

        let skippedRows = 0;
        const validExcelRows = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          const isRowEmpty = Object.values(row).every(val => val === null || val === undefined || String(val).trim() === '');
          if (isRowEmpty) {
            continue;
          }
          
          const rawItemName = row[itemKey];
          const rawAvgSale = row[avgSaleKey];
          
          const itemName = rawItemName !== undefined && rawItemName !== null ? String(rawItemName).trim() : '';
          const avgSaleVal = parseFloat(String(rawAvgSale).replace(/,/g, ''));
          
          if (!itemName || isNaN(avgSaleVal) || avgSaleVal < 0) {
            skippedRows++;
            continue;
          }

          const lowerName = itemName.toLowerCase();
          const existingIndex = validExcelRows.findIndex(r => r.item_name.toLowerCase() === lowerName);
          
          const rowData = {
            item_name: itemName,
            avg_sale: avgSaleVal
          };

          if (existingIndex > -1) {
            validExcelRows[existingIndex] = rowData;
          } else {
            validExcelRows.push(rowData);
          }
        }

        if (validExcelRows.length === 0) {
          throw new Error("No valid item rows found in the Excel file.");
        }

        const { data: dbItems, error: dbError } = await supabase
          .from("masterItem")
          .select("id, item_name, avg_sale")
          .eq("shop_id", activeTab);

        if (dbError) throw dbError;

        const dbItemsMap = new Map();
        if (dbItems) {
          dbItems.forEach(item => {
            dbItemsMap.set(item.item_name.trim().toLowerCase(), item);
          });
        }

        const parsedPreviewData = validExcelRows.map(row => {
          const lowerName = row.item_name.toLowerCase();
          const dbItem = dbItemsMap.get(lowerName);
          
          if (dbItem) {
            return {
              ...row,
              id: dbItem.id,
              status: "Existing Item (Will Update)",
              isNew: false
            };
          } else {
            return {
              ...row,
              status: "New Item (Will Insert)",
              isNew: true
            };
          }
        });

        setSkippedCount(skippedRows);
        setPreviewData(parsedPreviewData);
        showToast("Excel parsed successfully! Please review the preview below.", "success");
      } catch (err) {
        console.error("Error processing Excel file:", err);
        showToast(err.message || "Failed to process Excel file.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      showToast("Failed to read Excel file.", "error");
      setIsLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleBulkUpdate = async () => {
    if (!previewData || previewData.length === 0) return;

    setIsProcessing(true);
    let addedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    try {
      const toInsert = previewData
        .filter(r => r.isNew)
        .map(r => ({
          shop_id: activeTab,
          item_name: r.item_name,
          avg_sale: r.avg_sale
        }));

      const toUpdate = previewData.filter(r => !r.isNew);

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("masterItem")
          .insert(toInsert);

        if (insertError) {
          console.error("Bulk insert error:", insertError);
          throw new Error("Failed to insert new items: " + insertError.message);
        }
        addedCount = toInsert.length;
      }

      if (toUpdate.length > 0) {
        const updatePromises = toUpdate.map(async (row) => {
          const { error: updateError } = await supabase
            .from("masterItem")
            .update({
              item_name: row.item_name,
              avg_sale: row.avg_sale,
              updated_at: new Date().toISOString()
            })
            .eq("id", row.id);

          if (updateError) {
            console.error(`Update error for ${row.item_name}:`, updateError);
            failedCount++;
          } else {
            updatedCount++;
          }
        });

        await Promise.all(updatePromises);
      }

      const summaryMsg = `${updatedCount} items updated, ${addedCount} new items added${skippedCount > 0 ? `, ${skippedCount} rows skipped due to invalid data` : ''}`;
      
      if (failedCount > 0) {
        showToast(`${summaryMsg} (${failedCount} updates failed)`, "error");
      } else {
        showToast(`Successfully processed: ${summaryMsg}`, "success");
      }

      setPreviewData(null);
      await fetchData();
    } catch (err) {
      console.error("Error executing bulk update:", err);
      showToast(err.message || "Bulk update failed. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="table-page-container" style={{ position: 'relative' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '16px 24px',
          borderRadius: '8px',
          color: '#fff',
          fontWeight: '500',
          zIndex: 9999,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.message}
        </div>
      )}

      {previewData ? (
        <div className="table-page-content">
          {/* Header Section */}
          <div className="table-page-header">
            <h1>Excel Upload Preview</h1>
            <p className="page-description">
              Review and verify the extracted values before updating the database for shop:{" "}
              <span style={{ fontWeight: '600', textTransform: 'capitalize', color: '#4f46e5' }}>{activeTab}</span>.
            </p>
          </div>

          {/* Preview stats & actions */}
          <div className="preview-summary-alert">
            <div className="preview-summary-stats">
              <span className="preview-stat-item">
                New Items (To Insert): <span className="preview-stat-number added">{previewData.filter(r => r.isNew).length}</span>
              </span>
              <span className="preview-stat-item">
                Existing Items (To Update): <span className="preview-stat-number updated">{previewData.filter(r => !r.isNew).length}</span>
              </span>
              {skippedCount > 0 && (
                <span className="preview-stat-item">
                  Skipped due to invalid data: <span className="preview-stat-number skipped">{skippedCount}</span>
                </span>
              )}
            </div>
            <div className="preview-actions-bar">
              <button 
                className="btn-secondary" 
                onClick={() => {
                  setPreviewData(null);
                  setSkippedCount(0);
                }}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                className="btn-success" 
                onClick={handleBulkUpdate}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="spinner-icon" size={16} />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Update</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="col-right">Fix per day avg sale in box</th>
                  <th style={{ width: '220px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-semibold">{row.item_name}</td>
                    <td className="col-right">{row.avg_sale}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${row.isNew ? 'badge-new' : 'badge-update'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="table-page-content">
          
          {/* Header Section */}
          <div className="table-page-header">
            <h1>Item Master File</h1>
            <p className="page-description">Manage items and their average sales data.</p>
          </div>

          {/* Cards Grid for Add individual & Bulk Excel Upload */}
          <div className="cards-grid">
            {/* Add New Item Card */}
            <div className="table-card">
              <h3 className="card-title">Add New Item</h3>
              <form onSubmit={handleAddItem} className="add-form">
                <div className="form-group">
                  <input 
                    type="text" 
                    placeholder="Enter Item Name" 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="number" 
                    step="any"
                    placeholder="Enter average sale in box" 
                    value={newAvgSale}
                    onChange={(e) => setNewAvgSale(e.target.value)}
                    className="form-input"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  <Plus size={16} />
                  <span>Add Item</span>
                </button>
              </form>
            </div>

            {/* Excel Bulk Upload Card */}
            <div className="table-card">
              <h3 className="card-title">Excel Bulk Upload</h3>
              <div className="add-form" style={{ display: 'block' }}>
                <label 
                  className="upload-zone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleFileDrop}
                >
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileSelect} 
                    style={{ display: 'none' }}
                  />
                  <Upload className="upload-zone-icon" size={24} />
                  <span className="upload-zone-text">Click or drag Excel file to upload</span>
                  <span className="upload-zone-subtext">Supports .xlsx and .xls formats only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table Controls */}
          <div className="table-controls">
            <div className="search-container">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Desktop Table */}
          <div className="table-wrapper desktop-only">
            {error && <div style={{ padding: '1rem', color: '#ef4444', textAlign: 'center', fontWeight: '500' }}>{error}</div>}
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable-header" onClick={() => requestSort('item_name')}>
                    <div className="header-content">
                      Item Name
                      <div className="sort-icons">
                        <ChevronUp size={10} className={sortConfig.key === 'item_name' && sortConfig.direction === 'asc' ? 'active-sort' : 'inactive-sort'} />
                        <ChevronDown size={10} className={sortConfig.key === 'item_name' && sortConfig.direction === 'desc' ? 'active-sort' : 'inactive-sort'} />
                      </div>
                    </div>
                  </th>
                  <th className="sortable-header col-right" onClick={() => requestSort('avg_sale')}>
                    <div className="header-content header-right">
                      Fix per day avg sale (box)
                      <div className="sort-icons">
                        <ChevronUp size={10} className={sortConfig.key === 'avg_sale' && sortConfig.direction === 'asc' ? 'active-sort' : 'inactive-sort'} />
                        <ChevronDown size={10} className={sortConfig.key === 'avg_sale' && sortConfig.direction === 'desc' ? 'active-sort' : 'inactive-sort'} />
                      </div>
                    </div>
                  </th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '3rem', textAlign: 'center' }}>
                      <Loader2 className="search-icon" style={{ animation: 'spin 1s linear infinite', margin: '0 auto', position: 'static', transform: 'none' }} size={24} />
                    </td>
                  </tr>
                ) : filteredAndSortedData.map((item) => {
                  const isEditing = editableRows[item.id] || false;
                  return (
                    <tr key={item.id}>
                      <td>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={item.item_name} 
                            onChange={(e) => handleEditChange(item.id, 'item_name', e.target.value)}
                            className="edit-input"
                            autoFocus
                          />
                        ) : (
                          <span className="readonly-text">{item.item_name}</span>
                        )}
                      </td>
                      <td className="col-right">
                        {isEditing ? (
                          <input 
                            type="number" 
                            step="any"
                            value={item.avg_sale} 
                            onChange={(e) => handleEditChange(item.id, 'avg_sale', e.target.value)}
                            className="edit-input input-right"
                          />
                        ) : (
                          <span className="readonly-text">{item.avg_sale}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          {isEditing ? (
                            <>
                              <button 
                                onClick={() => handleUpdate(item.id)} 
                                style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                title="Save changes"
                              >
                                <Save size={16} />
                              </button>
                              <button 
                                onClick={() => toggleEdit(item.id)} 
                                style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                title="Cancel editing"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => toggleEdit(item.id)} 
                                style={{ color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                title="Edit item"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.id)} 
                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                title="Delete item"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && filteredAndSortedData.length === 0 && (
                  <tr>
                    <td colSpan="3" className="empty-state">
                      No items found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          {/* <div className="mobile-cards mobile-only">
            {isLoading && (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader2 className="search-icon" style={{ animation: 'spin 1s linear infinite', margin: '0 auto', position: 'static', transform: 'none' }} size={24} />
              </div>
            )}
            {!isLoading && filteredAndSortedData.map((item) => {
              const isEditing = editableRows[item.id] || false;
              return (
                <div key={item.id} className="mobile-card">
                  <div className="mobile-card-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>Item Name</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleUpdate(item.id)}
                              style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              title="Save changes"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={() => toggleEdit(item.id)}
                              style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              title="Cancel editing"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleEdit(item.id)}
                              style={{ color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              title="Edit item"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              title="Delete item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleEditChange(item.id, 'item_name', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <div className="mobile-value font-semibold">{item.item_name}</div>
                    )}
                  </div>
                  <div className="mobile-card-field">
                    <label>Fix per day avg sale</label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={item.avg_sale}
                        onChange={(e) => handleEditChange(item.id, 'avg_sale', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <div className="mobile-value">{item.avg_sale}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {!isLoading && filteredAndSortedData.length === 0 && (
              <div className="mobile-card empty-state">
                No items found.
              </div>
            )}
          </div> */}
        </div>
      )}
    </div>
  );
};

export default MasterItem;
