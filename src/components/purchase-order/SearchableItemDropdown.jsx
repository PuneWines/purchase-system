import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

const SearchableItemDropdown = ({ items = [], value = "", onChange, placeholder = "Search and select item..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Sync initial text search when an item is pre-selected/changed externally
  useEffect(() => {
    if (value) {
      setSearchTerm(value);
    } else {
      setSearchTerm("");
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        // If clicked outside without selecting, revert searchTerm to value
        setSearchTerm(value || "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Filter items. If search is empty, show all items. If search has text, filter and show all matches.
  const filteredItems = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }
    const cleanSearch = searchTerm.toLowerCase();
    return items.filter((item) => (item.item_name || "").toLowerCase().includes(cleanSearch));
  }, [items, searchTerm]);

  const handleSelect = (item) => {
    onChange(item);
    setSearchTerm(item.item_name);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (!isOpen) setIsOpen(true);
    if (!val.trim()) {
      onChange(null);
    } else {
      onChange({ item_name: val, isCustom: true });
    }
  };

  return (
    <div
      className="searchable-dropdown"
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "inline-block",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "8px 36px 8px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            color: "#334155",
            transition: "all 0.2s ease",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "#6366f1";
            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.2)";
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {searchTerm ? (
          <button
            onClick={handleClear}
            style={{
              position: "absolute",
              right: "30px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            type="button"
          >
            <X size={14} />
          </button>
        ) : null}
        <ChevronDown
          size={16}
          color="#64748b"
          style={{
            position: "absolute",
            right: "10px",
            pointerEvents: "none",
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
            zIndex: 9999,
            maxHeight: "280px",
            overflowY: "auto",
            padding: "6px 0",
            animation: "slideDownFade 0.2s ease-out",
          }}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isSelected = value === item.item_name;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: isSelected ? "#f5f3ff" : "transparent",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, paddingRight: "8px" }}>
                    <span
                      style={{
                        fontWeight: isSelected ? 600 : 500,
                        fontSize: "13px",
                        color: isSelected ? "#4f46e5" : "#334155",
                      }}
                    >
                      {item.item_name}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: isSelected ? "#818cf8" : "#94a3b8",
                      }}
                    >
                      Case Size: <strong style={{ fontWeight: 600 }}>{item["bc_s"] ?? "—"}</strong> bottles • Size: <strong style={{ fontWeight: 600 }}>{item.ml_s ?? "—"} ml</strong>
                    </span>
                  </div>
                  {isSelected && <Check size={14} color="#4f46e5" style={{ minWidth: "14px", marginLeft: "8px" }} />}
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: "16px",
                fontSize: "13px",
                color: "#94a3b8",
                textAlign: "center",
              }}
            >
              No items match your search
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableItemDropdown;
