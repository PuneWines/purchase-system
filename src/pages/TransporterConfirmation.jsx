import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { generateRoleToken } from "../services/whatsappService";
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
        // Validate secure one-time link token to prevent unauthorized viewing
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const expectedToken = generateRoleToken(id, "transporter");

        if (token !== expectedToken) {
          setError("Invalid or expired link. Access denied.");
          setLoading(false);
          return;
        }

        const { data, err } = await supabase
          .from("purchase_orders")
          .select("*")
          .eq("id", id)
          .single();

        if (err) throw err;
        setPoData(data);

        // If already submitted previously, show read-only submission screen
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
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
        const confirmLink = `${baseUrl}/receiver-confirmation/${id}`;

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
        {submitted ? (
          <div className="vc-success-state" style={{ padding: "48px 32px" }}>
            <CheckCircle2 size={64} className="vc-success-icon" style={{ color: "#f59e0b", marginBottom: "24px" }} />
            <h2 style={{ color: "#d97706", fontSize: "24px", fontWeight: "700", marginBottom: "12px" }}>
              Response Already Recorded
            </h2>
            <p style={{ color: "#64748b", fontSize: "15px", lineHeight: "1.6", marginBottom: "32px" }}>
              Thank you. The response for Purchase Order <strong style={{ color: "#0f172a" }}>{poData.po_number}</strong> has already been submitted and verified.
            </p>
            <div className="vc-submitted-details" style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: "12px", padding: "24px" }}>
              <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Your Submitted Details
              </h4>
              <p style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#78350f" }}>
                <strong>Pick-Up Status:</strong> {poData.transporter_status === "yes" ? "✅ Confirmed" : "❌ Rejected"}
              </p>
              {poData.pickup_date && (
                <p style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#78350f" }}>
                  <strong>Pick-Up Date:</strong> {new Date(poData.pickup_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
              {poData.delivery_date && (
                <p style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#78350f" }}>
                  <strong>Expected Delivery Date:</strong> {new Date(poData.delivery_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              )}
              {poData.transporter_remarks && (
                <p style={{ margin: 0, fontSize: "15px", color: "#78350f" }}>
                  <strong>Remarks:</strong> {poData.transporter_remarks}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default TransporterConfirmation;

