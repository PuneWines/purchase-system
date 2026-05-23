import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { sendTransporterConfirmationMessage } from "../services/whatsappService";
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
        const { data, error } = await supabase
          .from("purchase_orders")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setPoData(data);
        
        // If already submitted previously, we can block or show read-only
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
        const confirmLink = `${window.location.origin}/transporter-confirmation/${id}`;
        
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
                <FileText size={18} /> View Trader PDF
              </a>
            )}
            {poData.receiver_pdf_url && (
              <a href={poData.receiver_pdf_url} target="_blank" rel="noopener noreferrer" className="vc-doc-link">
                <FileText size={18} /> View Receiver PDF
              </a>
            )}
          </div>
        </div>

        {submitted ? (
          <div className="vc-success-state">
            <CheckCircle2 size={48} className="vc-success-icon" />
            <h3>Link Already Used / Response Recorded</h3>
            <p>This confirmation link has already been submitted. Here is your recorded response:</p>
            <div className="vc-submitted-details">
              <p><strong>Status:</strong> {poData.trader_status || status}</p>
              {(poData.dispatch_date || dispatchDate) && <p><strong>Dispatch Date:</strong> {poData.dispatch_date || dispatchDate}</p>}
              {(poData.remarks || remarks) && <p><strong>Remarks:</strong> {poData.remarks || remarks}</p>}
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default VendorConfirmation;
