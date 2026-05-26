import React, { useState, useEffect, useMemo } from "react";
import useShopStore from "../store/useShopStore";
import { supabase } from "../../utils/supabase";
import {
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Truck,
  Search,
  Building2,
  Filter,
  Calendar,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
  FileSpreadsheet,
  Check,
  XCircle,
  MapPin,
  CalendarDays,
  Layers,
  ArrowRight
} from "lucide-react";
import "../styles/Dashboard.css";

const Dashboard = () => {
  // Database States
  const [rawIndents, setRawIndents] = useState([]);
  const [rawIndentItems, setRawIndentItems] = useState([]);
  const [rawPurchaseOrders, setRawPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State — shop filter comes from the global store (sidebar)
  const { selectedShop: filterShop } = useShopStore();
  const [filterTimeframe, setFilterTimeframe] = useState("all"); // "all", "30days", "7days"
  const [searchQuery, setSearchQuery] = useState("");

  // UI Interactive States
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedDashboardIndent, setSelectedDashboardIndent] = useState(null);

  // Fetch all dashboard data from Supabase
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch indents
      const { data: indentsData, error: indentsError } = await supabase
        .from("indents")
        .select("*")
        .order("created_at", { ascending: false });
      if (indentsError) throw indentsError;

      // 2. Fetch indent items
      const { data: itemsData, error: itemsError } = await supabase
        .from("indent_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (itemsError) throw itemsError;

      // 3. Fetch purchase orders
      const { data: posData, error: posError } = await supabase
        .from("purchase_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (posError) throw posError;

      setRawIndents(indentsData || []);
      setRawIndentItems(itemsData || []);
      setRawPurchaseOrders(posData || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper: map a Purchase Order to its corresponding Shop Name via its approved indent_items
  const getShopForPO = useMemo(() => {
    const poShopCache = {};
    return (po) => {
      if (!po.indent_id) return "Unknown";
      if (poShopCache[po.id]) return poShopCache[po.id];

      // Find an indent item that belongs to this PO's indent id
      const matchItem = rawIndentItems.find(
        (item) => item.unique_indent_id === po.indent_id
      );
      if (!matchItem) return "Unknown";

      // Match parent indent to find the shop name
      const parentIndent = rawIndents.find((ind) => ind.id === matchItem.indent_id);
      const shopName = parentIndent ? parentIndent.shop_name : "Unknown";
      poShopCache[po.id] = shopName;
      return shopName;
    };
  }, [rawIndents, rawIndentItems]);

  // Dynamic Date Filter logic
  const checkTimeframe = (dateString) => {
    if (filterTimeframe === "all") return true;
    const itemDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - itemDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (filterTimeframe === "7days" && diffDays <= 7) return true;
    if (filterTimeframe === "30days" && diffDays <= 30) return true;
    return false;
  };

  // Filtered datasets based on selected controls
  const filteredIndents = useMemo(() => {
    return rawIndents.filter((ind) => {
      const matchShop = filterShop === "All" || ind.shop_name === filterShop;
      const matchTime = checkTimeframe(ind.created_at);
      return matchShop && matchTime;
    });
  }, [rawIndents, filterShop, filterTimeframe]);

  // Set default selected indent on mount or filter changes
  useEffect(() => {
    if (filteredIndents.length > 0) {
      // Find currently selected in the filtered list or select first
      const exists = filteredIndents.some(ind => ind.id === selectedDashboardIndent?.id);
      if (!exists) {
        setSelectedDashboardIndent(filteredIndents[0]);
      }
    } else {
      setSelectedDashboardIndent(null);
    }
  }, [filteredIndents, selectedDashboardIndent]);

  const filteredIndentItems = useMemo(() => {
    // Cache indents for quick lookup
    const indentMap = new Map(rawIndents.map((i) => [i.id, i]));
    return rawIndentItems.filter((item) => {
      const parentIndent = indentMap.get(item.indent_id);
      if (!parentIndent) return false;

      const matchShop = filterShop === "All" || parentIndent.shop_name === filterShop;
      const matchTime = checkTimeframe(item.created_at);
      return matchShop && matchTime;
    });
  }, [rawIndentItems, rawIndents, filterShop, filterTimeframe]);

  const filteredPurchaseOrders = useMemo(() => {
    return rawPurchaseOrders.filter((po) => {
      const shop = getShopForPO(po);
      const matchShop = filterShop === "All" || shop === filterShop;
      const matchTime = checkTimeframe(po.created_at);
      return matchShop && matchTime;
    });
  }, [rawPurchaseOrders, filterShop, filterTimeframe, getShopForPO]);

  // Items specifically belonging to the selected indent
  const selectedIndentProducts = useMemo(() => {
    if (!selectedDashboardIndent) return [];
    return rawIndentItems.filter(item => item.indent_id === selectedDashboardIndent.id);
  }, [selectedDashboardIndent, rawIndentItems]);

  // Advanced Stats Calculations
  const stats = useMemo(() => {
    const totalIndents = filteredIndents.length;
    const totalItems = filteredIndentItems.length;

    // Approvals stats
    const approved = filteredIndentItems.filter(
      (i) => i.approval_status === "approved"
    ).length;
    const rejected = filteredIndentItems.filter(
      (i) => i.approval_status === "rejected"
    ).length;
    const pending = totalItems - approved - rejected;

    // PO stats
    const totalPOs = filteredPurchaseOrders.length;
    const totalOrderQty = filteredPurchaseOrders.reduce(
      (sum, po) => sum + (parseFloat(po.total_order_qty) || 0),
      0
    );
    const totalOrderBox = filteredPurchaseOrders.reduce(
      (sum, po) => sum + (parseFloat(po.total_order_box) || 0),
      0
    );

    // Logistics confirmation states
    const vendorConfirmed = filteredPurchaseOrders.filter(
      (po) => po.trader_status === "yes"
    ).length;
    const transporterDispatched = filteredPurchaseOrders.filter(
      (po) => po.trader_status === "yes" && po.transporter_status === "yes"
    ).length;
    const receiverReceived = filteredPurchaseOrders.filter(
      (po) =>
        po.trader_status === "yes" &&
        po.transporter_status === "yes" &&
        po.receiver_status === "yes"
    ).length;

    // Active issues/rejections
    const logisticsIssues = filteredPurchaseOrders.filter(
      (po) =>
        po.trader_status === "no" ||
        po.transporter_status === "no" ||
        po.receiver_status === "no"
    ).length;

    return {
      totalIndents,
      totalItems,
      approved,
      rejected,
      pending,
      totalPOs,
      totalOrderQty,
      totalOrderBox,
      vendorConfirmed,
      transporterDispatched,
      receiverReceived,
      logisticsIssues
    };
  }, [filteredIndents, filteredIndentItems, filteredPurchaseOrders]);

  // Search Results for the PO Hub Table
  const searchedPOs = useMemo(() => {
    if (!searchQuery) return filteredPurchaseOrders;
    const q = searchQuery.toLowerCase();
    return filteredPurchaseOrders.filter(
      (po) =>
        po.po_number.toLowerCase().includes(q) ||
        po.vendor_name.toLowerCase().includes(q) ||
        (po.indent_id && po.indent_id.toLowerCase().includes(q))
    );
  }, [filteredPurchaseOrders, searchQuery]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner-wrapper">
          <RefreshCw className="animate-spin-slow" size={42} />
          <h3>Compiling Operations Control Center...</h3>
          <p>Fetching real-time records from Supabase server</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container dashboard-page">
      {/* ── Top Header and Live Controls ──────────────────────── */}
      <header className="dashboard-header">
        <div className="header-text">
          <div className="live-pill">
            <span className="ping-dot"></span>
            <span>Live System Analytics</span>
          </div>
          <h1>System Overview Control</h1>
          <p className="page-description">
            Aggregate operations and logistics performance metrics
          </p>
        </div>

        <div className="header-actions">

          {/* Timeframe Buttons */}
          <div className="timeframe-tabs">
            <button
              onClick={() => setFilterTimeframe("all")}
              className={`time-tab ${filterTimeframe === "all" ? "active" : ""}`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilterTimeframe("30days")}
              className={`time-tab ${filterTimeframe === "30days" ? "active" : ""}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setFilterTimeframe("7days")}
              className={`time-tab ${filterTimeframe === "7days" ? "active" : ""}`}
            >
              7 Days
            </button>
          </div>

          {/* Manual Refresh Action */}
          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className={`refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            title="Refresh Server Data"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* ── KPI Highlight Cards Grid ────────────────────────── */}
      <section className="metrics-grid">
        {/* Metric: Total Indents */}
        <div className="metric-card glass-card">
          <div className="card-top">
            <div className="icon-wrapper blue">
              <FileSpreadsheet size={24} />
            </div>
            <div className="card-lbl">Indents Processed</div>
          </div>
          <div className="card-mid">
            <div className="metric-val">{stats.totalIndents}</div>
            <div className="metric-sub">
              {stats.totalItems} unique items uploaded
            </div>
          </div>
          <div className="card-bottom">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill blue"
                style={{ width: "100%" }}
              ></div>
            </div>
            <span className="trend-text positive">Active Uploads Stream</span>
          </div>
        </div>

        {/* Metric: Item Approval Rate */}
        <div className="metric-card glass-card">
          <div className="card-top">
            <div className="icon-wrapper emerald">
              <CheckCircle2 size={24} />
            </div>
            <div className="card-lbl">Item Approval Rate</div>
          </div>
          <div className="card-mid">
            <div className="metric-val">
              {stats.totalItems > 0
                ? Math.round((stats.approved / stats.totalItems) * 100)
                : 0}
              <span className="percent-sign">%</span>
            </div>
            <div className="metric-sub">
              {stats.approved} approved / {stats.pending} pending
            </div>
          </div>
          <div className="card-bottom">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill emerald"
                style={{
                  width: `${
                    stats.totalItems > 0
                      ? (stats.approved / stats.totalItems) * 100
                      : 0
                  }%`
                }}
              ></div>
            </div>
            <span className="trend-text positive">
              {stats.rejected} rejections filtered
            </span>
          </div>
        </div>

        {/* Metric: Generated Purchase Orders */}
        <div className="metric-card glass-card">
          <div className="card-top">
            <div className="icon-wrapper indigo">
              <ShoppingBag size={24} />
            </div>
            <div className="card-lbl">Purchase Orders</div>
          </div>
          <div className="card-mid">
            <div className="metric-val">{stats.totalPOs}</div>
            <div className="metric-sub">Generated from Approved Indents</div>
          </div>
          <div className="card-bottom">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill indigo"
                style={{
                  width: `${
                    stats.totalPOs > 0
                      ? (stats.vendorConfirmed / stats.totalPOs) * 100
                      : 0
                  }%`
                }}
              ></div>
            </div>
            <span className="trend-text positive">
              {stats.vendorConfirmed} confirmed by vendors
            </span>
          </div>
        </div>

        {/* Metric: Ordering volume */}
        <div className="metric-card glass-card">
          <div className="card-top">
            <div className="icon-wrapper purple">
              <TrendingUp size={24} />
            </div>
            <div className="card-lbl">Total Ordering Volume</div>
          </div>
          <div className="card-mid font-scaled">
            <div className="metric-val">
              {Math.ceil(stats.totalOrderBox).toLocaleString("en-IN")}
              <span className="volume-label">Boxes</span>
            </div>
            <div className="metric-sub">
              Equivalent to {Math.ceil(stats.totalOrderQty).toLocaleString()}{" "}
              bottles
            </div>
          </div>
          <div className="card-bottom">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill purple"
                style={{ width: "100%" }}
              ></div>
            </div>
            <span className="trend-text purple-text">Dispatched logistics</span>
          </div>
        </div>
      </section>

      {/* ── Supply Chain Pipeline Funnel ──────────────────────── */}
      <section className="pipeline-section glass-card">
        <div className="pipeline-header">
          <h3>Fulfillment & Operations Pipeline</h3>
          <p>Real-time lifecycle tracking of items from indent drafts to final receipts</p>
        </div>

        <div className="pipeline-steps-wrapper">
          {/* Step 1: Draft / Uploaded */}
          <div className="pipeline-step active">
            <div className="step-circle blue">
              <FileSpreadsheet size={18} />
              <span className="step-number">1</span>
            </div>
            <div className="step-content">
              <h4>Indent Drafted</h4>
              <p className="step-value">{stats.totalIndents} Indents</p>
              <p className="step-desc">Awaiting admin review</p>
            </div>
          </div>

          <div className="pipeline-connector filled-blue"></div>

          {/* Step 2: Approved */}
          <div className={`pipeline-step ${stats.approved > 0 ? "active" : ""}`}>
            <div className={`step-circle ${stats.approved > 0 ? "emerald" : ""}`}>
              <CheckCircle2 size={18} />
              <span className="step-number">2</span>
            </div>
            <div className="step-content">
              <h4>Approved</h4>
              <p className="step-value">{stats.approved} Items</p>
              <p className="step-desc">Approved by manager</p>
            </div>
          </div>

          <div
            className={`pipeline-connector ${
              stats.totalPOs > 0 ? "filled-indigo" : ""
            }`}
          ></div>

          {/* Step 3: PO Generated */}
          <div className={`pipeline-step ${stats.totalPOs > 0 ? "active" : ""}`}>
            <div className={`step-circle ${stats.totalPOs > 0 ? "indigo" : ""}`}>
              <ShoppingBag size={18} />
              <span className="step-number">3</span>
            </div>
            <div className="step-content">
              <h4>PO Released</h4>
              <p className="step-value">{stats.totalPOs} Orders</p>
              <p className="step-desc">Submitted to supplier</p>
            </div>
          </div>

          <div
            className={`pipeline-connector ${
              stats.vendorConfirmed > 0 ? "filled-purple" : ""
            }`}
          ></div>

          {/* Step 4: Vendor Confirmed */}
          <div
            className={`pipeline-step ${
              stats.vendorConfirmed > 0 ? "active" : ""
            }`}
          >
            <div
              className={`step-circle ${
                stats.vendorConfirmed > 0 ? "purple" : ""
              }`}
            >
              <Check size={18} />
              <span className="step-number">4</span>
            </div>
            <div className="step-content">
              <h4>Vendor Confirmed</h4>
              <p className="step-value">{stats.vendorConfirmed} POs</p>
              <p className="step-desc">Vendor packed goods</p>
            </div>
          </div>

          <div
            className={`pipeline-connector ${
              stats.transporterDispatched > 0 ? "filled-amber" : ""
            }`}
          ></div>

          {/* Step 5: Transporter Dispatched */}
          <div
            className={`pipeline-step ${
              stats.transporterDispatched > 0 ? "active" : ""
            }`}
          >
            <div
              className={`step-circle ${
                stats.transporterDispatched > 0 ? "amber" : ""
              }`}
            >
              <Truck size={18} />
              <span className="step-number">5</span>
            </div>
            <div className="step-content">
              <h4>In Transit</h4>
              <p className="step-value">{stats.transporterDispatched} Dispatches</p>
              <p className="step-desc">Transporter picked up</p>
            </div>
          </div>

          <div
            className={`pipeline-connector ${
              stats.receiverReceived > 0 ? "filled-success" : ""
            }`}
          ></div>

          {/* Step 6: Received */}
          <div
            className={`pipeline-step ${
              stats.receiverReceived > 0 ? "success" : ""
            }`}
          >
            <div
              className={`step-circle ${
                stats.receiverReceived > 0 ? "success-circle" : ""
              }`}
            >
              <MapPin size={18} />
              <span className="step-number">6</span>
            </div>
            <div className="step-content">
              <h4>Received</h4>
              <p className="step-value">{stats.receiverReceived} Receipts</p>
              <p className="step-desc">Delivered to destination</p>
            </div>
          </div>
        </div>

        {stats.logisticsIssues > 0 && (
          <div className="pipeline-alert">
            <AlertTriangle size={16} />
            <span>
              Attention: {stats.logisticsIssues} Purchase Order(s) have been
              flagged with rejection responses in the logistics stages.
            </span>
          </div>
        )}
      </section>

      {/* ── Indents & Products Master-Detail Explorer ─────────── */}
      <section className="explorer-section">
        <div className="pipeline-header" style={{ marginBottom: "1.25rem" }}>
          <h3>Indent & Product Master-Detail Explorer</h3>
          <p>Select any uploaded indent from the registry to view its complete product and inventory breakdown</p>
        </div>

        <div className="explorer-grid">
          {/* Left Column: Indents Master Registry */}
          <div className="explorer-master-card glass-card">
            <div className="explorer-card-header">
              <Layers size={18} className="card-header-icon" />
              <h4>Indents Registry</h4>
              <span className="badge-count">{filteredIndents.length} Runs</span>
            </div>

            <div className="explorer-list-wrapper">
              {filteredIndents.length === 0 ? (
                <div className="explorer-empty-placeholder">
                  <FileSpreadsheet size={32} />
                  <p>No indents found matching active filters</p>
                </div>
              ) : (
                filteredIndents.map((ind) => {
                  const isSelected = selectedDashboardIndent?.id === ind.id;
                  const itemRunCount = rawIndentItems.filter(item => item.indent_id === ind.id).length;
                  return (
                    <div
                      key={ind.id}
                      onClick={() => setSelectedDashboardIndent(ind)}
                      className={`explorer-master-row ${isSelected ? "selected" : ""}`}
                    >
                      <div className="row-main-info">
                        <Building2 size={16} className="shop-icon" />
                        <div className="row-text">
                          <span className="shop-title">
                            {ind.indent_number ? `${ind.indent_number} - ` : ""}{ind.shop_name} Shop
                          </span>
                          <span className="date-sub">
                            {new Date(ind.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="row-side-info">
                        <span className="badge-pill">{itemRunCount} Items</span>
                        <span className={`status-dot-badge ${ind.status.toLowerCase()}`}>
                          {ind.status}
                        </span>
                        <ChevronRight size={14} className="chevron" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Indent Products Breakdown Detail */}
          <div className="explorer-detail-card glass-card">
            {selectedDashboardIndent ? (
              <>
                <div className="explorer-card-header highlight">
                  <div className="header-details">
                    <span className="pre-title">Selected Indent Breakdown</span>
                    <h4>
                      {selectedDashboardIndent.indent_number ? `${selectedDashboardIndent.indent_number} - ` : ""}{selectedDashboardIndent.shop_name} Shop Products
                    </h4>
                    <span className="timestamp-details">
                      Uploaded: {new Date(selectedDashboardIndent.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <span className="badge-count emerald">
                    {selectedIndentProducts.length} Items Listed
                  </span>
                </div>

                <div className="explorer-table-wrapper">
                  <table className="explorer-table">
                    <thead>
                      <tr>
                        <th>Product / Brand</th>
                        <th>Type</th>
                        <th className="text-right">Avg Sale</th>
                        <th className="text-right">Closing Qty</th>
                        <th className="text-right">Order Box</th>
                        <th className="text-right">Order Qty</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedIndentProducts.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="empty-table-cell">
                            No products are recorded for this indent.
                          </td>
                        </tr>
                      ) : (
                        selectedIndentProducts.map((item, index) => (
                          <tr key={item.id || index} className="product-row">
                            <td className="product-brand-cell">
                              <strong>{item.item_name}</strong>
                              {item.brand_name && item.brand_name !== item.item_name && (
                                <span className="brand-sub">{item.brand_name}</span>
                              )}
                            </td>
                            <td>
                              <span className="liquor-type-tag">
                                {item.liquor_type || "—"}
                              </span>
                            </td>
                            <td className="text-right font-medium">
                              {item.fix_per_day_avg_sale != null ? item.fix_per_day_avg_sale : "—"}
                            </td>
                            <td className="text-right font-medium">
                              {item.closing_qty != null ? item.closing_qty : "—"}
                            </td>
                            <td className="text-right font-bold text-indigo">
                              {item.order_box != null ? parseFloat(item.order_box).toFixed(2) : "—"}
                            </td>
                            <td className="text-right font-bold text-dark">
                              {item.order_qty != null ? Math.ceil(item.order_qty) : "—"}
                            </td>
                            <td>
                              <span
                                className={`status-badge-mini ${
                                  item.approval_status
                                    ? item.approval_status.toLowerCase()
                                    : "pending"
                                }`}
                              >
                                {item.approval_status || "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="explorer-empty-placeholder full-height">
                <FileText size={48} className="placeholder-icon" />
                <h4>No Indent Selected</h4>
                <p>Choose an indent run from the left registry panel to inspect its product details.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Full Width PO Logistics Hub Table ─────────────────── */}
      <section className="po-hub-section glass-card">
        <div className="po-hub-header">
          <div className="po-hub-title-info">
            <h3>Active Purchase Order Logistics Tracker</h3>
            <p>Real-time delivery status, remarks, and inspection logs for generated Purchase Orders</p>
          </div>
          
          <div className="stream-search">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by vendor or PO#..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mini-search-input active-po-search"
            />
          </div>
        </div>

        <div className="stream-table-wrapper">
          <table className="stream-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Destination</th>
                <th>Vendor</th>
                <th className="text-right">Ordered Boxes</th>
                <th className="text-right">Ordered Bottles</th>
                <th style={{ textAlign: "center" }}>Logistics Confirmation Nodes</th>
                <th style={{ textAlign: "center" }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {searchedPOs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-table-cell">
                    No active Purchase Orders found matching the search criteria.
                  </td>
                </tr>
              ) : (
                searchedPOs.map((po) => {
                  const shop = getShopForPO(po);
                  return (
                    <tr key={po.id} className="stream-row">
                      <td className="po-number-cell">
                        <strong>{po.po_number}</strong>
                        <span className="po-vendor-sub">Released Indent: {po.indent_id || "N/A"}</span>
                      </td>
                      <td className="shop-name-cell">
                        <Building2 size={14} className="cell-icon" />
                        <span>{shop} Shop</span>
                      </td>
                      <td className="date-cell font-semibold">{po.vendor_name}</td>
                      <td className="text-right font-bold text-indigo">
                        {parseFloat(po.total_order_box).toFixed(2)}
                      </td>
                      <td className="text-right font-bold text-dark">
                        {Math.ceil(po.total_order_qty).toLocaleString()}
                      </td>
                      <td className="logistics-pipeline-cell" style={{ display: "flex", justifyContent: "center" }}>
                        <div className="micro-logistics-bar" title="Vendor -> Transporter -> Receiver">
                          {/* Vendor Status */}
                          <span
                            className={`node ${
                              po.trader_status === "yes"
                                ? "success"
                                : po.trader_status === "no"
                                ? "danger"
                                : "pending"
                            }`}
                            title={`Vendor: ${
                              po.trader_status === "yes"
                                ? "Confirmed"
                                : po.trader_status === "no"
                                ? "Rejected"
                                : "Pending"
                            }`}
                          >
                            V
                          </span>
                          <span className="micro-line"></span>
                          {/* Transporter Status */}
                          <span
                            className={`node ${
                              po.transporter_status === "yes"
                                ? "success"
                                : po.transporter_status === "no"
                                ? "danger"
                                : "pending"
                            }`}
                            title={`Transporter: ${
                              po.transporter_status === "yes"
                                ? "Confirmed"
                                : po.transporter_status === "no"
                                ? "Rejected"
                                : "Pending"
                            }`}
                          >
                            T
                          </span>
                          <span className="micro-line"></span>
                          {/* Receiver Status */}
                          <span
                            className={`node ${
                              po.receiver_status === "yes"
                                ? "success"
                                : po.receiver_status === "no"
                                ? "danger"
                                : "pending"
                            }`}
                            title={`Receiver: ${
                              po.receiver_status === "yes"
                                ? "Received"
                                : po.receiver_status === "no"
                                ? "Rejected"
                                : "Pending"
                            }`}
                          >
                            R
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => setSelectedPO(po)}
                          className="view-po-details-btn"
                          style={{ margin: "0 auto" }}
                          title="Inspect Logistics details"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Interactive PO Logistics Inspector Modal ───────────── */}
      {selectedPO && (
        <div className="dashboard-modal-backdrop">
          <div className="inspector-modal-card glass-modal-card">
            <div className="modal-header">
              <div>
                <div className="modal-top-tag">PO Logistics Log</div>
                <h2>Inspection for {selectedPO.po_number}</h2>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="close-modal-btn"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-scroll">
              <div className="inspector-summary-strip">
                <div className="strip-item">
                  <span className="lbl">Vendor</span>
                  <span className="val">{selectedPO.vendor_name}</span>
                </div>
                <div className="strip-item">
                  <span className="lbl">Shop Destination</span>
                  <span className="val">{getShopForPO(selectedPO)} Shop</span>
                </div>
                <div className="strip-item">
                  <span className="lbl">Indent Batch</span>
                  <span className="val">{selectedPO.indent_id || "N/A"}</span>
                </div>
                <div className="strip-item">
                  <span className="lbl">Volume Ordered</span>
                  <span className="val">
                    {parseFloat(selectedPO.total_order_box).toFixed(2)} Boxes (
                    {selectedPO.total_order_qty} Bottles)
                  </span>
                </div>
              </div>

              {/* Status Nodes timeline details */}
              <div className="inspector-timeline">
                <h3>Pipeline Verification Checklist</h3>

                {/* Step 1: Vendor */}
                <div
                  className={`timeline-node-row ${
                    selectedPO.trader_status === "yes"
                      ? "completed"
                      : selectedPO.trader_status === "no"
                      ? "rejected"
                      : "pending"
                  }`}
                >
                  <div className="timeline-badge-circle">
                    {selectedPO.trader_status === "yes" ? (
                      <Check size={16} />
                    ) : selectedPO.trader_status === "no" ? (
                      <XCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div className="timeline-text-content">
                    <div className="timeline-node-title">
                      <h4>Vendor Confirmation</h4>
                      <span className="badge">
                        {selectedPO.trader_status === "yes"
                          ? "Confirmed"
                          : selectedPO.trader_status === "no"
                          ? "Rejected"
                          : "Awaiting Confirmation"}
                      </span>
                    </div>
                    {selectedPO.dispatch_date && (
                      <p className="timeline-detail-text">
                        <CalendarDays size={12} className="inline-icon" />
                        Expected Dispatch Date:{" "}
                        <strong>
                          {new Date(selectedPO.dispatch_date).toLocaleDateString(
                            "en-IN",
                            { day: "2-digit", month: "short", year: "numeric" }
                          )}
                        </strong>
                      </p>
                    )}
                    {selectedPO.remarks && (
                      <p className="timeline-remarks-block">
                        Remarks: <em>"{selectedPO.remarks}"</em>
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 2: Transporter */}
                <div
                  className={`timeline-node-row ${
                    selectedPO.transporter_status === "yes"
                      ? "completed"
                      : selectedPO.transporter_status === "no"
                      ? "rejected"
                      : "pending"
                  }`}
                >
                  <div className="timeline-badge-circle">
                    {selectedPO.transporter_status === "yes" ? (
                      <Check size={16} />
                    ) : selectedPO.transporter_status === "no" ? (
                      <XCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div className="timeline-text-content">
                    <div className="timeline-node-title">
                      <h4>Transporter Dispatch Confirmation</h4>
                      <span className="badge">
                        {selectedPO.transporter_status === "yes"
                          ? "Dispatched"
                          : selectedPO.transporter_status === "no"
                          ? "Rejected Pick-up"
                          : "Awaiting Dispatch"}
                      </span>
                    </div>
                    {selectedPO.transporter_number && (
                      <p className="timeline-detail-text">
                        <Truck size={12} className="inline-icon" />
                        Assigned Transporter Phone:{" "}
                        <strong>{selectedPO.transporter_number}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 3: Receiver */}
                <div
                  className={`timeline-node-row ${
                    selectedPO.receiver_status === "yes"
                      ? "completed"
                      : selectedPO.receiver_status === "no"
                      ? "rejected"
                      : "pending"
                  }`}
                >
                  <div className="timeline-badge-circle">
                    {selectedPO.receiver_status === "yes" ? (
                      <Check size={16} />
                    ) : selectedPO.receiver_status === "no" ? (
                      <XCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div className="timeline-text-content">
                    <div className="timeline-node-title">
                      <h4>Shop Delivery Confirmation</h4>
                      <span className="badge">
                        {selectedPO.receiver_status === "yes"
                          ? "Received Successfully"
                          : selectedPO.receiver_status === "no"
                          ? "Rejected Delivery"
                          : "Awaiting Delivery Receipt"}
                      </span>
                    </div>
                    {selectedPO.receiver_number && (
                      <p className="timeline-detail-text">
                        <MapPin size={12} className="inline-icon" />
                        Assigned Receiver Phone:{" "}
                        <strong>{selectedPO.receiver_number}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Downloads */}
              <div className="inspector-docs-links">
                <h3>Logistics Documents</h3>
                <div className="docs-buttons">
                  {selectedPO.trader_pdf_url ? (
                    <a
                      href={selectedPO.trader_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-doc-btn"
                    >
                      <FileText size={16} />
                      <span>View Supplier PDF Copy</span>
                    </a>
                  ) : (
                    <span className="doc-btn-disabled">No Supplier PDF available</span>
                  )}

                  {selectedPO.receiver_pdf_url ? (
                    <a
                      href={selectedPO.receiver_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-doc-btn"
                    >
                      <FileText size={16} />
                      <span>View Receiver PDF Copy</span>
                    </a>
                  ) : (
                    <span className="doc-btn-disabled">No Receiver PDF available</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
