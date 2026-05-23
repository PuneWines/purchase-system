# Purchase Management System (PMS)

A comprehensive React-based purchase management system with role-based access control, multiple modules for purchase operations, and an admin panel for user management.

## 🎯 Features

### Dashboard

- Overview of key metrics and KPIs
- Purchase orders summary
- Pending indents and approvals count
- Delivery completion tracking

### Indent Management

- Create and manage material indents
- Track indent status (Pending, Approved, Rejected)
- Department-wise filtering
- Requested by tracking

### Approval Management

- Review purchase approval requests
- Track approval workflow
- Priority-based filtering
- Cost estimation visibility

### Purchase Orders (PO)

- Create and manage purchase orders
- Vendor information tracking
- Delivery schedule management
- Order status tracking (Confirmed, Pending, Dispatched, Delivered)

### Trader Verification

- Verify vendor credentials
- GST and PAN number tracking
- Registration type management
- Verification status tracking

### Transporter Verification

- Verify transporter/logistics partner details
- License number validation
- GST and PAN tracking
- Transport partner credibility management

### Receiving Management

- Track goods receipt
- Quantity verification
- Discrepancy management (Partial, Complete deliveries)
- Warehouse manager assignment

### Master Items

- Manage inventory items
- Category and specification management
- Reorder level configuration
- Stock management tracking

### Settings & User Management (Admin Only)

- Create new user accounts
- Edit existing user details
- Delete user accounts
- Assign permissions per user
- Role-based access control (Admin, Approver, User)

## 🔐 User Roles & Default Credentials

### Admin Account

- **Username:** admin
- **Password:** admin123
- **Role:** Admin
- **Access:** All modules

### Approver Account

- **Username:** approver
- **Password:** approver123
- **Role:** Approver
- **Access:** Dashboard, Approval, PO, Trader Verification

### Regular User Account

- **Username:** user1
- **Password:** user123
- **Role:** User
- **Access:** Dashboard, Indent, Approval, PO

## 📦 Available Modules

| Module                   | Key Features                           |
| ------------------------ | -------------------------------------- |
| Dashboard                | Metrics, KPIs, Status Overview         |
| Indent                   | Create, Track, Filter Requests         |
| Approval                 | Review, Approve, Reject Requests       |
| PO                       | Create Orders, Track Shipments         |
| Trader Verification      | Validate Vendors, Track Credentials    |
| Transporter Verification | Verify Partners, License Management    |
| Receiving                | Track Deliveries, Quantity Checks      |
| Master Items             | Manage Inventory, Specifications       |
| Settings                 | User Management, Permission Assignment |

## 🎨 UI Features

### Table Features

- **Search Functionality:** Search across multiple columns
- **Column Filtering:** Filter by specific fields
- **Sorting:** Click column headers to sort ascending/descending
- **Row Count:** View filtered vs total records
- **Status Badges:** Color-coded status indicators

### Sidebar Features

- **Collapsible Navigation:** Toggle sidebar width
- **User Profile:** Current user display with role
- **Permission-Based Menu:** Users see only assigned modules
- **Quick Logout:** One-click logout functionality
- **Responsive Design:** Mobile-friendly navigation

## 🛠️ Permissions System

Each user can have different permissions for these modules:

- Dashboard
- Indent
- Approval
- PO
- Trader Verification
- Transporter Verification
- Receiving
- Master Items
- Settings

### Admin Panel

Only Admin users can access the Settings page to:

1. Create new users
2. Edit user details
3. Assign module permissions
4. Change user roles
5. Delete user accounts

## 📊 Dummy Data

The system comes with comprehensive dummy data for all modules:

- 4 purchase orders with different statuses
- 5 indent requests with various departments
- 4 approval workflows
- 3 trader verification records
- 3 transporter verification records
- 3 receiving records
- 4 master item entries

## 🚀 Getting Started

### Installation

1. Install dependencies:

```bash
npm install
# or
pnpm install
```

2. Start the development server:

```bash
npm run dev
# or
pnpm dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Login

1. Use the default admin credentials:
   - Username: `admin`
   - Password: `admin123`

2. Or try other user accounts for different role experiences

## 📁 Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx
│   └── Table.jsx
├── context/
│   └── AuthContext.jsx
├── data/
│   └── dummyData.js
├── pages/
│   ├── Dashboard.jsx
│   ├── Indent.jsx
│   ├── Approval.jsx
│   ├── PurchaseOrder.jsx
│   ├── TraderVerification.jsx
│   ├── TransporterVerification.jsx
│   ├── Receiving.jsx
│   ├── MasterItem.jsx
│   └── Settings.jsx
├── styles/
│   ├── index.css
│   ├── Sidebar.css
│   ├── Table.css
│   ├── Dashboard.css
│   ├── Pages.css
│   └── Settings.css
├── App.jsx
└── main.jsx
```

## 🎨 Design System

### Color Palette

- Primary Blue: `#2563eb`
- Success Green: `#10b981`
- Warning Amber: `#f59e0b`
- Danger Red: `#ef4444`
- Light Background: `#f8fafc`

### Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## ✨ Key Features

1. **Real-time Filtering:** Filter data by multiple columns simultaneously
2. **Dynamic Search:** Search across searchable columns
3. **Smart Sorting:** Click any sortable column header to sort
4. **Permission-Based UI:** Sidebar shows only accessible modules
5. **User Management:** Comprehensive admin panel for user control
6. **Status Badges:** Color-coded status indicators for quick identification
7. **Responsive Design:** Works seamlessly on all device sizes

## 🔄 Workflow

### Typical Purchase Workflow

1. **Create Indent** → Request materials
2. **Submit for Approval** → Wait for approval
3. **Create PO** → Once approved
4. **Verify Trader** → Validate vendor
5. **Verify Transporter** → Confirm logistics
6. **Receive Goods** → Track delivery
7. **Update Master Items** → Update inventory

## 📝 Notes

- All data is stored in component state (context) and resets on page refresh
- To persist data, integrate with a backend API
- Admin can create custom roles with specific permission combinations
- Each module is designed to be independently functional

## 🚀 Future Enhancements

- Backend API integration for data persistence
- Email notifications for approvals
- PDF report generation
- Advanced analytics and dashboards
- Bulk operations support
- Audit logging
- Mobile app version

## 📧 Support

For issues or feature requests, please contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** May 2026  
**Built with:** React + Vite + CSS3
