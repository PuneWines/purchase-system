import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import "../styles/VendorConfirmation.css";

const ReceiverConfirmation = () => {
  const { id } = useParams();
  const [poData, setPoData] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [receivedQtys, setReceivedQtys] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [status, setStatus] = useState(""); // "yes" or "no"
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch PO Data
        const { data: po, error: poErr } = await supabase
          .from("purchase_orders")
          .select("*")
          .eq("id", id)
          .single();

        if (poErr) throw poErr;
        setPoData(po);

        // If already submitted previously, we block submission
        if (po.receiver_status) {
          setSubmitted(true);
          if (po.received_items) {
             setReceivedQtys(po.received_items);
          }
        }

        // Fetch Order Items from indent_items
        if (po.indent_id && po.vendor_name) {
          const { data: itemsData, error: itemsErr } = await supabase
            .from("indent_items")
            .select("*")
            .eq("indent_id", po.indent_id)
            .eq("party_name", po.vendor_name);

          if (!itemsErr && itemsData) {
            const filtered = itemsData
              .filter(item => parseFloat(item.order_qty) > 0)
              .map(item => ({
                id: item.id,
                itemName: item.item_name,
                brandName: item.brand_name,
                orderQty: parseFloat(item.order_qty),
                bcs: item.bcs ? parseFloat(item.bcs) : null
              }));
            setOrderItems(filtered);

            // Initialize receivedQtys with orderQty if not already submitted
            if (!po.receiver_status) {
              const initQtys = {};
              filtered.forEach(item => {
                initQtys[item.id] = item.orderQty; // Default to full receive
              });
              setReceivedQtys(initQtys);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Purchase Order not found or an error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleQtyChange = (itemId, val) => {
    setReceivedQtys(prev => ({
      ...prev,
      [itemId]: val === "" ? "" : Number(val)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!status) {
      setFormError("Please select whether you confirm the delivery receipt.");
      return;
    }

    // Validate quantities if accepted
    if (status === "yes") {
      for (const item of orderItems) {
        if (receivedQtys[item.id] === "" || receivedQtys[item.id] === null || receivedQtys[item.id] < 0) {
           setFormError(`Please enter a valid received quantity for ${item.itemName}.`);
           return;
        }
      }
    }

    setSubmitting(true);
    try {
      // Build JSON for received items
      const receivedItemsJSON = {};
      orderItems.forEach(item => {
        receivedItemsJSON[item.id] = {
           itemName: item.itemName,
           orderQty: item.orderQty,
           receivedQty: receivedQtys[item.id]
        };
      });

      const { error: updateErr } = await supabase
        .from("purchase_orders")
        .update({
          receiver_status: status,
          receiver_remarks: remarks || null,
          received_items: status === "yes" ? receivedItemsJSON : null
        })
        .eq("id", id);

      if (updateErr) throw updateErr;
      
      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting confirmation:", err);
      setFormError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="vc-page-loading">
        <Loader2 className="vc-spin" size={40} />
        <p>Loading Delivery Details...</p>
      </div>
    );
  }

  if (error || !poData) {
    return (
      <div className="vc-page-error">
        <AlertCircle size={40} className="vc-error-icon" />
        <h2>Error</h2>
        <p>{error || "Unable to load data."}</p>
      </div>
    );
  }

  return (
    <div className="vc-container">
      <div className="vc-card" style={{ maxWidth: '800px' }}>
        <div className="vc-header" style={{ borderLeftColor: '#10b981' }}>
          <h2>Delivery Receipt Confirmation</h2>
          <span className="vc-po-number">{poData.po_number}</span>
        </div>

        <div className="vc-section">
          <h3>Delivery Meta</h3>
          <div className="vc-details-grid">
            <div className="vc-detail-item">
              <span className="vc-label">Vendor</span>
              <span className="vc-value">{poData.vendor_name || "N/A"}</span>
            </div>
            <div className="vc-detail-item">
              <span className="vc-label">Transporter</span>
              <span className="vc-value">{poData.transporter_number || "N/A"}</span>
            </div>
            <div className="vc-detail-item">
              <span className="vc-label">Total Qty (Ordered)</span>
              <span className="vc-value">{poData.total_order_qty || "0"}</span>
            </div>
            <div className="vc-detail-item">
              <span className="vc-label">PO Document</span>
              <span className="vc-value">
                {poData.receiver_pdf_url || poData.trader_pdf_url ? (
                  <a href={poData.receiver_pdf_url || poData.trader_pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={16} /> View PDF
                  </a>
                ) : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="vc-section">
          <h3>Item Verification</h3>
          {orderItems.length > 0 ? (
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px' }}>Item Name</th>
                    <th style={{ padding: '10px' }}>Brand</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Ordered Qty</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Received Qty</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => {
                    const recVal = submitted && poData.received_items ? poData.received_items[item.id]?.receivedQty : receivedQtys[item.id];
                    const rQty = Number(recVal) || 0;
                    const diff = rQty - item.orderQty;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: '500' }}>{item.itemName}</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{item.brandName || "—"}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.orderQty}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {submitted ? (
                            <span style={{ fontWeight: 'bold' }}>{rQty}</span>
                          ) : (
                            <input 
                              type="number"
                              min="0"
                              style={{ width: '80px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                              value={receivedQtys[item.id] === undefined ? "" : receivedQtys[item.id]}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              disabled={status === "no"}
                            />
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: diff < 0 ? '#ef4444' : (diff > 0 ? '#f59e0b' : '#10b981') }}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No item data found for this order.</p>
          )}
        </div>

        {submitted ? (
          <div className="vc-success-state">
            <CheckCircle2 size={48} className="vc-success-icon" style={{ color: '#10b981' }} />
            <h3 style={{ color: '#059669' }}>Delivery Receipt Recorded</h3>
            <p>Thank you. Your receiving data has been submitted successfully.</p>
            <div className="vc-submitted-details">
              <p><strong>Status:</strong> {poData.receiver_status || status}</p>
              {(poData.receiver_remarks || remarks) && <p><strong>Remarks:</strong> {poData.receiver_remarks || remarks}</p>}
            </div>
          </div>
        ) : (
          <form className="vc-form" onSubmit={handleSubmit}>
            <h3>Your Response</h3>
            
            {formError && <div className="vc-error-msg">{formError}</div>}

            <div className="vc-form-group">
              <label className="vc-label-main">Do you confirm receiving this delivery? *</label>
              <div className="vc-radio-group">
                <label className={`vc-radio-label ${status === "yes" ? "vc-selected" : ""}`} style={status === "yes" ? { borderColor: '#10b981', background: '#d1fae5', color: '#059669' } : {}}>
                  <input
                    type="radio"
                    name="status"
                    value="yes"
                    checked={status === "yes"}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  Yes, received
                </label>
                <label className={`vc-radio-label ${status === "no" ? "vc-selected-no" : ""}`}>
                  <input
                    type="radio"
                    name="status"
                    value="no"
                    checked={status === "no"}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  No, rejected/not received
                </label>
              </div>
            </div>

            <div className="vc-form-group">
              <label className="vc-label-main" htmlFor="remarks">
                Remarks (Optional)
              </label>
              <textarea
                id="remarks"
                className="vc-textarea"
                rows={3}
                placeholder="Any issues, missing items, or damages..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="vc-submit-btn" 
              style={{ background: '#10b981' }}
              disabled={!status || submitting}
            >
              {submitting ? "Submitting..." : "Submit Receipt"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReceiverConfirmation;
