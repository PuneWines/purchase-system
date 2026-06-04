import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  History,
  Search,
  RefreshCw,
  FileDown,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Lock,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { fetchAllPurchaseOrders } from "../services/poHistoryService";
import "../styles/POHistory.css";

const ROWS_PER_PAGE = 20;

/* ── Helpers ─────────────────────────────────────────────────── */
const formatDate = (isoString) => {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ── Skeleton Loader ─────────────────────────────────────────── */
const SkeletonRows = ({ count = 8 }) =>
  Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="poh-skeleton-row">
      {Array.from({ length: 7 }).map((__, j) => (
        <td key={j}>
          <div
            className="poh-skeleton-cell"
            style={{ width: j === 1 ? "80%" : j === 5 ? "60%" : "70%" }}
          />
        </td>
      ))}
    </tr>
  ));

/* ── Main Component ──────────────────────────────────────────── */
const POHistory = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [vendorFilter, setVendorFilter] = useState("All");

  // Sort
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Data fetch ───────────────────────────────────────────── */
  const loadOrders = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await fetchAllPurchaseOrders();
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching PO history:", err);
      setError("Failed to load purchase order history. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /* ── Unique vendor list for filter dropdown ───────────────── */
  const vendorOptions = useMemo(() => {
    const names = [...new Set(orders.map((o) => o.vendor_name).filter(Boolean))].sort();
    return ["All", ...names];
  }, [orders]);

  /* ── Filtered + sorted list ───────────────────────────────── */
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    // Vendor filter
    if (vendorFilter !== "All") {
      list = list.filter((o) => o.vendor_name === vendorFilter);
    }

    // Search filter (PO number, vendor, brand, indent id)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.po_number || "").toLowerCase().includes(q) ||
          (o.vendor_name || "").toLowerCase().includes(q) ||
          (o.first_brand_name || "").toLowerCase().includes(q) ||
          (o.indent_id || "").toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];

      if (sortField === "created_at") {
        va = new Date(va || 0).getTime();
        vb = new Date(vb || 0).getTime();
      } else if (sortField === "total_order_qty" || sortField === "total_order_box") {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else {
        va = (va || "").toString().toLowerCase();
        vb = (vb || "").toString().toLowerCase();
      }

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [orders, vendorFilter, searchQuery, sortField, sortDir]);

  /* ── Pagination ───────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ROWS_PER_PAGE));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, vendorFilter, sortField, sortDir]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredOrders.slice(start, start + ROWS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  /* ── Stats ────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalQty = orders.reduce((s, o) => s + (Number(o.total_order_qty) || 0), 0);
    const totalBox = orders.reduce((s, o) => s + (Number(o.total_order_box) || 0), 0);
    const vendors = new Set(orders.map((o) => o.vendor_name).filter(Boolean)).size;
    return { totalPos: orders.length, totalQty, totalBox, vendors };
  }, [orders]);

  /* ── Sort handler ─────────────────────────────────────────── */
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-indicator">↕</span>;
    return (
      <span className="sort-indicator">
        {sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </span>
    );
  };

  /* ── Pagination controls ──────────────────────────────────── */
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3)
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [totalPages, currentPage]);

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="poh-page">

      {/* Top Bar */}
      <div className="poh-topbar">
        <div className="poh-topbar-left">
          <h1>
            <History size={20} style={{ verticalAlign: "middle", marginRight: 8 }} />
            PO History
          </h1>
          <p>Complete read-only record of all issued Purchase Orders</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="poh-readonly-badge">
            <Lock size={11} /> View Only
          </span>
          <button
            className={`poh-refresh-btn ${isRefreshing ? "spinning" : ""}`}
            onClick={() => loadOrders(true)}
            disabled={isRefreshing || isLoading}
            title="Refresh data"
          >
            <RefreshCw size={15} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "12px 16px",
            borderRadius: 4,
            marginBottom: 20,
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Stats Row */}
      {!isLoading && !error && (
        <div className="poh-stats-row">
          <div className="poh-stat-card">
            <div className="poh-stat-label">Total POs</div>
            <div className="poh-stat-value">{stats.totalPos}</div>
            <div className="poh-stat-sub">Purchase orders issued</div>
          </div>
          <div className="poh-stat-card">
            <div className="poh-stat-label">Vendors</div>
            <div className="poh-stat-value">{stats.vendors}</div>
            <div className="poh-stat-sub">Unique vendors</div>
          </div>
          <div className="poh-stat-card">
            <div className="poh-stat-label">Total Qty</div>
            <div className="poh-stat-value">{stats.totalQty.toLocaleString()}</div>
            <div className="poh-stat-sub">Units ordered</div>
          </div>
          <div className="poh-stat-card">
            <div className="poh-stat-label">Total Boxes</div>
            <div className="poh-stat-value">{stats.totalBox.toLocaleString()}</div>
            <div className="poh-stat-sub">Boxes ordered</div>
          </div>
        </div>
      )}

      {/* Controls */}
      {!isLoading && !error && (
        <div className="poh-controls">
          <div className="poh-search-wrap">
            <Search size={14} className="poh-search-icon" />
            <input
              type="text"
              placeholder="Search by PO number, vendor, brand…"
              className="poh-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="poh-filter-select"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          >
            {vendorOptions.map((v) => (
              <option key={v} value={v}>
                {v === "All" ? "All Vendors" : v}
              </option>
            ))}
          </select>

          <span className="poh-results-count">
            {filteredOrders.length} result{filteredOrders.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="poh-table-container">
          <div className="poh-table-scroll">
            <table className="poh-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>PO Number</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Qty / Box</th>
                  <th>Brand</th>
                  <th>PDF Links</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonRows count={8} />
              </tbody>
            </table>
          </div>
        </div>
      ) : error ? null : filteredOrders.length === 0 ? (
        <div className="poh-empty">
          <Package size={48} style={{ opacity: 0.35 }} />
          <h2>{orders.length === 0 ? "No Purchase Orders Yet" : "No Matching Orders"}</h2>
          <p>
            {orders.length === 0
              ? "Purchase orders will appear here once they have been generated."
              : "Try adjusting your search or filter criteria."}
          </p>
        </div>
      ) : (
        <div className="poh-table-container">
          <div className="poh-table-scroll">
            <table className="poh-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th onClick={() => handleSort("po_number")} className={sortField === "po_number" ? "active-sort" : ""}>
                    PO Number <SortIcon field="po_number" />
                  </th>
                  <th onClick={() => handleSort("vendor_name")} className={sortField === "vendor_name" ? "active-sort" : ""}>
                    Vendor <SortIcon field="vendor_name" />
                  </th>
                  <th onClick={() => handleSort("created_at")} className={sortField === "created_at" ? "active-sort" : ""}>
                    Date <SortIcon field="created_at" />
                  </th>
                  <th onClick={() => handleSort("total_order_qty")} className={sortField === "total_order_qty" ? "active-sort" : ""}>
                    Qty / Box <SortIcon field="total_order_qty" />
                  </th>
                  <th>Brand</th>
                  <th>PDF Links</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order, idx) => {
                  const rowNum = (currentPage - 1) * ROWS_PER_PAGE + idx + 1;
                  const hasQty = Number(order.total_order_qty) > 0;
                  const hasBox = Number(order.total_order_box) > 0;

                  return (
                    <tr key={order.id}>
                      <td style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>
                        {rowNum}
                      </td>
                      <td>
                        <span className="poh-po-number">{order.po_number || "—"}</span>
                      </td>
                      <td>
                        <span className="poh-vendor-name">{order.vendor_name || "—"}</span>
                        {order.vendor_id && (
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                            {order.vendor_id}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="poh-date">{formatDate(order.created_at)}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                          {formatDateTime(order.created_at).split(",").slice(1).join(",")}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {hasQty && (
                            <span className="poh-qty-badge">
                              <ShoppingBag size={10} />
                              {Number(order.total_order_qty).toLocaleString()} units
                            </span>
                          )}
                          {hasBox && (
                            <span className="poh-qty-badge box">
                              <Package size={10} />
                              {Number(order.total_order_box).toLocaleString()} boxes
                            </span>
                          )}
                          {!hasQty && !hasBox && <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>—</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.825rem" }}>
                        {order.first_brand_name || "—"}
                      </td>
                      <td>
                        <div className="poh-pdf-actions">
                          {order.trader_pdf_url ? (
                            <a
                              href={order.trader_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="poh-pdf-btn trader"
                              title="View Trader PDF"
                            >
                              <Eye size={11} /> Trader
                            </a>
                          ) : null}
                          {(order.transporter_pdf_url || order.trader_pdf_url) ? (
                            <a
                              href={order.transporter_pdf_url || order.trader_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="poh-pdf-btn transporter"
                              title="View Transporter PDF"
                            >
                              <Truck size={11} /> Transporter
                            </a>
                          ) : null}
                          {order.receiver_pdf_url ? (
                            <a
                              href={order.receiver_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="poh-pdf-btn receiver"
                              title="View Receiver PDF"
                            >
                              <FileDown size={11} /> Receiver
                            </a>
                          ) : null}
                          {!order.trader_pdf_url && !order.transporter_pdf_url && !order.receiver_pdf_url && (
                            <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="poh-pagination">
              <span className="poh-pagination-info">
                Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(currentPage * ROWS_PER_PAGE, filteredOrders.length)} of{" "}
                {filteredOrders.length}
              </span>
              <div className="poh-pagination-btns">
                <button
                  className="poh-page-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  title="First page"
                >
                  <ChevronsLeft size={13} />
                </button>
                <button
                  className="poh-page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={13} />
                </button>

                {pageNumbers.map((n, i) =>
                  n === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      style={{
                        padding: "5px 4px",
                        fontSize: "0.8125rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      className={`poh-page-btn ${currentPage === n ? "active" : ""}`}
                      onClick={() => setCurrentPage(n)}
                    >
                      {n}
                    </button>
                  )
                )}

                <button
                  className="poh-page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  title="Next page"
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  className="poh-page-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last page"
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default POHistory;
