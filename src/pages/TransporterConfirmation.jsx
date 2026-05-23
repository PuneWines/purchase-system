import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import "../styles/VendorConfirmation.css"; // We reuse the styling as requested

const TransporterConfirmation = () => {
  const { id } = useParams();
  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [status, setStatus] = useState(""); // "yes" or "no"
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const { data, err } = await supabase
          .from("purchase_orders")
          .select("*")
          .eq("id", id)
          .single();

        if (err) throw err;
        setPoData(data);
        
        // If already submitted previously, we block submission
        if (data.transporter_status) {
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
      setFormError("Please select whether you confirm the pick-up.");
      return;
    }

    if (status === "yes" && (!pickupDate || !deliveryDate)) {
      setFormError("Please specify both pick-up and expected delivery dates.");
      return;
    }

    if (status === "no" && !remarks.trim()) {
      setFormError("Please provide remarks for rejecting the pick-up.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase
        .from("purchase_orders")
        .update({
          transporter_status: status,
          pickup_date: pickupDate || null,
          delivery_date: deliveryDate || null,
          transporter_remarks: remarks || null
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      // Trigger the receiver WhatsApp message if transporter confirms pickup
      if (status === "yes" && poData.receiver_number) {
        const confirmLink = `${window.location.origin}/receiver-confirmation/${id}`;
        
        let formattedPhone = poData.receiver_number.replace(/\D/g, "");
        if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;

        import("../services/whatsappService").then(({ sendReceiverConfirmationMessage }) => {
          sendReceiverConfirmationMessage(
            formattedPhone,
            poData.po_number,
            confirmLink,
            "DRINQKART",
            poData.vendor_name,
            poData.receiver_pdf_url || poData.trader_pdf_url
          ).then(res => {
            if (!res.success) {
              console.warn("Receiver message failed:", res.error);
            }
          });
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
        <p>Loading Details...</p>
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
        <div className="vc-header" style={{ borderLeftColor: '#f59e0b' }}>
          <h2>Pick-Up Confirmation</h2>
          <span className="vc-po-number">{poData.po_number}</span>
        </div>

        <div className="vc-section">
          <h3>Order Details</h3>
          <div className="vc-details-grid">
            <div className="vc-detail-item">
              <span className="vc-label">Vendor Name</span>
              <span className="vc-value">{poData.vendor_name || "N/A"}</span>
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
            {poData.receiver_pdf_url ? (
              <a href={poData.receiver_pdf_url} target="_blank" rel="noopener noreferrer" className="vc-doc-link">
                <FileText size={18} /> View Receiver PDF
              </a>
            ) : poData.trader_pdf_url && (
              <a href={poData.trader_pdf_url} target="_blank" rel="noopener noreferrer" className="vc-doc-link">
                <FileText size={18} /> View PO PDF
              </a>
            )}
          </div>
        </div>

        {submitted ? (
          <div className="vc-success-state">
            <CheckCircle2 size={48} className="vc-success-icon" style={{ color: '#f59e0b' }} />
            <h3 style={{ color: '#d97706' }}>Response Recorded</h3>
            <p>Thank you. Here is your recorded response:</p>
            <div className="vc-submitted-details">
              <p><strong>Status:</strong> {poData.transporter_status || status}</p>
              {(poData.pickup_date || pickupDate) && <p><strong>Pick-up Date:</strong> {poData.pickup_date || pickupDate}</p>}
              {(poData.delivery_date || deliveryDate) && <p><strong>Expected Delivery Date:</strong> {poData.delivery_date || deliveryDate}</p>}
              {(poData.transporter_remarks || remarks) && <p><strong>Remarks:</strong> {poData.transporter_remarks || remarks}</p>}
            </div>
          </div>
        ) : (
          <form className="vc-form" onSubmit={handleSubmit}>
            <h3>Your Response</h3>
            
            {formError && <div className="vc-error-msg">{formError}</div>}

            <div className="vc-form-group">
              <label className="vc-label-main">Do you confirm this pick-up? *</label>
              <div className="vc-radio-group">
                <label className={`vc-radio-label ${status === "yes" ? "vc-selected" : ""}`} style={status === "yes" ? { borderColor: '#f59e0b', background: '#fef3c7', color: '#d97706' } : {}}>
                  <input
                    type="radio"
                    name="status"
                    value="yes"
                    checked={status === "yes"}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  Yes, confirm pick-up
                </label>
                <label className={`vc-radio-label ${status === "no" ? "vc-selected-no" : ""}`}>
                  <input
                    type="radio"
                    name="status"
                    value="no"
                    checked={status === "no"}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  No, reject pick-up
                </label>
              </div>
            </div>

            {status === "yes" && (
              <>
                <div className="vc-form-group">
                  <label className="vc-label-main" htmlFor="pickupDate">Pick-up Date *</label>
                  <input
                    type="date"
                    id="pickupDate"
                    className="vc-input"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="vc-form-group">
                  <label className="vc-label-main" htmlFor="deliveryDate">Expected Delivery Date *</label>
                  <input
                    type="date"
                    id="deliveryDate"
                    className="vc-input"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={pickupDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </>
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
              style={{ background: '#f59e0b' }}
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

export default TransporterConfirmation;
