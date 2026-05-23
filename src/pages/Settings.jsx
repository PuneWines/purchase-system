import React, { useState, useEffect } from "react";
import useAuthStore from "../store/useAuthStore";
import useVendorStore from "../store/useVendorStore";
import useCompanyStore from "../store/useCompanyStore";
import { Plus, Trash2, Edit2, Shield, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "../../utils/supabase";
import "../styles/Settings.css";

const Settings = () => {
  const { users, fetchUsers, updateUser, createUser, deleteUser, currentUser } = useAuthStore();
  const { vendors, fetchVendors, updateVendor, createVendor, deleteVendor } = useVendorStore();
  const { companySettings, fetchCompanySettings, updateCompanySettings } = useCompanyStore();
  
  const [activeTab, setActiveTab] = useState("users");
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
  });

  // Company Form State
  const [companyFormData, setCompanyFormData] = useState({
    name: "",
    address: "",
    gstin: "",
    contact: "",
    email: "",
    terms: [],
  });
  const [isCompanySubmitting, setIsCompanySubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchVendors();
    fetchAvailableParties();
    fetchCompanySettings();
  }, [fetchUsers, fetchVendors, fetchCompanySettings]);

  useEffect(() => {
    if (companySettings) {
      setCompanyFormData({
        name: companySettings.name || "",
        address: companySettings.address || "",
        gstin: companySettings.gstin || "",
        contact: companySettings.contact || "",
        email: companySettings.email || "",
        terms: companySettings.terms || [],
      });
    }
  }, [companySettings]);

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
    { key: "trader_verification", label: "Trader Verification" },
    { key: "transporter_verification", label: "Transporter Verification" },
    { key: "receiving", label: "Receiving" },
    { key: "master_item", label: "Master Items" },
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
  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setIsCompanySubmitting(true);
    const res = await updateCompanySettings(companyFormData);
    setIsCompanySubmitting(false);
    
    if (res.success) {
      alert("Company settings updated successfully!");
    } else {
      alert(`Error updating company settings: ${res.error}`);
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

  return (
    <div className="page-container">
      <h1>Settings</h1>
      <p className="page-description">
        Manage application settings, users, vendors, and company profile.
      </p>

      <div className="settings-tabs">
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button 
          className={`tab-button ${activeTab === 'vendors' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendors')}
        >
          Vendor Management
        </button>
        <button 
          className={`tab-button ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          Company Profile
        </button>
      </div>

      <div className="settings-section">
        {activeTab === 'users' && (
          <>
            <div className="section-header">
              <h2>User Management</h2>
              <button className="btn-primary" onClick={handleAddNew}>
                + Add New User
              </button>
            </div>

            {showForm && (
              <div className="user-form-container">
                <h3>{editingUser ? "Edit User" : "Create New User"}</h3>
                <form onSubmit={handleSubmit} className="user-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Username *</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required={!editingUser}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label>Role *</label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        disabled={isSubmitting}
                      >
                        <option value="user">User</option>
                        <option value="approver">Approver</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group permissions-group">
                    <label>Permissions</label>
                    <div className="permissions-grid">
                      {allPermissions.map((perm) => (
                        <div key={perm.key} className="permission-item">
                          <input
                            type="checkbox"
                            id={perm.key}
                            checked={formData.permissions.includes(perm.key)}
                            onChange={() => handlePermissionChange(perm.key)}
                            disabled={isSubmitting}
                          />
                          <label htmlFor={perm.key}>{perm.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save User"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowForm(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Permissions Count</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.username}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user.permissions?.length || 0}</td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(user)}
                          disabled={user.id === currentUser?.id}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
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
                      <td colSpan="5" style={{ textAlign: 'center' }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'vendors' && (
          <>
            <div className="section-header">
              <h2>Vendor Management</h2>
              <button className="btn-primary" onClick={handleAddNewVendor}>
                + Add New Vendor
              </button>
            </div>

            {showVendorForm && (
              <div className="user-form-container">
                <h3>{editingVendor ? "Edit Vendor" : "Create New Vendor"}</h3>
                <form onSubmit={handleVendorSubmit} className="user-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Party Name *</label>
                      <select
                        value={vendorFormData.party_name}
                        onChange={(e) =>
                          setVendorFormData({ ...vendorFormData, party_name: e.target.value })
                        }
                        required
                        disabled={isVendorSubmitting}
                      >
                        <option value="">Select a Party</option>
                        {availableParties.map((party, idx) => (
                          <option key={idx} value={party}>{party}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>GSTIN</label>
                      <input
                        type="text"
                        value={vendorFormData.gstin}
                        onChange={(e) =>
                          setVendorFormData({ ...vendorFormData, gstin: e.target.value })
                        }
                        disabled={isVendorSubmitting}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Contact</label>
                      <input
                        type="text"
                        value={vendorFormData.contact}
                        onChange={(e) =>
                          setVendorFormData({ ...vendorFormData, contact: e.target.value })
                        }
                        disabled={isVendorSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={vendorFormData.email}
                        onChange={(e) =>
                          setVendorFormData({ ...vendorFormData, email: e.target.value })
                        }
                        disabled={isVendorSubmitting}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Contact Name</label>
                      <input
                        type="text"
                        value={vendorFormData.contact_name}
                        onChange={(e) =>
                          setVendorFormData({ ...vendorFormData, contact_name: e.target.value })
                        }
                        disabled={isVendorSubmitting}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ flexDirection: 'column' }}>
                    <label>Address</label>
                    <textarea
                      value={vendorFormData.address}
                      onChange={(e) =>
                        setVendorFormData({ ...vendorFormData, address: e.target.value })
                      }
                      disabled={isVendorSubmitting}
                      rows="3"
                      style={{
                        padding: '0.85rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        background: 'var(--glass-bg)'
                      }}
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={isVendorSubmitting}>
                      {isVendorSubmitting ? "Saving..." : "Save Vendor"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowVendorForm(false)}
                      disabled={isVendorSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Party Name</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>GSTIN</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>
                        <strong>{vendor.party_name}</strong>
                      </td>
                      <td>{vendor.contact || '-'}</td>
                      <td>{vendor.email || '-'}</td>
                      <td>{vendor.gstin || '-'}</td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => handleEditVendor(vendor)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteVendor(vendor.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center' }}>No vendors found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'company' && (
          <>
            <div className="section-header">
              <h2>Company Profile</h2>
            </div>
            
            <div className="user-form-container">
              <form onSubmit={handleCompanySubmit} className="user-form">
                <h3>Company Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      value={companyFormData.name}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                      required
                      disabled={isCompanySubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label>GSTIN *</label>
                    <input
                      type="text"
                      value={companyFormData.gstin}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, gstin: e.target.value })}
                      required
                      disabled={isCompanySubmitting}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Number *</label>
                    <input
                      type="text"
                      value={companyFormData.contact}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, contact: e.target.value })}
                      required
                      disabled={isCompanySubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      value={companyFormData.email}
                      onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                      required
                      disabled={isCompanySubmitting}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ flexDirection: 'column' }}>
                  <label>Company Address *</label>
                  <textarea
                    value={companyFormData.address}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                    required
                    disabled={isCompanySubmitting}
                    rows="2"
                    style={{
                      padding: '0.85rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      background: 'var(--glass-bg)'
                    }}
                  />
                </div>

                <div style={{ marginTop: '2rem', marginBottom: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Terms and Conditions</h3>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={handleAddTerm}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={14} /> Add Term
                    </button>
                  </div>
                  
                  {companyFormData.terms.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No terms added yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {companyFormData.terms.map((term, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{ marginTop: '10px', color: '#64748b', fontWeight: 600 }}>{index + 1}.</span>
                          <textarea
                            value={term}
                            onChange={(e) => handleTermChange(index, e.target.value)}
                            disabled={isCompanySubmitting}
                            rows="2"
                            style={{
                              flex: 1,
                              padding: '0.6rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              fontFamily: 'inherit',
                              fontSize: '0.9rem',
                              background: 'var(--glass-bg)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTerm(index)}
                            disabled={isCompanySubmitting}
                            style={{
                              background: 'none', border: 'none', color: '#ef4444', 
                              cursor: 'pointer', padding: '8px', marginTop: '2px',
                              borderRadius: '4px', display: 'flex', alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-actions" style={{ marginTop: '2rem' }}>
                  <button type="submit" className="btn-primary" disabled={isCompanySubmitting}>
                    {isCompanySubmitting ? "Saving..." : "Save Profile & Terms"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
