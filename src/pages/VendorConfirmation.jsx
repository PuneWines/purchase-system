import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { sendTransporterConfirmationMessage, generateRoleToken } from "../services/whatsappService";
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

  useEffect(() => {
    const fetchPO = async () => {
      try {
        // Validate secure one-time link token to prevent unauthorized viewing
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const expectedToken = generateRoleToken(id, "vendor");

        if (token !== expectedToken) {
          setError("Invalid or expired link. Access denied.");
          setLoading(false);
          return;
        }

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
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          trader_status: status,
          dispatch_date: dispatchDate || null,
          remarks: remarks || null
        })
        .eq("id", id);

      if (error) throw error;
      
      // If vendor confirmed and a transporter is assigned, trigger the transporter message
      if (status === "yes" && poData.transporter_number) {
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
        const confirmLink = `${baseUrl}/transporter-confirmation/${id}`;
        
        let formattedPhone = poData.transporter_number.replace(/\D/g, "");
        if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;

        // Try to trigger in background so it doesn't block UI too long
        sendTransporterConfirmationMessage(
          formattedPhone,
          poData.po_number,
          confirmLink,
          "DRINQKART",
          poData.vendor_name,
          poData.receiver_pdf_url || poData.trader_pdf_url
        ).then(res => {
          if (!res.success) {
            console.warn("Transporter message failed:", res.error);
          }
        });
      }
      
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

