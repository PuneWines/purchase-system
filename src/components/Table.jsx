import React, { useState, useMemo } from "react";
import "../styles/Table.css";

const Table = ({ data, columns, title, searchableColumns = [], showHeader = true }) => {
  const [filters, setFilters] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState(null);

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm) {
      result = result.filter((row) => {
        return searchableColumns.some((col) => {
          const value = row[col]?.toString().toLowerCase();
          return value?.includes(searchTerm.toLowerCase());
        });
      });
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter((row) => {
          const cellValue = row[key]?.toString().toLowerCase();
          return cellValue?.includes(value.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, searchTerm, sortConfig, searchableColumns]);

  const handleSort = (columnKey) => {
    if (sortConfig?.key === columnKey) {
      setSortConfig({
        key: columnKey,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSortConfig({ key: columnKey, direction: "asc" });
    }
  };

  const handleFilterChange = (columnKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
    setSortConfig(null);
  };

  return (
    <div className="table-container">
      {showHeader && (
        <div className="table-header">
          <h2>{title}</h2>
          <div className="table-controls">
            {searchableColumns.length > 0 && (
              <input
                type="text"
                placeholder="Search..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            )}
            {(searchTerm || Object.values(filters).some((v) => v)) && (
              <button className="clear-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
            <span className="row-count">
              {filteredData.length} of {data.length} rows
            </span>
          </div>
        </div>
      )}

      <div className="filters-row">
        {columns.map(
          (col) =>
            col.filterable && (
              <div key={col.key} className="filter-item">
                <label>{col.label}</label>
                <input
                  type="text"
                  placeholder={`Filter by ${col.label}...`}
                  value={filters[col.key] || ""}
                  onChange={(e) => handleFilterChange(col.key, e.target.value)}
                  className="filter-input"
                />
              </div>
            ),
        )}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={col.sortable ? "sortable" : ""}
                >
                  <div className="header-content">
                    {col.label}
                    {col.sortable && sortConfig?.key === col.key && (
                      <span className="sort-indicator">
                        {sortConfig.direction === "asc" ? " ▲" : " ▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, idx) => (
                <tr key={idx} className="table-row">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`status-${row[col.key]}`.toLowerCase()}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty-message">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
