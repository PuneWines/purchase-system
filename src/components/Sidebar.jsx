import React from "react";
import { NavLink } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useAppStore from "../store/useAppStore";
import useShopStore from "../store/useShopStore";
import {
  LayoutDashboard,
  List,
  FileText,
  CheckSquare,
  Package,
  UserCheck,
  Truck,
  Inbox,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Store,
  History,
  GitFork,
} from "lucide-react";
import "../styles/Sidebar.css";

/* Navigation groups — gives a professional "sectioned" feel */
const menuGroups = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/dashboard" },
    ],
  },
  {
    label: "Procurement",
    items: [
      { key: "indent", label: "Indent", icon: <FileText size={18} />, path: "/indent" },
      { key: "approval", label: "Approval", icon: <CheckSquare size={18} />, path: "/approval" },
      { key: "po", label: "PO", icon: <Package size={18} />, path: "/po" },
      { key: "po_history", label: "PO History", icon: <History size={18} />, path: "/po-history" },
      { key: "orders_pipeline", label: "Orders Pipeline", icon: <GitFork size={18} />, path: "/orders-pipeline" },
    ],
  },
  {
    label: "Verification",
    items: [
      { key: "trader_verification", label: "Trader", icon: <UserCheck size={18} />, path: "/trader_verification" },
      { key: "transporter_verification", label: "Transporter", icon: <Truck size={18} />, path: "/transporter_verification" },
      { key: "receiving", label: "Receiving", icon: <Inbox size={18} />, path: "/receiving" },
    ],
  },
  {
    label: "Admin",
    items: [
      { key: "setting", label: "Settings", icon: <Settings size={18} />, path: "/setting" },
    ],
  },
];

const Sidebar = () => {
  const { currentUser, logout, hasPermission } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { selectedShop, setSelectedShop, shops } = useShopStore();
  const [hoveredItem, setHoveredItem] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({ top: 0, left: 0 });

  const handleMouseEnter = (e, label) => {
    if (!sidebarCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
    setHoveredItem(label);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const shopColorClass = (shop) => {
    if (!shop) return "pill-all";
    const upper = shop.toUpperCase();
    if (upper === "ALL") return "pill-all";
    if (upper === "FRIENDS") return "pill-friends";
    if (upper.includes("VISHAL")) return "pill-vishal";
    if (upper === "MADHURA") return "pill-madhura";
    if (upper === "KUNAL") return "pill-kunal";
    if (upper === "BALAJI") return "pill-balaji";
    return "pill-all";
  };

  const shopDotClass = (shop) => {
    if (!shop) return "shop-dot-all";
    const upper = shop.toUpperCase();
    if (upper === "ALL") return "shop-dot-all";
    if (upper === "FRIENDS") return "shop-dot-friends";
    if (upper.includes("VISHAL")) return "shop-dot-vishal";
    if (upper === "MADHURA") return "shop-dot-madhura";
    if (upper === "KUNAL") return "shop-dot-kunal";
    if (upper === "BALAJI") return "shop-dot-balaji";
    return "shop-dot-all";
  };

  return (
    <div className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>

      {/* ── Brand Header ─────────────────────────────────── */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon">
            <Zap size={16} color="#fff" />
          </div>
          <span className={`sidebar-title ${sidebarCollapsed ? "hidden" : ""}`}>
            DrinqKart
          </span>
        </div>

        <button
          className="collapse-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── User Block ───────────────────────────────────── */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {currentUser?.username?.charAt(0).toUpperCase()}
        </div>

        {!sidebarCollapsed && (
          <>
            <div className="user-info">
              <div className="user-name">{currentUser?.username}</div>
              <div className="user-role">{currentUser?.role}</div>
            </div>
            <div className="user-status-dot" title="Online" />
          </>
        )}
      </div>

      {/* ── Global Shop Filter ────────────────────────────── */}
      {sidebarCollapsed ? (
        <div className="shop-filter-collapsed" title={`Shop: ${selectedShop}`}>
          <div className={`shop-dot ${shopDotClass(selectedShop)}`} />
        </div>
      ) : (
        <div className="shop-filter-section">
          <div className="shop-filter-label">
            <Store size={10} />
            Shop Filter
          </div>
          <div className="shop-pills-grid">
            {["All", ...shops].map((shop) => (
              <button
                key={shop}
                className={`shop-pill ${shopColorClass(shop)} ${selectedShop === shop ? "active" : ""}`}
                onClick={() => setSelectedShop(shop)}
                title={shop === "All" ? "Show All Shops" : `${shop} Shop`}
              >
                {shop === "All" ? "All Shops" : shop}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="sidebar-menu">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter((item) => hasPermission(item.key));
          if (visibleItems.length === 0) return null;

          return (
            <React.Fragment key={group.label}>
              <div className="menu-section-label">{group.label}</div>
              {visibleItems.map((item) => (
                <NavLink
                  to={item.path}
                  key={item.key}
                  className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
                  onMouseEnter={(e) => handleMouseEnter(e, item.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="menu-icon">{item.icon}</span>
                  {!sidebarCollapsed && <span className="menu-label">{item.label}</span>}
                </NavLink>
              ))}
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Footer / Logout ──────────────────────────────── */}
      <div className="sidebar-footer">
        <button
          className="logout-btn"
          onClick={logout}
          onMouseEnter={(e) => handleMouseEnter(e, "Logout")}
          onMouseLeave={handleMouseLeave}
        >
          <span className="menu-icon"><LogOut size={18} /></span>
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Custom Fixed Tooltip for Collapsed State */}
      {sidebarCollapsed && hoveredItem && (
        <div style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: 'translateY(-50%)',
          backgroundColor: '#1e293b',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'tooltipFadeIn 0.15s ease-out forwards',
          opacity: 0
        }}>
          <style>
            {`
              @keyframes tooltipFadeIn {
                from { opacity: 0; transform: translate(-5px, -50%); }
                to { opacity: 1; transform: translate(0, -50%); }
              }
            `}
          </style>
          {hoveredItem}
        </div>
      )}

    </div>
  );
};

export default Sidebar;
