import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import "../styles/VendorConfirmation.css";

const VendorConfirmation = () => {
  const { id } = useParams();
  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [status, setStatus] = useState(""); // "yes" or "no"
  const [dispatchDate, setDispatchDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState("");
  const [shopName, setShopName] = useState("Unknown");

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const { data, error } = await supabase
          .from("purchase_orders")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setPoData(data);
        
        // If already submitted previously, show read-only submission screen
        if (data.trader_status) {
          setSubmitted(true);
        }

        // Fetch shop name dynamically to support conditional transporter bypass
        let resolvedShopName = "Unknown";
        if (data.indent_id) {
          let { data: itemData } = await supabase
            .from("approved_indent_items")
            .select("indent_id")
            .eq("unique_indent_id", data.indent_id)
            .limit(1);

          if (!itemData || itemData.length === 0) {
            const { data: fallbackData } = await supabase
              .from("indent_items")
              .select("indent_id")
              .eq("unique_indent_id", data.indent_id)
              .limit(1);
            itemData = fallbackData;
          }

          if (itemData && itemData.length > 0 && itemData[0].indent_id) {
            const { data: indentData } = await supabase
              .from("indents")
              .select("shop_name")
              .eq("id", itemData[0].indent_id)
              .single();
            if (indentData) {
              resolvedShopName = indentData.shop_name;
            }
          }
        }
        setShopName(resolvedShopName);
      } catch (err) {
        console.error("Error fetching PO:", err);
        setError("Purchase Order not found or an error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPO();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!status) {
      setFormError("Please select whether you confirm the order.");
      return;
    }

    if (status === "yes" && !dispatchDate) {
      setFormError("Please specify a dispatch date.");
      return;
    }

    if (status === "no" && !remarks.trim()) {
      setFormError("Please provide remarks for rejecting the order.");
      return;
    }

    setSubmitting(true);
    try {
      const isKunalShop = shopName?.toUpperCase() === "KUNAL";
      const updatePayload = {
        trader_status: status,
        dispatch_date: status === "no" ? new Date().toISOString() : (dispatchDate || null),
        remarks: remarks || null
      };

      if (status === "yes" && isKunalShop) {
        updatePayload.transporter_status = "yes";
        updatePayload.pickup_date = dispatchDate || null;
        updatePayload.transporter_remarks = "Transporter Bypassed (KUNAL Shop)";
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;
      
      // WhatsApp notifications removed to avoid spammed alerts
      
      // Fetch latest data to display on success page
      const { data: updatedData } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", id)
        .single();
      if (updatedData) {
        setPoData(updatedData);
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
        <p>Loading Purchase Order details...</p>
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
      <div className="vc-card">
        {submitted ? (
          <div className="vc-success-state" style={{ padding: "48px 32px" }}>
            <CheckCircle2 size={64} className="vc-success-icon" style={{ color: "#10b981", marginBottom: "24px" }} />
            <h2 style={{ color: "#0f172a", fontSize: "24px", fontWeight: "700", marginBottom: "12px" }}>
              Response Already Recorded
            </h2>
            <p style={{ color: "#64748b", fontSize: "15px", lineHeight: "1.6", marginBottom: "32px" }}>
              Thank you. The response for Purchase Order <strong style={{ color: "#0f172a" }}>{poData.po_number}</strong> has already been submitted and verified.
            </p>
            <div className="vc-submitted-details" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
              <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Your Submitted Details
              </h4>
              <p style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#334155" }}>
                <strong>Confirmation Status:</strong> {poData.trader_status === "yes" ? "✅ Confirmed" : "❌ Rejected"}
              </p>
              {poData.dispatch_date && (
                <p style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#334155" }}>
                  <strong>Expected Dispatch Date:</strong> {new Date(poData.dispatch_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
              {poData.remarks && (
                <p style={{ margin: 0, fontSize: "15px", color: "#334155" }}>
                  <strong>Remarks:</strong> {poData.remarks}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="vc-header">
              <h2>Purchase Order Confirmation</h2>
              <span className="vc-po-number">{poData.po_number}</span>
            </div>

            <div className="vc-section">
              <h3>Order Details</h3>
              <div className="vc-details-grid">
                <div className="vc-detail-item">
                  <span className="vc-label">Indent ID</span>
                  <span className="vc-value">{poData.indent_id || "N/A"}</span>
                </div>
                <div className="vc-detail-item">
                  <span className="vc-label">Primary Brand</span>
                  <span className="vc-value">{poData.first_brand_name || "N/A"}</span>
                </div>
                <div className="vc-detail-item">
                  <span className="vc-label">Total Qty (Bottles)</span>
                  <span className="vc-value">{poData.total_order_qty || "0"}</span>
                </div>
                <div className="vc-detail-item">
                  <span className="vc-label">Total Boxes</span>
                  <span className="vc-value">{poData.total_order_box || "0"}</span>
                </div>
              </div>
            </div>

            <div className="vc-section">
              <h3>Documents</h3>
              <div className="vc-documents">
                {poData.trader_pdf_url && (
                  <a href={poData.trader_pdf_url} target="_blank" rel="noopener noreferrer" className="vc-doc-link">
                    <FileText size={18} /> View Trader Document
                  </a>
                )}
              </div>
            </div>

            <form className="vc-form" onSubmit={handleSubmit}>
              <h3>Your Response</h3>
              
              {formError && <div className="vc-error-msg">{formError}</div>}

              <div className="vc-form-group">
                <label className="vc-label-main">Do you confirm this order? *</label>
                <div className="vc-radio-group">
                  <label className={`vc-radio-label ${status === "yes" ? "vc-selected" : ""}`}>
                    <input
                      type="radio"
                      name="status"
                      value="yes"
                      checked={status === "yes"}
                      onChange={(e) => setStatus(e.target.value)}
                    />
                    Yes, confirm order
                  </label>
                  <label className={`vc-radio-label ${status === "no" ? "vc-selected-no" : ""}`}>
                    <input
                      type="radio"
                      name="status"
                      value="no"
                      checked={status === "no"}
                      onChange={(e) => setStatus(e.target.value)}
                    />
                    No, reject order
                  </label>
                </div>
              </div>

              {status === "yes" && (
                <div className="vc-form-group">
                  <label className="vc-label-main" htmlFor="dispatchDate">Expected Dispatch Date *</label>
                  <input
                    type="date"
                    id="dispatchDate"
                    className="vc-input"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              {(status === "yes" || status === "no") && (
                <div className="vc-form-group">
                  <label className="vc-label-main" htmlFor="remarks">
                    Remarks {status === "no" ? "*" : "(Optional)"}
                  </label>
                  <textarea
                    id="remarks"
                    className="vc-textarea"
                    rows={4}
                    placeholder={status === "no" ? "Please specify reason for rejection..." : "Any additional notes..."}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="vc-submit-btn" 
                disabled={!status || submitting}
              >
                {submitting ? "Submitting..." : "Submit Response"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default VendorConfirmation;

