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

        // If already submitted previously, show read-only submission screen
        if (po.receiver_status) {
          setSubmitted(true);
          if (po.received_items) {
             setReceivedQtys(po.received_items);
          }
        }

        // Fetch Order Items from approved_indent_items
        if (po.indent_id && po.vendor_name) {
          const { data: itemsData, error: itemsErr } = await supabase
            .from("approved_indent_items")
            .select("*")
            .or(`po_id.eq.${po.id},unique_indent_id.eq.${po.indent_id}`)
            .neq("po_status", "excluded");

          if (!itemsErr && itemsData) {
            const filtered = itemsData
              .filter(item => 
                item.party_name?.toLowerCase() === po.vendor_name?.toLowerCase() &&
                parseFloat(item.order_qty) > 0
              )
              .map(item => {
                const orderQty = parseFloat(item.order_qty) || 0;
                const bcs = item.bcs ? parseFloat(item.bcs) : null;
                const orderBox = (orderQty && bcs) ? orderQty / bcs : null;
                return {
                  id: item.id,
                  itemName: item.item_name,
                  brandName: item.brand_name,
                  orderQty: orderQty,
                  bcs: bcs,
                  orderBox: orderBox,
                  closingQty: item.closing_qty != null ? item.closing_qty : "—"
                };
              });
            setOrderItems(filtered);

            // Initialize receivedQtys with 0 if not already submitted
            if (!po.receiver_status) {
              const initQtys = {};
              filtered.forEach(item => {
                initQtys[item.id] = 0; // Default to 0
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

  const handleMatchAll = () => {
    if (status === "no") return;
    const matched = {};
    orderItems.forEach(item => {
      matched[item.id] = item.orderQty;
    });
    setReceivedQtys(matched);
  };

  const handleResetAll = () => {
    if (status === "no") return;
    const reset = {};
    orderItems.forEach(item => {
      reset[item.id] = 0;
    });
    setReceivedQtys(reset);
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
      
      // Fetch latest data to display on success page
      const { data: updatedPo } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", id)
        .single();
      if (updatedPo) {
        setPoData(updatedPo);
        if (updatedPo.received_items) {
          setReceivedQtys(updatedPo.received_items);
        }
      }

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
        {submitted ? (
          <div className="vc-success-state" style={{ padding: "48px 32px" }}>
            <CheckCircle2 size={64} className="vc-success-icon" style={{ color: "#10b981", marginBottom: "24px" }} />
            <h2 style={{ color: "#059669", fontSize: "24px", fontWeight: "700", marginBottom: "12px" }}>
              Delivery Receipt Recorded
            </h2>
            <p style={{ color: "#64748b", fontSize: "15px", lineHeight: "1.6", marginBottom: "32px" }}>
              Thank you. The receiving data for Purchase Order <strong style={{ color: "#0f172a" }}>{poData.po_number}</strong> has already been submitted and verified.
            </p>
            <div className="vc-submitted-details" style={{ backgroundColor: "#d1fae5", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "24px" }}>
              <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "#065f46", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Your Submitted Details
              </h4>
              <p style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#047857" }}>
                <strong>Receiving Status:</strong> {poData.receiver_status === "yes" ? "✅ Received Successfully" : "❌ Rejected / Not Received"}
              </p>
              {poData.receiver_remarks && (
                <p style={{ margin: 0, fontSize: "15px", color: "#047857" }}>
                  <strong>Remarks:</strong> {poData.receiver_remarks}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
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
                    {poData.receiver_pdf_url ? (
                      <a href={poData.receiver_pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={16} /> View Document
                      </a>
                    ) : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="vc-section">
              <div className="vc-section-header-flex">
                <h3>Item Verification</h3>
                {orderItems.length > 0 && (
                  <div className="vc-quick-actions">
                    <button
                      type="button"
                      className="vc-action-btn vc-btn-match"
                      onClick={handleMatchAll}
                      disabled={status === "no"}
                    >
                      ✨ Match All Order Quantities
                    </button>
                    <button
                      type="button"
                      className="vc-action-btn vc-btn-reset"
                      onClick={handleResetAll}
                      disabled={status === "no"}
                    >
                      🔄 Reset All to 0
                    </button>
                  </div>
                )}
              </div>

              {orderItems.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="vc-table-desktop">
                    <div className="vc-table-wrapper">
                      <table className="vc-desktop-table">
                        <thead>
                          <tr>
                            <th className="vc-th-center" style={{ width: '60px' }}>S.No</th>
                            <th>Item Name</th>
                            <th>Brand</th>
                            <th className="vc-th-center" style={{ width: '120px' }}>Closing Stock</th>
                            <th className="vc-th-center" style={{ width: '120px' }}>Ordered Box</th>
                            <th className="vc-th-center" style={{ width: '120px' }}>Ordered Qty</th>
                            <th className="vc-th-center" style={{ width: '260px' }}>Received Qty</th>
                            <th className="vc-th-center" style={{ width: '150px' }}>Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderItems.map((item, i) => {
                            const recVal = receivedQtys[item.id];
                            const rQty = Number(recVal) || 0;
                            const diff = rQty - item.orderQty;

                            let diffBadgeClass = "vc-badge-match";
                            let diffText = "Perfect Match";
                            if (diff < 0) {
                              diffBadgeClass = "vc-badge-shortage";
                              diffText = `${diff} Bottles`;
                            } else if (diff > 0) {
                              diffBadgeClass = "vc-badge-surplus";
                              diffText = `+${diff} Bottles`;
                            }

                            return (
                              <tr key={item.id} className={diff === 0 ? "vc-tr-match" : (diff < 0 ? "vc-tr-shortage" : "vc-tr-surplus")}>
                                <td className="vc-td-center vc-text-muted">{i + 1}</td>
                                <td className="vc-font-semibold">{item.itemName}</td>
                                <td className="vc-text-muted">{item.brandName || item.itemName}</td>
                                <td className="vc-td-center">{item.closingQty} Bottles</td>
                                <td className="vc-td-center vc-font-medium">
                                  {item.orderBox != null ? item.orderBox.toFixed(2) : "—"}
                                </td>
                                <td className="vc-td-center vc-font-medium">{item.orderQty} Bottles</td>
                                <td className="vc-td-center">
                                  <div className="vc-table-qty-control">
                                    <button
                                      type="button"
                                      className="vc-table-qty-btn"
                                      onClick={() => {
                                        const newVal = Math.max(0, rQty - 1);
                                        handleQtyChange(item.id, newVal);
                                      }}
                                      disabled={status === "no" || rQty <= 0}
                                    >
                                      −
                                    </button>
                                    <input 
                                      type="number"
                                      min="0"
                                      className="vc-table-qty-input"
                                      value={receivedQtys[item.id] === undefined ? "" : receivedQtys[item.id]}
                                      onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                      disabled={status === "no"}
                                    />
                                    <button
                                      type="button"
                                      className="vc-table-qty-btn"
                                      onClick={() => {
                                        const newVal = rQty + 1;
                                        handleQtyChange(item.id, newVal);
                                      }}
                                      disabled={status === "no"}
                                    >
                                      +
                                    </button>
                                    <button
                                      type="button"
                                      className="vc-table-match-btn"
                                      onClick={() => handleQtyChange(item.id, item.orderQty)}
                                      disabled={status === "no" || rQty === item.orderQty}
                                      title="Match ordered quantity"
                                    >
                                      Match
                                    </button>
                                  </div>
                                </td>
                                <td className="vc-td-center">
                                  <span className={`vc-diff-badge ${diffBadgeClass}`}>
                                    {diffText}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="vc-cards-mobile">
                    {orderItems.map((item, i) => {
                      const recVal = receivedQtys[item.id];
                      const rQty = Number(recVal) || 0;
                      const diff = rQty - item.orderQty;

                      const handleDecrement = () => {
                        if (status === "no") return;
                        const newVal = Math.max(0, rQty - 1);
                        handleQtyChange(item.id, newVal);
                      };

                      const handleIncrement = () => {
                        if (status === "no") return;
                        const newVal = rQty + 1;
                        handleQtyChange(item.id, newVal);
                      };

                      let cardStatusClass = "vc-card-match";
                      let diffText = "Perfect Match";
                      let diffBadgeClass = "vc-badge-match";
                      
                      if (diff < 0) {
                        cardStatusClass = "vc-card-shortage";
                        diffText = `${diff} Bottles`;
                        diffBadgeClass = "vc-badge-shortage";
                      } else if (diff > 0) {
                        cardStatusClass = "vc-card-surplus";
                        diffText = `+${diff} Bottles`;
                        diffBadgeClass = "vc-badge-surplus";
                      }

                      return (
                        <div className={`vc-item-card ${cardStatusClass}`} key={item.id}>
                          <div className="vc-item-card-header">
                            <div className="vc-item-card-header-left">
                              <span className="vc-item-card-index">#{i + 1}</span>
                              <span className="vc-item-card-title">{item.itemName}</span>
                            </div>
                            <span className={`vc-diff-badge ${diffBadgeClass} vc-card-badge-header`}>
                              {diffText}
                            </span>
                          </div>
                          
                          <div className="vc-item-card-details">
                            <div className="vc-card-detail-row">
                              <div className="vc-detail-pair">
                                <span className="vc-item-card-detail-label">Brand</span>
                                <span className="vc-item-card-detail-value">{item.brandName || item.itemName}</span>
                              </div>
                              <div className="vc-detail-pair">
                                <span className="vc-item-card-detail-label">Closing Stock</span>
                                <span className="vc-item-card-detail-value">{item.closingQty} Bottles</span>
                              </div>
                            </div>
                            <div className="vc-card-detail-row vc-detail-row-divider">
                              <div className="vc-detail-pair">
                                <span className="vc-item-card-detail-label">Ordered Boxes</span>
                                <span className="vc-item-card-detail-value">{item.orderBox != null ? item.orderBox.toFixed(2) : "—"} Boxes</span>
                              </div>
                              <div className="vc-detail-pair">
                                <span className="vc-item-card-detail-label">Ordered Qty</span>
                                <span className="vc-item-card-detail-value">{item.orderQty} Bottles</span>
                              </div>
                            </div>
                          </div>

                          <div className="vc-item-card-actions">
                            <div className="vc-counter-container">
                              <span className="vc-item-qty-label">Received Qty</span>
                              <div className="vc-qty-counter">
                                <button 
                                  type="button" 
                                  className="vc-qty-btn vc-btn-minus"
                                  onClick={handleDecrement}
                                  disabled={status === "no" || rQty <= 0}
                                >
                                  −
                                </button>
                                <input 
                                  type="number" 
                                  className="vc-qty-input"
                                  min="0"
                                  value={receivedQtys[item.id] === undefined ? "" : receivedQtys[item.id]}
                                  onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                  disabled={status === "no"}
                                />
                                <button 
                                  type="button" 
                                  className="vc-qty-btn vc-btn-plus"
                                  onClick={handleIncrement}
                                  disabled={status === "no"}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              className="vc-card-match-btn"
                              onClick={() => handleQtyChange(item.id, item.orderQty)}
                              disabled={status === "no" || rQty === item.orderQty}
                            >
                              🎯 Match Order ({item.orderQty})
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No item data found for this order.</p>
              )}
            </div>

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
          </>
        )}
      </div>
    </div>
  );
};

export default ReceiverConfirmation;

