import React from "react";
import "../styles/Dashboard.css";

const Dashboard = () => {
  return (
    <div className="page-container">
      <h1>Dashboard</h1>
      <p className="page-description">
        Overview of your purchase management system
      </p>

      <div className="dashboard-summary" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Dashboard metrics will be populated here.
      </div>
    </div>
  );
};

export default Dashboard;
