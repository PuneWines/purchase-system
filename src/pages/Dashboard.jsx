import React from "react";
import Table from "../components/Table";
import { dashboardData } from "../data/dummyData";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const columns = [
    { key: "metric", label: "Metric", sortable: true, filterable: true },
    { key: "value", label: "Value", sortable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (status) => (
        <span className={`status-badge status-${status.toLowerCase()}`}>
          {status === "up" ? "📈" : "📉"}{" "}
          {status === "up" ? "Increase" : "Decrease"}
        </span>
      ),
    },
    {
      key: "change",
      label: "Change",
      sortable: true,
      render: (change) => (
        <span className={change.includes("+") ? "positive" : "negative"}>
          {change}
        </span>
      ),
    },
  ];

  return (
    <div className="page-container">
      <h1>Dashboard</h1>
      <p className="page-description">
        Overview of your purchase management system
      </p>

      <div className="dashboard-summary">
        {dashboardData.map((item) => (
          <div key={item.id} className="summary-card">
            <div className="card-value">{item.value}</div>
            <div className="card-label">{item.metric}</div>
            <div className={`card-change ${item.status}`}>{item.change}</div>
          </div>
        ))}
      </div>

      <Table
        data={dashboardData}
        columns={columns}
        title="Dashboard Metrics"
        searchableColumns={["metric"]}
      />
    </div>
  );
};

export default Dashboard;
