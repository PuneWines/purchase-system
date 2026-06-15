import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { fetchPipelineOrders, fetchPipelineStats } from "../services/ordersPipelineService";
import useShopStore from "../store/useShopStore";
import Toast, { useToast } from "../components/Toast";
import {
  Search,
  RefreshCw,
  GitFork,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Truck,
  Inbox,
  Package,
  Layers,
  X,
  TrendingDown,
  TrendingUp,
  Check,
  Eye,
} from "lucide-react";

const OrdersPipeline = () => {
  const { selectedShop } = useShopStore();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date-desc");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [expandedOrders, setExpandedOrders] = useState({});
  const [selectedPO, setSelectedPO] = useState(null); // For detail inspector drawer

  const { toasts, addToast, removeToast } = useToast();

  const LIMIT = 15;

  // Debounce Search input to prevent lag while typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 1. Fetch lightweight stats data for KPIs
  const { 
    data: statsData = [], 
    isLoading: isLoadingStats, 
    isRefetching: isRefetchingStats, 
    refetch: refetchStats,
    error: statsError,
  } = useQuery({
    queryKey: ["pipelineStats", selectedShop, startDate, endDate],
    queryFn: () => fetchPipelineStats({ shop: selectedShop, startDate, endDate }),
    staleTime: 60000,
  });

  // 2. Fetch paginated POs with infinite query
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isRefetching: isRefetchingOrders,
    refetch: refetchOrders,
    error: ordersError,
  } = useInfiniteQuery({
    queryKey: ["pipelineOrders", selectedShop, statusFilter, debouncedSearch, sortBy, startDate, endDate],
    queryFn: ({ pageParam = 0 }) => fetchPipelineOrders({
      limit: LIMIT,
      offset: pageParam,
      shop: selectedShop,
      status: statusFilter,
      search: debouncedSearch,
      sortBy: sortBy,
      startDate,
      endDate,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    staleTime: 60000,
  });

  // Extract flat list of orders
  const orders = useMemo(() => {
    return ordersData?.pages.flatMap((page) => page) || [];
  }, [ordersData]);

  // Derived loading and refresh states
  const isLoading = isLoadingStats || isLoadingOrders;
  const isRefreshing = isRefetchingStats || isRefetchingOrders;

  // Error notifications
  useEffect(() => {
    if (statsError) {
      console.error("Error loading stats:", statsError);
      addToast("Failed to retrieve operational stats.", "error");
    }
  }, [statsError]);

  useEffect(() => {
    if (ordersError) {
      console.error("Error loading orders:", ordersError);
      addToast("Failed to retrieve orders pipeline data.", "error");
    }
  }, [ordersError]);

  // Manual refresh handler
  const handleRefresh = () => {
    refetchStats();
    refetchOrders();
  };

  // On Scroll Listener for Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 150
      ) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleExpand = (id) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper: Format Date
  const formatDate = (isoString) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper: Format Date & Time
  const formatDateTime = (isoString) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // 1. Resolve Overall PO Status
  const getPOStatusText = (po) => {
    if (po.receiver_status === "yes") return "Completed";
    if (po.receiver_status === "no") return "Delivery Rejected";
    if (po.transporter_status === "yes") return "In Transit";
    if (po.transporter_status === "no") return "Pickup Rejected";
    if (po.trader_status === "yes") {
      let traderDecisions = po.trader_item_statuses || {};
      if (typeof traderDecisions === "string") {
        try { traderDecisions = JSON.parse(traderDecisions); } catch (e) { traderDecisions = {}; }
      }
      const values = Object.values(traderDecisions);
      if (values.includes("rejected")) {
        return "Partially Accepted";
      }
      return "Vendor Confirmed";
    }
    if (po.trader_status === "no") return "Vendor Rejected";
    return "Awaiting Supplier";
  };

  const getPOStatusColorClass = (statusText) => {
    switch (statusText) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Transit":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Vendor Confirmed":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Partially Accepted":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Delivery Rejected":
      case "Pickup Rejected":
      case "Vendor Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  // 2. Resolve Stakeholder Status details
  const getTraderStatusDetails = (po) => {
    if (po.trader_status === "yes") {
      let traderDecisions = po.trader_item_statuses || {};
      if (typeof traderDecisions === "string") {
        try { traderDecisions = JSON.parse(traderDecisions); } catch (e) { traderDecisions = {}; }
      }
      const values = Object.values(traderDecisions);
      if (values.includes("rejected")) {
        return { status: "Partially Accepted", color: "border-purple-500 bg-purple-50 text-purple-500", icon: <AlertCircle size={14} /> };
      }
      return { status: "Accepted", color: "border-emerald-500 bg-emerald-50 text-emerald-500", icon: <CheckCircle2 size={14} /> };
    }
    if (po.trader_status === "no") {
      return { status: "Rejected", color: "border-red-500 bg-red-50 text-red-500", icon: <XCircle size={14} /> };
    }
    return { status: "Pending", color: "border-amber-500 bg-amber-50 text-amber-500 animate-pulse", icon: <Clock size={14} /> };
  };

  const getTransporterStatusDetails = (po) => {
    if (po.trader_status === "no") {
      return { status: "N/A", color: "border-slate-200 bg-slate-50 text-slate-400", icon: <AlertCircle size={14} /> };
    }
    if (po.transporter_status === "yes") {
      return { status: "Accepted", color: "border-emerald-500 bg-emerald-50 text-emerald-500", icon: <CheckCircle2 size={14} /> };
    }
    if (po.transporter_status === "no") {
      return { status: "Rejected", color: "border-red-500 bg-red-50 text-red-500", icon: <XCircle size={14} /> };
    }
    return { status: "Pending", color: "border-amber-500 bg-amber-50 text-amber-500 animate-pulse", icon: <Clock size={14} /> };
  };

  const getReceiverStatusDetails = (po) => {
    if (po.trader_status === "no" || po.transporter_status === "no") {
      return { status: "N/A", color: "border-slate-200 bg-slate-50 text-slate-400", icon: <AlertCircle size={14} /> };
    }
    if (po.receiver_status === "yes") {
      return { status: "Accepted", color: "border-emerald-500 bg-emerald-50 text-emerald-500", icon: <CheckCircle2 size={14} /> };
    }
    if (po.receiver_status === "no") {
      return { status: "Rejected", color: "border-red-500 bg-red-50 text-red-500", icon: <XCircle size={14} /> };
    }
    return { status: "Pending", color: "border-amber-500 bg-amber-50 text-amber-500 animate-pulse", icon: <Clock size={14} /> };
  };

  // Helper: Get structured list of items with decisions from trader, transporter, receiver
  const getPOItemsData = (po) => {
    let rawItems = po.po_items || [];
    let traderDecisions = po.trader_item_statuses || {};
    if (typeof traderDecisions === "string") {
      try { traderDecisions = JSON.parse(traderDecisions); } catch (e) { traderDecisions = {}; }
    }

    let transporterDelivered = po.delivered_items || {};
    if (typeof transporterDelivered === "string") {
      try { transporterDelivered = JSON.parse(transporterDelivered); } catch (e) { transporterDelivered = {}; }
    }

    let receiverReceived = po.received_items || {};
    if (typeof receiverReceived === "string") {
      try { receiverReceived = JSON.parse(receiverReceived); } catch (e) { receiverReceived = {}; }
    }

    return rawItems.map((item) => {
      const orderBox = item.orderBox !== undefined ? parseFloat(item.orderBox) : parseFloat(item.order_box || 0);
      const orderQty = item.orderQty !== undefined ? parseFloat(item.orderQty) : parseFloat(item.order_qty || 0);
      const qtyType = item.qtyType || (orderBox >= 0.90 ? "Box" : "Bottles");
      const displayQty = item.displayQty || (qtyType === "Box" ? Math.round(orderBox) : Math.ceil(orderQty));

      const traderDecision = traderDecisions[item.id] || (po.trader_status === "yes" ? "approved" : po.trader_status === "no" ? "rejected" : "pending");
      
      let transporterDeliveredQty = transporterDelivered[item.id]?.deliveredQty;
      if (transporterDeliveredQty === undefined && po.transporter_status === "yes") {
        transporterDeliveredQty = displayQty;
      }

      let receiverReceivedQty = receiverReceived[item.id]?.receivedQty;
      if (receiverReceivedQty === undefined && po.receiver_status === "yes") {
        receiverReceivedQty = transporterDeliveredQty ?? displayQty;
      }

      return {
        id: item.id,
        itemName: item.itemName || item.item_name,
        brandName: item.brandName || item.brand_name,
        orderQty: displayQty,
        qtyType,
        traderDecision: traderDecision === "approved" ? "Accepted" : traderDecision === "rejected" ? "Rejected" : "Pending",
        transporterQty: traderDecision === "rejected" ? 0 : (transporterDeliveredQty !== undefined ? transporterDeliveredQty : null),
        transporterStatus: po.transporter_status || "pending",
        receiverQty: traderDecision === "rejected" ? 0 : (receiverReceivedQty !== undefined ? receiverReceivedQty : null),
        receiverStatus: po.receiver_status || "pending",
      };
    });
  };

  // Compute stats on client from lightweight statsData
  const stats = useMemo(() => {
    const total = statsData.length;
    const completed = statsData.filter((o) => o.receiver_status === "yes").length;
    const inTransit = statsData.filter((o) => o.transporter_status === "yes" && !o.receiver_status).length;
    const pendingSupplier = statsData.filter((o) => !o.trader_status).length;
    const issues = statsData.filter((o) => {
      if (o.trader_status === "no" || o.transporter_status === "no" || o.receiver_status === "no") return true;
      if (o.trader_status === "yes") {
        let traderDec = o.trader_item_statuses || {};
        if (typeof traderDec === "string") {
          try { traderDec = JSON.parse(traderDec); } catch (e) { traderDec = {}; }
        }
        return Object.values(traderDec).includes("rejected");
      }
      return false;
    }).length;

    return { total, completed, inTransit, pendingSupplier, issues };
  }, [statsData]);

  // Define status pills for the quick filter layout
  const statusPills = [
    { 
      value: "All", 
      label: "All", 
      activeClass: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
      inactiveClass: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-indigo-600"
    },
    { 
      value: "Pending", 
      label: "Pending", 
      activeClass: "bg-amber-600 text-white border-amber-600 shadow-sm",
      inactiveClass: "bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-600"
    },
    { 
      value: "Transit", 
      label: "Transit", 
      activeClass: "bg-blue-600 text-white border-blue-600 shadow-sm",
      inactiveClass: "bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600"
    },
    { 
      value: "Completed", 
      label: "Completed", 
      activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
      inactiveClass: "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600"
    },
    { 
      value: "Issues", 
      label: "Issues", 
      activeClass: "bg-red-600 text-white border-red-600 shadow-sm",
      inactiveClass: "bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600"
    },
  ];

  return (
    <div className="animate-fade-in min-h-screen bg-slate-50/50 pb-12">
      {/* ── Page Header ───────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <GitFork className="text-indigo-600" size={28} />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-extrabold">Orders Pipeline</span>
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-1">
              End-to-end operational visibility into Purchase Order lifecycles and stakeholder actions.
            </p>
          </div>

          <button
            className={`flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-semibold text-slate-600 hover:text-indigo-600 shadow-sm hover:shadow transition-all ${
              isRefreshing ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ── KPI Stats Grid ────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total POs</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Filtered in active shop view</span>
          </div>
          <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Awaiting Supplier</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.pendingSupplier}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Pending trader confirmation</span>
          </div>
          <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-500 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">In Transit</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">{stats.inTransit}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Picked up by transporter</span>
          </div>
          <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.completed}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Confirmed at destinations</span>
          </div>
          <div className="bg-white border border-slate-200 border-l-4 border-l-red-500 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Discrepancy / Rejected</span>
            <div className="text-2xl font-black text-red-600 mt-1">{stats.issues}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">PO modifications / issues</span>
          </div>
        </section>

        {/* ── Filter / Control Bar ────────────────────────── */}
        <section className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row flex-1 gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PO#, Vendor, Shop, Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium bg-slate-50/50"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-auto shrink-0"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="po-asc">PO Number (A-Z)</option>
              <option value="po-desc">PO Number (Z-A)</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 text-xs text-slate-600 font-semibold w-full sm:w-auto">
              <span className="text-[10px] text-slate-400 uppercase font-bold pl-1">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-0 focus:outline-none text-slate-800 font-bold cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 uppercase font-bold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-0 focus:outline-none text-slate-800 font-bold cursor-pointer"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded cursor-pointer transition-all"
                  title="Clear dates"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap gap-2 items-center">
            {statusPills.map((pill) => {
              const isActive = statusFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  onClick={() => setStatusFilter(pill.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 cursor-pointer ${
                    isActive ? pill.activeClass : pill.inactiveClass
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Main List Container ─────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm font-medium">Fetching orders pipeline details...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center shadow-sm">
            <Package size={48} className="text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No Orders Pipeline Entries</h3>
            <p className="text-slate-500 text-sm max-w-sm mt-1">
              There are no purchase orders matching your search filters or Global Shop selector.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((po) => {
              const isExpanded = !!expandedOrders[po.id];
              const overallStatus = getPOStatusText(po);
              const statusColorClass = getPOStatusColorClass(overallStatus);

              const traderStage = getTraderStatusDetails(po);
              const transporterStage = getTransporterStatusDetails(po);
              const receiverStage = getReceiverStatusDetails(po);

              const items = getPOItemsData(po);

              return (
                <div
                  key={po.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  {/* Card Main Row */}
                  <div
                    onClick={() => toggleExpand(po.id)}
                    className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between cursor-pointer select-none gap-4 hover:bg-slate-50/40"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <Package size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-slate-900">{po.po_number}</span>
                        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">
                          {formatDate(po.created_at)}
                        </span>
                      </div>

                      <span className="bg-indigo-50/70 border border-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        {po.shop_name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Trader</span>
                        <span className="text-slate-800 font-bold">{po.vendor_name || "—"}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Transporter</span>
                        <span className="text-slate-800 font-bold">{po.transporter_name}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Receiver</span>
                        <span className="text-slate-800 font-bold">{po.receiver_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${statusColorClass}`}>
                        {overallStatus}
                      </span>

                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Card Expanded Content - Managed conditionally in React for stability */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-4 border-t border-slate-100 bg-slate-50/40 space-y-6">
                      {/* Action Bar */}
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          Pipeline Flow Checklist
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPO(po);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                          <Eye size={12} /> Inspect PO Details
                        </button>
                      </div>

                      {/* ── Visual Pipeline Timeline ── */}
                      <div className="flex items-center justify-between relative p-6 bg-slate-50 border border-slate-200 rounded-xl my-4 overflow-x-auto gap-4">
                        <div className="absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-slate-200 z-0">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-500"
                            style={{
                              width:
                                po.receiver_status === "yes"
                                  ? "100%"
                                  : po.transporter_status === "yes"
                                  ? "50%"
                                  : po.trader_status === "yes"
                                  ? "25%"
                                  : "0%",
                            }}
                          ></div>
                        </div>

                        {/* Trader Stage */}
                        <div className="flex flex-col items-center flex-1 text-center relative min-w-[140px] z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 mb-2 shadow-sm bg-white ${traderStage.color}`}>
                            {traderStage.icon}
                          </div>
                          <span className="text-xs font-bold text-slate-800 block">Trader Review</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            {traderStage.status}
                          </span>
                          {po.trader_status && (
                            <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                              {formatDateTime(po.dispatch_date || po.created_at)}
                            </span>
                          )}
                          <span className="text-[10px] text-indigo-600 font-bold block mt-1">
                            {po.vendor_name}
                          </span>
                        </div>

                        {/* Transporter Stage */}
                        <div className="flex flex-col items-center flex-1 text-center relative min-w-[140px] z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 mb-2 shadow-sm bg-white ${transporterStage.color}`}>
                            {transporterStage.icon}
                          </div>
                          <span className="text-xs font-bold text-slate-800 block">Transporter Review</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            {transporterStage.status}
                          </span>
                          {po.transporter_status && (
                            <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                              {formatDateTime(po.pickup_date)}
                            </span>
                          )}
                          <span className="text-[10px] text-indigo-600 font-bold block mt-1">
                            {po.transporter_name}
                          </span>
                        </div>

                        {/* Receiver Stage */}
                        <div className="flex flex-col items-center flex-1 text-center relative min-w-[140px] z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 mb-2 shadow-sm bg-white ${receiverStage.color}`}>
                            {receiverStage.icon}
                          </div>
                          <span className="text-xs font-bold text-slate-800 block">Receiver Confirmation</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            {receiverStage.status}
                          </span>
                          {po.receiver_status === "yes" && po.received_items && (
                            <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                              Verified
                            </span>
                          )}
                          <span className="text-[10px] text-indigo-600 font-bold block mt-1">
                            {po.receiver_name}
                          </span>
                        </div>
                      </div>

                      {/* Stakeholder Remarks / Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-3.5 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Trader Comments</span>
                          <p className="text-xs text-slate-700 mt-1 italic">
                            {po.remarks ? `"${po.remarks}"` : "No comments left."}
                          </p>
                        </div>
                        <div className="bg-white p-3.5 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Transporter Comments</span>
                          <p className="text-xs text-slate-700 mt-1 italic">
                            {po.transporter_remarks ? `"${po.transporter_remarks}"` : "No comments left."}
                          </p>
                        </div>
                        <div className="bg-white p-3.5 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Receiver Comments</span>
                          <p className="text-xs text-slate-700 mt-1 italic">
                            {po.receiver_remarks ? `"${po.receiver_remarks}"` : "No comments left."}
                          </p>
                        </div>
                      </div>

                      {/* Item-Level Decision Tracking Table */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={14} className="text-slate-400" /> Item-Level Decision Matrix
                        </h5>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs text-slate-800">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                                  <th className="p-3 w-12 text-center">S.No</th>
                                  <th className="p-3">Item Details</th>
                                  <th className="p-3 text-center w-24">Ordered Qty</th>
                                  <th className="p-3 text-center w-36">Trader Decision</th>
                                  <th className="p-3 text-center w-36">Transporter Response</th>
                                  <th className="p-3 text-center w-36">Receiver Response</th>
                                  <th className="p-3 text-center w-32">Ledger Mismatch</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => {
                                  const isApprovedByTrader = item.traderDecision === "Accepted";
                                  
                                  const refQty = item.transporterQty ?? item.orderQty;
                                  const finalQty = item.receiverQty ?? item.orderQty;
                                  const mismatchDiff = isApprovedByTrader && item.receiverQty !== null ? finalQty - refQty : null;

                                  return (
                                    <tr
                                      key={item.id}
                                      className={`border-b transition-colors ${
                                        !isApprovedByTrader
                                          ? "bg-red-50/20 border-red-100 hover:bg-red-50/30"
                                          : mismatchDiff !== null && mismatchDiff !== 0
                                          ? "bg-amber-50/20 border-amber-100 hover:bg-amber-50/30"
                                          : "border-slate-100 hover:bg-slate-50/40"
                                      }`}
                                    >
                                      <td className="p-3 text-center text-slate-400 font-mono font-medium">
                                        {idx + 1}
                                      </td>
                                      <td className="p-3">
                                        <strong className={`font-semibold ${!isApprovedByTrader ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                          {item.itemName}
                                        </strong>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{item.brandName}</div>
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className="font-bold text-slate-800">{item.orderQty}</span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 ml-1 uppercase">
                                          {item.qtyType}
                                        </span>
                                      </td>
                                      <td className="p-3 text-center">
                                        <span
                                          className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full border ${
                                            isApprovedByTrader
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                              : item.traderDecision === "Rejected"
                                              ? "bg-red-50 text-red-700 border-red-100"
                                              : "bg-amber-50 text-amber-700 border-amber-100"
                                          }`}
                                        >
                                          {item.traderDecision === "Accepted" ? (
                                            <Check size={10} />
                                          ) : item.traderDecision === "Rejected" ? (
                                            <X size={10} />
                                          ) : (
                                            <Clock size={10} />
                                          )}
                                          {item.traderDecision}
                                        </span>
                                      </td>
                                      <td className="p-3 text-center">
                                        {!isApprovedByTrader ? (
                                          <span className="text-red-400 font-medium italic">Not Dispatched</span>
                                        ) : item.transporterQty !== null ? (
                                          <div className="inline-flex items-center gap-1">
                                            <span className="font-semibold text-slate-800">{item.transporterQty}</span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                                              {item.qtyType}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic">Pending</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-center">
                                        {!isApprovedByTrader ? (
                                          <span className="text-red-400 font-medium italic">N/A</span>
                                        ) : item.receiverQty !== null ? (
                                          <div className="inline-flex items-center gap-1">
                                            <span className="font-semibold text-slate-800">{item.receiverQty}</span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                                              {item.qtyType}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic">Pending</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-center">
                                        {!isApprovedByTrader ? (
                                          <span className="text-slate-400 font-medium">—</span>
                                        ) : mismatchDiff === null ? (
                                          <span className="text-slate-400 italic">Awaiting verification</span>
                                        ) : mismatchDiff === 0 ? (
                                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            <Check size={10} /> Match
                                          </span>
                                        ) : mismatchDiff < 0 ? (
                                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                            <TrendingDown size={10} /> {mismatchDiff} Shortage
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                            <TrendingUp size={10} /> +{mismatchDiff} Surplus
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Loading Spinner for On Scroll Pagination */}
        {!isLoading && isFetchingNextPage && (
          <div className="flex justify-center items-center py-8 gap-2 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading more orders...</span>
          </div>
        )}
      </div>

      {/* ── PO Details Inspector Drawer ─────────── */}
      {selectedPO && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300" onClick={() => setSelectedPO(null)}>
          <div className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform duration-300 translate-x-0" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded uppercase tracking-wider block w-fit">
                  Logistics Inspector
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedPO.po_number}</h2>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-100 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* PO Overview Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5">
                  Order Overview
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Shop Destination</span>
                    <span className="text-slate-800 font-semibold text-sm">{selectedPO.shop_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Vendor</span>
                    <span className="text-slate-800 font-semibold text-sm">{selectedPO.vendor_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Created Date</span>
                    <span className="text-slate-800 font-semibold">{formatDate(selectedPO.created_at)}</span>
                  </div>
                  {selectedPO.tp_number && (
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">TP Number</span>
                      <span className="text-slate-800 font-semibold font-mono">{selectedPO.tp_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Timeline / Audit Logs */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5">
                  Timeline Action History
                </h3>
                <div className="relative pl-5 border-l-2 border-slate-200 ml-2.5">
                  {/* Step 1: PO Created */}
                  <div className="relative mb-6 last:mb-0">
                    <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-800 block">Purchase Order Created</span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {formatDateTime(selectedPO.created_at)}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Purchase Order was automatically compiled from approved indents by the system.
                    </p>
                  </div>

                  {/* Step 2: Trader Review */}
                  <div className="relative mb-6 last:mb-0">
                    <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                      selectedPO.trader_status === "yes"
                        ? "bg-emerald-500"
                        : selectedPO.trader_status === "no"
                        ? "bg-red-500"
                        : "bg-amber-500 animate-pulse"
                    }`} />
                    <span className="text-xs font-bold text-slate-800 block">
                      Trader Dispatch Verification
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {selectedPO.trader_status ? formatDateTime(selectedPO.dispatch_date) : "Awaiting response"}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedPO.trader_status === "yes"
                        ? `Trader confirmed dispatch and entered expected delivery schedule. Remarks: "${selectedPO.remarks || "None"}"`
                        : selectedPO.trader_status === "no"
                        ? `Trader rejected PO request. Remarks: "${selectedPO.remarks || "None"}"`
                        : `Awaiting Supplier (${selectedPO.vendor_name}) action on the verification portal.`}
                    </p>
                  </div>

                  {/* Step 3: Transporter Confirmation */}
                  <div className="relative mb-6 last:mb-0">
                    <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                      selectedPO.transporter_status === "yes"
                        ? "bg-emerald-500"
                        : selectedPO.transporter_status === "no"
                        ? "bg-red-500"
                        : "bg-amber-500 animate-pulse"
                    }`} />
                    <span className="text-xs font-bold text-slate-800 block">
                      Logistics Pickup Confirmation
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {selectedPO.transporter_status ? formatDateTime(selectedPO.pickup_date) : "Awaiting response"}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedPO.transporter_status === "yes"
                        ? `Transporter (${selectedPO.transporter_name}) confirmed cargo pickup. Remarks: "${selectedPO.transporter_remarks || "None"}"`
                        : selectedPO.transporter_status === "no"
                        ? `Transporter rejected logistics pickup. Remarks: "${selectedPO.transporter_remarks || "None"}"`
                        : `Awaiting pickup confirmation from transporter (${selectedPO.transporter_name}).`}
                    </p>
                  </div>

                  {/* Step 4: Receiver Delivery */}
                  <div className="relative mb-6 last:mb-0">
                    <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                      selectedPO.receiver_status === "yes"
                        ? "bg-emerald-500"
                        : selectedPO.receiver_status === "no"
                        ? "bg-red-500"
                        : "bg-amber-500 animate-pulse"
                    }`} />
                    <span className="text-xs font-bold text-slate-800 block">
                      Destination Delivery Receipt
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {selectedPO.receiver_status === "yes" ? "Received & Verified" : "Awaiting response"}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedPO.receiver_status === "yes"
                        ? `Receiver (${selectedPO.receiver_name}) verified stock arrival and recorded received counts. Remarks: "${selectedPO.receiver_remarks || "None"}"`
                        : selectedPO.receiver_status === "no"
                        ? `Receiver rejected delivery. Remarks: "${selectedPO.receiver_remarks || "None"}"`
                        : `Awaiting destination shop arrival verification from receiver (${selectedPO.receiver_name}).`}
                    </p>
                  </div>
                </div>
              </div>

              {/* PDF Documents Attachments */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5">
                  Logistics Documents (PDF)
                </h3>
                <div className="space-y-2.5">
                  {selectedPO.trader_pdf_url ? (
                    <a
                      href={selectedPO.trader_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 text-inherit no-underline cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 block">Supplier / Trader PDF</span>
                        <span className="text-[10px] text-slate-400 block">Contains original dispatch terms</span>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed text-inherit no-underline">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 block">Supplier PDF</span>
                        <span className="text-[10px] text-slate-400 block">No document released</span>
                      </div>
                    </div>
                  )}

                  {selectedPO.transporter_pdf_url || selectedPO.trader_pdf_url ? (
                    <a
                      href={selectedPO.transporter_pdf_url || selectedPO.trader_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 text-inherit no-underline cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Truck size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 block">Transporter Invoice PDF</span>
                        <span className="text-[10px] text-slate-400 block">Contains pickup signatures</span>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed text-inherit no-underline">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Truck size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 block">Transporter PDF</span>
                        <span className="text-[10px] text-slate-400 block">No document released</span>
                      </div>
                    </div>
                  )}

                  {selectedPO.receiver_pdf_url ? (
                    <a
                      href={selectedPO.receiver_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200 text-inherit no-underline cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Inbox size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 block">Receiver Acknowledgement PDF</span>
                        <span className="text-[10px] text-slate-400 block">Contains receipt shortage notes</span>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed text-inherit no-underline">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Inbox size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-slate-800 block">Receiver PDF</span>
                        <span className="text-[10px] text-slate-400 block">No document released</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default OrdersPipeline;
