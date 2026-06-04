import React, { useState, useEffect } from "react";
import useAuthStore from "../store/useAuthStore";
import useVendorStore from "../store/useVendorStore";
import useCompanyStore from "../store/useCompanyStore";
import { 
  Plus, Trash2, Edit2, Shield, Settings as SettingsIcon,
  Search, Copy, Check, Truck, UserCheck, Package, ShoppingBag, AlertCircle, Loader2, X
} from "lucide-react";
import { supabase } from "../../utils/supabase";
import "../styles/Settings.css";

const Settings = () => {
  const { users, fetchUsers, updateUser, createUser, deleteUser, currentUser } = useAuthStore();
  const { vendors, fetchVendors, updateVendor, createVendor, deleteVendor } = useVendorStore();
  const { 
    companies, 
    fetchCompanySettings, 
    createCompany, 
    updateCompany, 
    deleteCompany 
  } = useCompanyStore();
  
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableParties, setAvailableParties] = useState([]);
  
  // User Form State
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    permissions: [],
  });

  // Vendor Form State
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [isVendorSubmitting, setIsVendorSubmitting] = useState(false);
  const [vendorFormData, setVendorFormData] = useState({
    party_name: "",
    address: "",
    gstin: "",
    contact_name: "",
    contact: "",
    email: "",
    terms: [],
  });

  // Company Form State
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [isCompanySubmitting, setIsCompanySubmitting] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    name: "",
    address: "",
    gstin: "",
    contact: "",
    email: "",
    terms: [],
  });

  // Transporter Form State
  const [transporters, setTransporters] = useState([]);
  const [showTransporterForm, setShowTransporterForm] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState(null);
  const [isTransporterSubmitting, setIsTransporterSubmitting] = useState(false);
  const [transporterFormData, setTransporterFormData] = useState({ name: "", contact_number: "" });

  // Receiver Form State
  const [receivers, setReceivers] = useState([]);
  const [showReceiverForm, setShowReceiverForm] = useState(false);
  const [editingReceiver, setEditingReceiver] = useState(null);
  const [isReceiverSubmitting, setIsReceiverSubmitting] = useState(false);
  const [receiverFormData, setReceiverFormData] = useState({ name: "", contact_number: "" });

  useEffect(() => {
    fetchUsers();
    fetchVendors();
    fetchAvailableParties();
    fetchCompanySettings();
    fetchTransporters();
    fetchReceivers();
  }, [fetchUsers, fetchVendors, fetchCompanySettings]);

  const fetchTransporters = async () => {
    const { data } = await supabase.from("transporters").select("*").order("created_at", { ascending: false });
    if (data) setTransporters(data);
  };

  const fetchReceivers = async () => {
    const { data } = await supabase.from("receivers").select("*").order("created_at", { ascending: false });
    if (data) setReceivers(data);
  };



  const fetchAvailableParties = async () => {
    const { data, error } = await supabase
      .from("indent_items")
      .select("party_name")
      .not("party_name", "is", null);
      
    if (!error && data) {
      const uniqueParties = [...new Set(data.map(d => d.party_name).filter(Boolean))];
      setAvailableParties(uniqueParties);
    }
  };

  const allPermissions = [
    { key: "dashboard", label: "Dashboard" },
    { key: "indent", label: "Indent" },
    { key: "approval", label: "Approval" },
    { key: "po", label: "Purchase Order" },
    { key: "po_history", label: "PO History" },
    { key: "trader_verification", label: "Trader Verification" },
    { key: "transporter_verification", label: "Transporter Verification" },
    { key: "receiving", label: "Receiving" },
    { key: "setting", label: "Settings" },
  ];

  // --- USER HANDLERS ---
  const handleEdit = (user) => {
    setEditingUser(user.id);
    setFormData({
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      permissions: user.permissions || [],
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "user",
      permissions: [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let res;
    if (editingUser) {
      res = await updateUser(editingUser, formData);
    } else {
      res = await createUser(formData);
    }

    setIsSubmitting(false);

    if (res.success) {
      alert(`User ${editingUser ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const handlePermissionChange = (permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser?.id) {
      alert("Cannot delete your own account!");
      return;
    }
    if (window.confirm("Are you sure you want to delete this user?")) {
      const res = await deleteUser(userId);
      if (res.success) {
        alert("User deleted successfully!");
      } else {
        alert(`Error deleting user: ${res.error}`);
      }
    }
  };

  // --- VENDOR HANDLERS ---
  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor.id);
    setVendorFormData({
      party_name: vendor.party_name || "",
      address: vendor.address || "",
      gstin: vendor.gstin || "",
      contact_name: vendor.contact_name || "",
      contact: vendor.contact || "",
      email: vendor.email || "",
      terms: vendor.terms || [],
    });
    setShowVendorForm(true);
  };

  const handleAddNewVendor = () => {
    setEditingVendor(null);
    setVendorFormData({
      party_name: availableParties.length > 0 ? availableParties[0] : "",
      address: "",
      gstin: "",
      contact_name: "",
      contact: "",
      email: "",
      terms: [],
    });
    setShowVendorForm(true);
  };

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    if (!vendorFormData.party_name) {
      alert("Party Name is required");
      return;
    }

    setIsVendorSubmitting(true);

    let res;
    if (editingVendor) {
      res = await updateVendor(editingVendor, vendorFormData);
    } else {
      res = await createVendor(vendorFormData);
    }

    setIsVendorSubmitting(false);

    if (res.success) {
      alert(`Vendor ${editingVendor ? 'updated' : 'created'} successfully!`);
      setShowVendorForm(false);
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      const res = await deleteVendor(vendorId);
      if (res.success) {
        alert("Vendor deleted successfully!");
      } else {
        alert(`Error deleting vendor: ${res.error}`);
      }
    }
  };

  // --- COMPANY SETTINGS HANDLERS ---
  const handleAddNewCompany = () => {
    setEditingCompany(null);
    setCompanyFormData({
      name: "",
      address: "",
      gstin: "",
      contact: "",
      email: "",
      terms: [],
    });
    setShowCompanyForm(true);
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company.id);
    setCompanyFormData({
      name: company.name || "",
      address: company.address || "",
      gstin: company.gstin || "",
      contact: company.contact || "",
      email: company.email || "",
      terms: company.terms || [],
    });
    setShowCompanyForm(true);
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setIsCompanySubmitting(true);
    
    let res;
    if (editingCompany) {
      res = await updateCompany(editingCompany, companyFormData);
    } else {
      res = await createCompany(companyFormData);
    }
    
    setIsCompanySubmitting(false);
    
    if (res.success) {
      alert(`Company profile ${editingCompany ? 'updated' : 'created'} successfully!`);
      setShowCompanyForm(false);
    } else {
      alert(`Error saving company details: ${res.error}`);
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (window.confirm("Are you sure you want to delete this company profile? This action cannot be undone.")) {
      const res = await deleteCompany(companyId);
      if (res.success) {
        alert("Company profile deleted successfully!");
      } else {
        alert(`Error deleting company profile: ${res.error}`);
      }
    }
  };

  const handleTermChange = (index, value) => {
    const newTerms = [...companyFormData.terms];
    newTerms[index] = value;
    setCompanyFormData({ ...companyFormData, terms: newTerms });
  };

  const handleAddTerm = () => {
    setCompanyFormData({
      ...companyFormData,
      terms: [...companyFormData.terms, ""]
    });
  };

  const handleRemoveTerm = (index) => {
    const newTerms = companyFormData.terms.filter((_, i) => i !== index);
    setCompanyFormData({ ...companyFormData, terms: newTerms });
  };

  const handleVendorTermChange = (index, value) => {
    const newTerms = [...(vendorFormData.terms || [])];
    newTerms[index] = value;
    setVendorFormData({ ...vendorFormData, terms: newTerms });
  };

  const handleVendorAddTerm = () => {
    setVendorFormData({
      ...vendorFormData,
      terms: [...(vendorFormData.terms || []), ""]
    });
  };

  const handleVendorRemoveTerm = (index) => {
    const newTerms = (vendorFormData.terms || []).filter((_, i) => i !== index);
    setVendorFormData({ ...vendorFormData, terms: newTerms });
  };

  // --- TRANSPORTER HANDLERS ---
  const handleEditTransporter = (t) => {
    setEditingTransporter(t.id);
    setTransporterFormData({ name: t.name || "", contact_number: t.contact_number || "" });
    setShowTransporterForm(true);
  };

  const handleTransporterSubmit = async (e) => {
    e.preventDefault();
    setIsTransporterSubmitting(true);
    let res;
    if (editingTransporter) {
      res = await supabase.from("transporters").update(transporterFormData).eq("id", editingTransporter);
    } else {
      res = await supabase.from("transporters").insert([transporterFormData]);
    }
    setIsTransporterSubmitting(false);

    if (!res.error) {
      alert(`Transporter ${editingTransporter ? "updated" : "added"} successfully!`);
      setShowTransporterForm(false);
      fetchTransporters();
    } else {
      alert(`Error: ${res.error.message}`);
    }
  };

  const handleDeleteTransporter = async (id) => {
    if (window.confirm("Delete this transporter?")) {
      await supabase.from("transporters").delete().eq("id", id);
      fetchTransporters();
    }
  };

  // --- RECEIVER HANDLERS ---
  const handleEditReceiver = (r) => {
    setEditingReceiver(r.id);
    setReceiverFormData({ name: r.name || "", contact_number: r.contact_number || "" });
    setShowReceiverForm(true);
  };

  const handleReceiverSubmit = async (e) => {
    e.preventDefault();
    setIsReceiverSubmitting(true);
    let res;
    if (editingReceiver) {
      res = await supabase.from("receivers").update(receiverFormData).eq("id", editingReceiver);
    } else {
      res = await supabase.from("receivers").insert([receiverFormData]);
    }
    setIsReceiverSubmitting(false);

    if (!res.error) {
      alert(`Receiver ${editingReceiver ? "updated" : "added"} successfully!`);
      setShowReceiverForm(false);
      fetchReceivers();
    } else {
      alert(`Error: ${res.error.message}`);
    }
  };

  const handleDeleteReceiver = async (id) => {
    if (window.confirm("Delete this receiver?")) {
      await supabase.from("receivers").delete().eq("id", id);
      fetchReceivers();
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.party_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.contact && v.contact.includes(searchQuery))
  );

  const filteredTransporters = transporters.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.contact_number && t.contact_number.includes(searchQuery))
  );

  const filteredReceivers = receivers.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.contact_number && r.contact_number.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-800 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <SettingsIcon className="text-indigo-400" size={32} />
              Settings & Portal Control
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              Configure system user roles, vendors ledger, logistics partners, and manage permanent verification portal links.
            </p>
          </div>
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            Admin Console
          </span>
        </div>

        {/* Tab Navigation pills */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: "users", label: "User Management" },
            { id: "vendors", label: "Vendor Management" },
            { id: "company", label: "Company Profile" },
            { id: "transporters", label: "Transporters" },
            { id: "receivers", label: "Receivers" },
            { id: "portal_links", label: "Secure Portal Links" }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div className="space-y-6">
          
          {/* USERS MANAGEMENT TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">System Users</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Manage operator roles, credentials, and page authorizations.</p>
                </div>
                <button 
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  onClick={handleAddNew}
                >
                  <Plus size={15} /> Add New User
                </button>
              </div>

              {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-16">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 w-full max-w-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                    <h3 className="text-base font-bold text-slate-950 border-b border-slate-100 pb-3">
                      {editingUser ? "📝 Edit User Profile" : "✨ Create New User Account"}
                    </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Username *</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          required
                          disabled={isSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Email Address *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          disabled={isSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Password {editingUser && "(Leave empty to keep current)"}</label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required={!editingUser}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">System Role *</label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          disabled={isSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        >
                          <option value="user">Operator (User)</option>
                          <option value="approver">Approver</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-slate-700 block">Page Authorizations / Permissions</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        {allPermissions.map((perm) => (
                          <label key={perm.key} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(perm.key)}
                              onChange={() => handlePermissionChange(perm.key)}
                              disabled={isSubmitting}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="text-xs font-semibold text-slate-700">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        {isSubmitting ? "Saving..." : "Save User Details"}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowForm(false)}
                        className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                  </div>
                </div>
              )}

              {/* Users Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Security Role</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Auth Count</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap"><strong className="text-slate-900 font-bold">{user.username}</strong></td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              user.role === 'admin' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : user.role === 'approver' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-bold">{user.permissions?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleEdit(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleDelete(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-slate-500 font-medium">No system users configured.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VENDORS TAB */}
          {activeTab === 'vendors' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Supplier Ledger</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Register manufacturing plants, contact info, and tax credentials.</p>
                </div>
                <button 
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  onClick={handleAddNewVendor}
                >
                  <Plus size={15} /> Add New Vendor
                </button>
              </div>

              {showVendorForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-16">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 w-full max-w-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowVendorForm(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                    <h3 className="text-base font-bold text-slate-950 border-b border-slate-100 pb-3">
                      {editingVendor ? "📝 Edit Supplier details" : "✨ Create New Supplier Entry"}
                    </h3>
                  <form onSubmit={handleVendorSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Party / Vendor Name *</label>
                        <select
                          value={vendorFormData.party_name}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, party_name: e.target.value })}
                          required
                          disabled={isVendorSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        >
                          <option value="">Select a Party Name</option>
                          {availableParties.map((party, idx) => (
                            <option key={idx} value={party}>{party}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">GSTIN / Tax ID</label>
                        <input
                          type="text"
                          value={vendorFormData.gstin}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, gstin: e.target.value })}
                          disabled={isVendorSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Primary Contact Phone</label>
                        <input
                          type="text"
                          value={vendorFormData.contact}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, contact: e.target.value })}
                          disabled={isVendorSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Email Address</label>
                        <input
                          type="email"
                          value={vendorFormData.email}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                          disabled={isVendorSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Contact Person Name</label>
                      <input
                        type="text"
                        value={vendorFormData.contact_name}
                        onChange={(e) => setVendorFormData({ ...vendorFormData, contact_name: e.target.value })}
                        disabled={isVendorSubmitting}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Corporate Address</label>
                      <textarea
                        value={vendorFormData.address}
                        onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                        disabled={isVendorSubmitting}
                        rows={3}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none font-medium"
                      />
                    </div>

                    {/* Standard Terms */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-800">Standard Purchase Terms</span>
                        <button 
                          type="button" 
                          onClick={handleVendorAddTerm}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} /> Add term
                        </button>
                      </div>

                      {(!vendorFormData.terms || vendorFormData.terms.length === 0) ? (
                        <p className="text-slate-500 text-xs font-medium italic">No terms defined for this profile.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {vendorFormData.terms.map((term, index) => (
                            <div key={index} className="flex gap-2 items-start bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                              <span className="text-xs font-bold text-slate-400 mt-2 shrink-0">{index + 1}.</span>
                              <textarea
                                value={term}
                                onChange={(e) => handleVendorTermChange(index, e.target.value)}
                                disabled={isVendorSubmitting}
                                rows={2}
                                className="w-full text-xs border-0 bg-transparent text-slate-800 font-medium resize-none focus:outline-none p-0"
                                placeholder="E.g. Payment is net 30 days..."
                              />
                              <button
                                type="button"
                                onClick={() => handleVendorRemoveTerm(index)}
                                disabled={isVendorSubmitting}
                                className="p-1 hover:bg-red-50 text-red-600 rounded border border-transparent hover:border-red-200 transition-all shrink-0 cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={isVendorSubmitting}
                        className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        {isVendorSubmitting ? "Saving..." : "Save Vendor Details"}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowVendorForm(false)}
                        className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

              {/* Vendors Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Party / Vendor Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">GSTIN</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {vendors.map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap"><strong className="text-slate-900 font-bold">{vendor.party_name}</strong></td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{vendor.contact || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{vendor.email || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-bold uppercase">{vendor.gstin || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleEditVendor(vendor)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleDeleteVendor(vendor.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {vendors.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-slate-500 font-medium">No vendors found. Select "+ Add New Vendor".</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* COMPANY PROFILE TAB */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Corporate Profiles</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Manage billing entities, invoicing addresses, and standard PO terms.</p>
                </div>
                <button 
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  onClick={handleAddNewCompany}
                >
                  <Plus size={15} /> Add New Company
                </button>
              </div>

              {showCompanyForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-16">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 w-full max-w-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowCompanyForm(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                    <h3 className="text-base font-bold text-slate-950 border-b border-slate-100 pb-3">
                      {editingCompany ? "📝 Edit Company Profile" : "✨ Create Corporate Billing Profile"}
                    </h3>
                  <form onSubmit={handleCompanySubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Company Billing Name *</label>
                        <input
                          type="text"
                          value={companyFormData.name}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                          required
                          disabled={isCompanySubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">GSTIN / Corporate Tax ID *</label>
                        <input
                          type="text"
                          value={companyFormData.gstin}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, gstin: e.target.value })}
                          required
                          disabled={isCompanySubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Billing Contact Number *</label>
                        <input
                          type="text"
                          value={companyFormData.contact}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, contact: e.target.value })}
                          required
                          disabled={isCompanySubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Email Address *</label>
                        <input
                          type="email"
                          value={companyFormData.email}
                          onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                          required
                          disabled={isCompanySubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Corporate Address *</label>
                      <textarea
                        value={companyFormData.address}
                        onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                        required
                        disabled={isCompanySubmitting}
                        rows={2}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none font-medium"
                      />
                    </div>

                    {/* Invoicing Terms */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-800">Standard Purchase Terms</span>
                        <button 
                          type="button" 
                          onClick={handleAddTerm}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} /> Add term
                        </button>
                      </div>

                      {companyFormData.terms.length === 0 ? (
                        <p className="text-slate-500 text-xs font-medium italic">No terms defined for this profile.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {companyFormData.terms.map((term, index) => (
                            <div key={index} className="flex gap-2 items-start bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                              <span className="text-xs font-bold text-slate-400 mt-2 shrink-0">{index + 1}.</span>
                              <textarea
                                value={term}
                                onChange={(e) => handleTermChange(index, e.target.value)}
                                disabled={isCompanySubmitting}
                                rows={2}
                                className="w-full text-xs border-0 bg-transparent text-slate-800 font-medium resize-none focus:outline-none p-0"
                                placeholder="E.g. Payment is net 30 days..."
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveTerm(index)}
                                disabled={isCompanySubmitting}
                                className="p-1 hover:bg-red-50 text-red-600 rounded border border-transparent hover:border-red-200 transition-all shrink-0 cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={isCompanySubmitting}
                        className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        {isCompanySubmitting ? "Saving..." : "Save Corporate Profile"}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowCompanyForm(false)}
                        className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                  </div>
                </div>
              )}

              {/* Company Profiles Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">GSTIN</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Billing Contact</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Terms Count</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {companies.map((company) => (
                        <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap"><strong className="text-slate-900 font-bold">{company.name}</strong></td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-bold uppercase">{company.gstin}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{company.contact}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{company.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-bold">{company.terms?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleEditCompany(company)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleDeleteCompany(company.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {companies.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-slate-500 font-medium">No company billing profile defined.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TRANSPORTERS TAB */}
          {activeTab === 'transporters' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Transporter Directory</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Manage logistics partners and mobile contact details.</p>
                </div>
                <button 
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  onClick={() => {
                    setEditingTransporter(null);
                    setTransporterFormData({ name: "", contact_number: "" });
                    setShowTransporterForm(true);
                  }}
                >
                  <Plus size={15} /> Add Transporter
                </button>
              </div>

              {showTransporterForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-16">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 w-full max-w-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowTransporterForm(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                    <h3 className="text-base font-bold text-slate-950 border-b border-slate-100 pb-3">
                      {editingTransporter ? "📝 Edit Transporter Details" : "✨ Add Logistics Partner"}
                    </h3>
                  <form onSubmit={handleTransporterSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Company Name *</label>
                        <input
                          type="text"
                          value={transporterFormData.name}
                          onChange={(e) => setTransporterFormData({ ...transporterFormData, name: e.target.value })}
                          required
                          disabled={isTransporterSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Logistics Contact Number *</label>
                        <input
                          type="text"
                          value={transporterFormData.contact_number}
                          onChange={(e) => setTransporterFormData({ ...transporterFormData, contact_number: e.target.value })}
                          required
                          disabled={isTransporterSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={isTransporterSubmitting}
                        className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        {isTransporterSubmitting ? "Saving..." : "Save Transporter"}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowTransporterForm(false)}
                        className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                  </div>
                </div>
              )}

              {/* Transporters Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Logistics Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {transporters.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap"><strong className="text-slate-900 font-bold">{t.name}</strong></td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{t.contact_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleEditTransporter(t)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleDeleteTransporter(t.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {transporters.length === 0 && (
                        <tr>
                          <td colSpan="3" className="px-6 py-8 text-center text-slate-500 font-medium">No transporters defined.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RECEIVERS TAB */}
          {activeTab === 'receivers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Receivers Directory</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Manage delivery partner sites and contact credentials.</p>
                </div>
                <button 
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  onClick={() => {
                    setEditingReceiver(null);
                    setReceiverFormData({ name: "", contact_number: "" });
                    setShowReceiverForm(true);
                  }}
                >
                  <Plus size={15} /> Add Receiver
                </button>
              </div>

              {showReceiverForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-16">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 w-full max-w-2xl relative">
                    <button
                      type="button"
                      onClick={() => setShowReceiverForm(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                    <h3 className="text-base font-bold text-slate-950 border-b border-slate-100 pb-3">
                      {editingReceiver ? "📝 Edit Receiver Details" : "✨ Add Stock Receiver Profile"}
                    </h3>
                  <form onSubmit={handleReceiverSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Receiver Name *</label>
                        <input
                          type="text"
                          value={receiverFormData.name}
                          onChange={(e) => setReceiverFormData({ ...receiverFormData, name: e.target.value })}
                          required
                          disabled={isReceiverSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Contact Number *</label>
                        <input
                          type="text"
                          value={receiverFormData.contact_number}
                          onChange={(e) => setReceiverFormData({ ...receiverFormData, contact_number: e.target.value })}
                          required
                          disabled={isReceiverSubmitting}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={isReceiverSubmitting}
                        className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        {isReceiverSubmitting ? "Saving..." : "Save Receiver"}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowReceiverForm(false)}
                        className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                  </div>
                </div>
              )}

              {/* Receivers Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Receiver Site / Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {receivers.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap"><strong className="text-slate-900 font-bold">{r.name}</strong></td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{r.contact_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleEditReceiver(r)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition-all cursor-pointer"
                              onClick={() => handleDeleteReceiver(r.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {receivers.length === 0 && (
                        <tr>
                          <td colSpan="3" className="px-6 py-8 text-center text-slate-500 font-medium">No receivers defined.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECURE PORTAL LINKS TAB */}
          {activeTab === 'portal_links' && (
            <div className="space-y-8">
              
              {/* Accessibility Header + Searchbar */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                      <Shield className="text-indigo-600" size={24} />
                      Permanent Secure Portal Links
                    </h2>
                    <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">
                      Copy and share permanent links for vendors, transporters, and receivers to securely submit reports.
                    </p>
                  </div>
                  {/* Accessibility Searchbar */}
                  <div className="relative w-full md:w-80 shadow-sm rounded-lg">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={18} className="text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search by name or number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* THREE DISTINCT SECTIONS FOR PORTAL LINKS */}
              
              {/* SECTION 1: SUPPLIER / VENDOR PORTALS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-300">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="bg-emerald-500/10 text-emerald-600 p-1.5 rounded-lg">
                    <ShoppingBag size={18} />
                  </span>
                  Supplier / Vendor Portals
                </h3>
                <div className="overflow-hidden border border-slate-150 rounded-xl">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                      <thead className="bg-slate-50/70">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Permanent Portal URL</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {filteredVendors.map((v) => {
                          const baseUrl = window.location.origin;
                          
                          let link = v.portal_link || `/vendor-portal/${v.id}`;
                          if (!link.startsWith("http")) {
                            link = `${baseUrl}${link}`;
                          }

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap"><strong className="text-slate-950 font-bold">{v.party_name}</strong></td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold">{v.contact || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap max-w-xs md:max-w-sm truncate">
                                <code className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-xs font-mono text-indigo-700 break-all select-all">
                                  {link}
                                </code>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button 
                                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                                  onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    alert("Vendor Portal Link copied to clipboard!");
                                  }}
                                >
                                  <Copy size={13} /> Copy Link
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredVendors.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-slate-500 font-medium italic">No matching vendors found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TRANSPORTER / LOGISTICS PORTALS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-300">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="bg-blue-500/10 text-blue-600 p-1.5 rounded-lg">
                    <Truck size={18} />
                  </span>
                  Transporter / Logistics Portals
                </h3>
                <div className="overflow-hidden border border-slate-150 rounded-xl">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                      <thead className="bg-slate-50/70">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Transporter Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Permanent Portal URL</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {filteredTransporters.map((t) => {
                          const baseUrl = window.location.origin;
                          let link = t.portal_link || `/transporter-portal/${t.id}`;
                          if (!link.startsWith("http")) {
                            link = `${baseUrl}${link}`;
                          }
                          
                          return (
                            <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap"><strong className="text-slate-950 font-bold">{t.name}</strong></td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold">{t.contact_number || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap max-w-xs md:max-w-sm truncate">
                                <code className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-xs font-mono text-indigo-700 break-all select-all">
                                  {link}
                                </code>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button 
                                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                                  onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    alert("Transporter Portal Link copied to clipboard!");
                                  }}
                                >
                                  <Copy size={13} /> Copy Link
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredTransporters.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-slate-500 font-medium italic">No matching transporters found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION 3: RECEIVER PORTALS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow duration-300">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="bg-purple-500/10 text-purple-600 p-1.5 rounded-lg">
                    <Package size={18} />
                  </span>
                  Receiver / Site Portals
                </h3>
                <div className="overflow-hidden border border-slate-150 rounded-xl">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                      <thead className="bg-slate-50/70">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Receiver Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Permanent Portal URL</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {filteredReceivers.map((r) => {
                          const baseUrl = window.location.origin;
                          let link = r.portal_link || `/receiver-portal/${r.id}`;
                          if (!link.startsWith("http")) {
                            link = `${baseUrl}${link}`;
                          }
                          
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap"><strong className="text-slate-950 font-bold">{r.name}</strong></td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-semibold">{r.contact_number || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap max-w-xs md:max-w-sm truncate">
                                <code className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-xs font-mono text-indigo-700 break-all select-all">
                                  {link}
                                </code>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button 
                                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                                  onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    alert("Receiver Portal Link copied to clipboard!");
                                  }}
                                >
                                  <Copy size={13} /> Copy Link
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredReceivers.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-6 py-8 text-center text-slate-500 font-medium italic">No matching receivers found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
