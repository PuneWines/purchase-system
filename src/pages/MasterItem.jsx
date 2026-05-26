import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronUp, ChevronDown, Search, Plus, Loader2, Trash2, Save, Edit2, X } from "lucide-react";
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

      <div className="table-page-content">
        
        {/* Header Section */}
        <div className="table-page-header">
          <h1>Item Master File</h1>
          <p className="page-description">Manage items and their average sales data.</p>
        </div>

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
    </div>
  );
};

export default MasterItem;

