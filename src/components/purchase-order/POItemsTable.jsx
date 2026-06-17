import React from "react";
import { Trash2 } from "lucide-react";

const POItemsTable = ({ partyName, items = [], isReceiver, onRemoveItem }) => {
  const orderQtyRows = items;

  const totalBoxes = orderQtyRows
    .filter(r => r.qtyType === "Box")
    .reduce((s, r) => s + (r.orderBox || 0), 0);

  const totalBottles = orderQtyRows
    .filter(r => r.qtyType === "Bottles")
    .reduce((s, r) => s + (r.orderQty || 0), 0);

  const displayTotalBoxes = totalBoxes % 1 === 0 ? totalBoxes.toString() : totalBoxes.toFixed(2);
  const displayTotalBottles = Math.ceil(totalBottles).toLocaleString("en-IN");

  return (
    <table className="po-items-table">
      <thead>
        <tr>
          <th className="po-text-center">S.No</th>
          <th>Shop Name</th>
          <th>Item Name</th>
          <th className="po-text-center">Closing Stock in Bottle</th>
          <th className="po-text-center">Order Qty (Boxes)</th>
          <th className="po-text-center">Order Qty (Bottles)</th>
          <th className="po-text-center">Qty Type</th>
          {!isReceiver && onRemoveItem && <th className="po-text-center">Action</th>}
        </tr>
      </thead>
      <tbody>
        {partyName ? (
          <>
            {orderQtyRows.map((item, i) => (
              <tr key={item.id || i}>
                <td className="po-text-center">{i + 1}</td>
                <td><strong>{item.shopName || "—"}</strong></td>
                <td><strong>{item.itemName || "—"}</strong></td>
                <td className="po-text-center">
                  {item.closingQty != null ? item.closingQty : "—"}
                </td>
                <td className="po-text-center" style={item.qtyType === "Box" ? { fontWeight: '600' } : {}}>
                  {item.qtyType === "Box" ? item.displayQty : "—"}
                </td>
                <td className="po-text-center" style={item.qtyType === "Bottles" ? { fontWeight: '600' } : {}}>
                  {item.qtyType === "Bottles" ? item.displayQty : "—"}
                </td>
                <td className="po-text-center" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  {item.qtyType || "—"}
                </td>
                {!isReceiver && onRemoveItem && (
                  <td className="po-text-center">
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="po-item-delete-btn"
                      title="Remove item"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            
            {/* Aligned Total Row inside Table */}
            {orderQtyRows.length > 0 && (
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #94a3b8', backgroundColor: '#f8fafc' }}>
                <td colSpan={4} style={{ textAlign: 'right', padding: '10px 16px' }}><strong>Total:</strong></td>
                <td className="po-text-center" style={{ padding: '10px 16px', fontWeight: '700', color: '#1e1b4b' }}>{displayTotalBoxes}</td>
                <td className="po-text-center" style={{ padding: '10px 16px', fontWeight: '700', color: '#1e1b4b' }}>{displayTotalBottles}</td>
                <td className="po-text-center" style={{ padding: '10px 16px' }}></td>
                {!isReceiver && onRemoveItem && <td className="po-text-center" style={{ padding: '10px 16px' }}></td>}
              </tr>
            )}
          </>
        ) : (
          <tr>
            <td colSpan={!isReceiver && onRemoveItem ? 8 : 7} className="po-text-center" style={{ padding: '24px', color: '#64748b', fontStyle: 'italic' }}>
              Please select a vendor above to view the items list.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default POItemsTable;
