import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from '../utils/supabase'
import Sidebar from "./components/Sidebar";
import Toast, { useToast } from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Indent from "./pages/Indent";
import Approval from "./pages/Approval";
import PurchaseOrder from "./pages/PurchaseOrder";
import TraderVerification from "./pages/TraderVerification";
import TransporterVerification from "./pages/TransporterVerification";
import Receiving from "./pages/Receiving";
import MasterItem from "./pages/MasterItem";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import VendorConfirmation from "./pages/VendorConfirmation";
import TransporterConfirmation from "./pages/TransporterConfirmation";
import ReceiverConfirmation from "./pages/ReceiverConfirmation";
import VendorPortal from "./pages/VendorPortal";
import TransporterPortal from "./pages/TransporterPortal";
import ReceiverPortal from "./pages/ReceiverPortal";
import useAuthStore from "./store/useAuthStore";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuthStore();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AppContent = () => {
  const { toasts, removeToast } = useToast();
  const { currentUser, initSession } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    initSession();
  }, [initSession]);

  const isConfirmationPage = 
    location.pathname.startsWith("/confirm-po/") ||
    location.pathname.startsWith("/transporter-confirmation/") ||
    location.pathname.startsWith("/receiver-confirmation/") ||
    location.pathname.startsWith("/vendor-portal/") ||
    location.pathname.startsWith("/transporter-portal/") ||
    location.pathname.startsWith("/receiver-portal/");

  const showSidebar = currentUser && !isConfirmationPage;

  return (
    <div className="app-layout">
      {showSidebar && <Sidebar />}
      <main className={`main-content ${!showSidebar ? 'full-width' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/confirm-po/:id" element={<VendorConfirmation />} />
            <Route path="/transporter-confirmation/:id" element={<TransporterConfirmation />} />
            <Route path="/receiver-confirmation/:id" element={<ReceiverConfirmation />} />
            <Route path="/vendor-portal/:vendorId" element={<VendorPortal />} />
            <Route path="/transporter-portal/:transporterId" element={<TransporterPortal />} />
            <Route path="/receiver-portal/:receiverId" element={<ReceiverPortal />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/indent" element={<ProtectedRoute><Indent /></ProtectedRoute>} />
            <Route path="/approval" element={<ProtectedRoute><Approval /></ProtectedRoute>} />
            <Route path="/po" element={<ProtectedRoute><PurchaseOrder /></ProtectedRoute>} />
            <Route path="/trader_verification" element={<ProtectedRoute><TraderVerification /></ProtectedRoute>} />
            <Route path="/transporter_verification" element={<ProtectedRoute><TransporterVerification /></ProtectedRoute>} />
            <Route path="/receiving" element={<ProtectedRoute><Receiving /></ProtectedRoute>} />
            <Route path="/master_item" element={<ProtectedRoute><MasterItem /></ProtectedRoute>} />
            <Route path="/setting" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
        <footer style={{
          padding: '16px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#64748b',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          fontWeight: '500',
          zIndex: 10
        }}>
          Powered by <a href="https://www.botivate.in/" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: '700', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#4338ca'} onMouseLeave={(e) => e.currentTarget.style.color = '#4f46e5'}>Botivate</a>
        </footer>
      </main>
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

function App() {
  return <AppContent />;
}

export default App;
