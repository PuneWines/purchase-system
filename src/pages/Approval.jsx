import React, { useState, useEffect } from "react";
import "../styles/Pages.css";
import { supabase } from "../../utils/supabase";
import { Loader2, Archive, X, Eye } from "lucide-react";

const Approval = () => {
  const [groupedApprovals, setGroupedApprovals] = useState({});
  const [selectedIndentId, setSelectedIndentId] = useState(null);
  const [indentStatuses, setIndentStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  const handleStatusChange = (itemId, status) => {
    if (status === 'approved' && indentStatuses[itemId] !== 'approved') {
      // Automatically apply 'approved' to all items in the current modal
      setIndentStatuses(prev => {
        const currentItems = groupedApprovals[selectedIndentId] || [];
        const newStatuses = { ...prev };
        currentItems.forEach((item, idx) => {
          const id = item.id || idx;
          newStatuses[id] = 'approved';
        });
        return newStatuses;
      });
    } else {
      // Manual toggle for unchecking approve, or any reject action
      setIndentStatuses(prev => ({
        ...prev,
        [itemId]: prev[itemId] === status ? null : status
      }));
    }
  };

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("indent_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by base party_indent_id (e.g., IN-1-01 -> IN-1)
      const grouped = (data || []).reduce((acc, item) => {
        const fullId = item.party_indent_id || "Unknown";
        let baseIndentId = fullId;
        const parts = fullId.split('-');
        if (parts.length >= 2 && fullId !== "Unknown") {
          baseIndentId = `${parts[0]}-${parts[1]}`;
        }
        
        if (!acc[baseIndentId]) acc[baseIndentId] = [];
        acc[baseIndentId].push(item);
        return acc;
      }, {});

      setGroupedApprovals(grouped);
      
      // Pre-fill existing statuses if they exist in DB
      const initialStatuses = {};
      (data || []).forEach(item => {
        if (item.approval_status && item.approval_status !== 'pending') {
          initialStatuses[item.id] = item.approval_status;
        }
      });
      setIndentStatuses(prev => ({ ...prev, ...initialStatuses }));

    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitApprovals = async () => {
    if (!selectedIndentId) return;
    
    try {
      setIsLoading(true);
      const currentItems = groupedApprovals[selectedIndentId] || [];
      
      // Filter items that have an explicitly set status
      const itemsToUpdate = currentItems.filter(item => indentStatuses[item.id]);

      if (itemsToUpdate.length === 0) {
        alert("No approvals or rejections selected to submit.");
        return;
      }

      // Batch update the items in Supabase
      const promises = itemsToUpdate.map(item => 
        supabase
          .from("indent_items")
          .update({ approval_status: indentStatuses[item.id] })
          .eq("id", item.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        console.error("Some updates failed:", errors);
        alert("Failed to submit some approvals. Check console for details.");
      } else {
        alert("Successfully submitted approvals to Supabase!");
        setSelectedIndentId(null);
        fetchApprovals();
      }
    } catch (error) {
      console.error("Error submitting approvals:", error);
      alert("Failed to submit approvals.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const calculateTotalOrderBox = (items) => {
    return items.reduce((sum, item) => sum + (parseFloat(item.order_box) || 0), 0).toFixed(2);
  };

  const calculateTotalOrderQty = (items) => {
    return items.reduce((sum, item) => sum + (parseFloat(item.order_qty) || 0), 0).toFixed(2);
  };

  const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#1e293b',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: '500'
  };

  const pendingBatches = Object.entries(groupedApprovals).filter(([baseId, items]) => {
    return items.some(item => !item.approval_status || item.approval_status === 'pending');
  });

  const historyBatches = Object.entries(groupedApprovals).filter(([baseId, items]) => {
    return items.every(item => item.approval_status && item.approval_status !== 'pending');
  });

  const displayedBatches = activeTab === "pending" ? pendingBatches : historyBatches;

  return (
    <div className="page-container" style={{ padding: '20px', maxWidth: '100%', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
          Approval Batches
        </h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '15px' }}>
          Review indent submissions batched by Indent ID
        </p>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2px solid #4f46e5' : '2px solid transparent',
            color: activeTab === 'pending' ? '#4f46e5' : '#64748b',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Pending ({pendingBatches.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #4f46e5' : '2px solid transparent',
            color: activeTab === 'history' ? '#4f46e5' : '#64748b',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          History ({historyBatches.length})
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#94a3b8' }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite', width: '40px', height: '40px', marginBottom: '16px' }} />
          <p>Loading batched data from Supabase...</p>
        </div>
      ) : displayedBatches.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          <Archive style={{ width: '48px', height: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: '500', color: '#475569' }}>
            {activeTab === 'pending' ? "No pending indent items found" : "No history found"}
          </p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>
            {activeTab === 'pending' ? "Upload and submit a CSV on the Indent page to see data here." : "Submit some approvals to see them in history."}
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Action</th>
                  <th style={thStyle}>Indent ID</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  <th style={thStyle}>Party Name</th>
                  <th style={thStyle}>1st Item Name</th>
                  <th style={thStyle}>1st Brand Name</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Order Qty</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Order Box</th>
                </tr>
              </thead>
              <tbody>
                {displayedBatches.map(([indentId, items], index) => (
                  <tr 
                    key={indentId} 
                    style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', cursor: 'pointer', transition: 'background-color 0.2s' }} 
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} 
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}
                    onClick={() => setSelectedIndentId(indentId)}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedIndentId(indentId); }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#4f46e5',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px'
                        }}
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                    <td style={{ ...tdStyle, color: '#4338ca', fontWeight: '600' }}>{indentId}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: '600', fontSize: '12px' }} title="Approved">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 0 2px #dcfce7' }}></span>
                          {items.filter(i => indentStatuses[i.id] === 'approved').length}
                        </div>
                        <div style={{ width: '1px', height: '14px', backgroundColor: '#e2e8f0' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: '600', fontSize: '12px' }} title="Rejected">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 0 2px #fee2e2' }}></span>
                          {items.filter(i => indentStatuses[i.id] === 'rejected').length}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>{items[0]?.party_name || "-"}</td>
                    <td style={tdStyle}>{items[0]?.item_name || "-"}</td>
                    <td style={tdStyle}>{items[0]?.brand_name || "-"}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calculateTotalOrderQty(items)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{calculateTotalOrderBox(items)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedIndentId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                  Details for {selectedIndentId}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                  Party: {groupedApprovals[selectedIndentId]?.[0]?.party_name || "Unknown"}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {activeTab !== 'history' && (
                  <button
                    onClick={handleSubmitApprovals}
                    disabled={isLoading}
                    style={{
                      background: isLoading ? '#94a3b8' : '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 20px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#059669'; }}
                    onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#10b981'; }}
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    {isLoading ? 'Submitting...' : 'Submit'}
                  </button>
                )}
                <button 
                  onClick={() => setSelectedIndentId(null)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Approve / Reject</th>
                      <th style={thStyle}>Indent ID</th>
                      <th style={thStyle}>Item Name</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Order Box</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Order Qty</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Avg Sale</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Closing Qty</th>
                      <th style={thStyle}>Brand Name</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>B/Cs</th>
                      <th style={thStyle}>Mls</th>
                      <th style={thStyle}>Liquor Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedApprovals[selectedIndentId]?.map((item, index) => {
                      const itemId = item.id || index;
                      return (
                      <tr key={itemId} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                        <td style={{ ...tdStyle, textAlign: 'center', minWidth: '160px' }}>
                          {activeTab === 'history' ? (
                            <span style={{ 
                              display: 'inline-block', 
                              padding: '4px 10px', 
                              borderRadius: '6px', 
                              fontSize: '12px', 
                              fontWeight: '600',
                              backgroundColor: indentStatuses[itemId] === 'approved' ? '#dcfce7' : '#fee2e2',
                              color: indentStatuses[itemId] === 'approved' ? '#16a34a' : '#dc2626'
                            }}>
                              {indentStatuses[itemId] === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: indentStatuses[itemId] === 'approved' ? '#16a34a' : '#64748b', fontWeight: '500', transition: 'all 0.2s', fontSize: '13px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={indentStatuses[itemId] === 'approved'} 
                                  onChange={() => handleStatusChange(itemId, 'approved')} 
                                  style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                                />
                                Approve
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: indentStatuses[itemId] === 'rejected' ? '#dc2626' : '#64748b', fontWeight: '500', transition: 'all 0.2s', fontSize: '13px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={indentStatuses[itemId] === 'rejected'} 
                                  onChange={() => handleStatusChange(itemId, 'rejected')} 
                                  style={{ width: '16px', height: '16px', accentColor: '#dc2626', cursor: 'pointer' }}
                                />
                                Reject
                              </label>
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: '#64748b' }}>{item.party_indent_id || "-"}</td>
                        <td style={tdStyle}>{item.item_name}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#4338ca' }}>{item.order_box || "-"}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#4338ca' }}>{item.order_qty || "-"}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{item.fix_per_day_avg_sale || "-"}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{item.closing_qty || "-"}</td>
                        <td style={tdStyle}>{item.brand_name || "-"}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{item.bcs || "-"}</td>
                        <td style={tdStyle}>{item.mls || "-"}</td>
                        <td style={tdStyle}>{item.liquor_type || "-"}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approval;
