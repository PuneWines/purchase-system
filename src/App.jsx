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

  useEffect(() => {
    initSession();
  }, [initSession]);

  return (
    <div className="app-layout">
      {currentUser && <Sidebar />}
      <main className={`main-content ${!currentUser ? 'full-width' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/confirm-po/:id" element={<VendorConfirmation />} />
          <Route path="/transporter-confirmation/:id" element={<TransporterConfirmation />} />
          <Route path="/receiver-confirmation/:id" element={<ReceiverConfirmation />} />
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
      </main>
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

function App() {
  return <AppContent />;
}

export default App;
