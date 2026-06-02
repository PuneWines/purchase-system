import React from "react";

const POItemsTable = ({ partyName, items = [], isReceiver }) => {
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
          {isReceiver ? (
            <>
              <th className="po-text-center">Closing Stock in Bottle</th>
              <th className="po-text-center">Order Qty (Boxes)</th>
              <th className="po-text-center">Order Qty (Bottles)</th>
              <th className="po-text-center">Qty Type</th>
            </>
          ) : (
            <>
              <th className="po-text-center">Order Qty (Boxes)</th>
              <th className="po-text-center">Order Qty (Bottles)</th>
              <th className="po-text-center">Qty Type</th>
            </>
          )}
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
                
                {isReceiver ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <td className="po-text-center" style={item.qtyType === "Box" ? { fontWeight: '600' } : {}}>
                      {item.qtyType === "Box" ? item.displayQty : "—"}
                    </td>
                    <td className="po-text-center" style={item.qtyType === "Bottles" ? { fontWeight: '600' } : {}}>
                      {item.qtyType === "Bottles" ? item.displayQty : "—"}
                    </td>
                    <td className="po-text-center" style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {item.qtyType || "—"}
                    </td>
                  </>
                )}
              </tr>
            ))}
            
            {/* Aligned Total Row inside Table */}
            {orderQtyRows.length > 0 && (
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #94a3b8', backgroundColor: '#f8fafc' }}>
                <td colSpan={isReceiver ? 4 : 3} style={{ textAlign: 'right', padding: '10px 16px' }}><strong>Total:</strong></td>
                <td className="po-text-center" style={{ padding: '10px 16px', fontWeight: '700', color: '#1e1b4b' }}>{displayTotalBoxes}</td>
                <td className="po-text-center" style={{ padding: '10px 16px', fontWeight: '700', color: '#1e1b4b' }}>{displayTotalBottles}</td>
                <td className="po-text-center" style={{ padding: '10px 16px' }}></td>
              </tr>
            )}
          </>
        ) : (
          <tr>
            <td colSpan={isReceiver ? 7 : 6} className="po-text-center" style={{ padding: '24px', color: '#64748b', fontStyle: 'italic' }}>
              Please select a vendor above to view the items list.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default POItemsTable;
