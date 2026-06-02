export const transformActivePartyItems = (filteredApprovedItems, activeParty) => {
  if (!activeParty) return [];
  return filteredApprovedItems
    .filter(item => item.party_name === activeParty)
    .map(row => {
      const orderBox = row.order_box !== null ? parseFloat(row.order_box) : 0;
      const orderQty = row.order_qty !== null ? parseFloat(row.order_qty) : 0;
      const bcs = row.bcs !== null ? parseFloat(row.bcs) : null;

      const qtyType = orderBox >= 0.90 ? "Box" : "Bottles";
      const displayQty = qtyType === "Box" 
        ? Math.round(orderBox).toString() 
        : Math.ceil(orderQty).toString();

      return {
        ...row,
        itemName: row.item_name,
        brandName: row.brand_name,
        liquorType: row.liquor_type,
        closingQty: row.closing_qty,
        bcs,
        orderQty,
        orderBox,
        qtyType,
        displayQty,
        shopName: row.shop_name
      };
    })
    .filter(row => row.orderQty > 0);
};

export const calculateTotals = (items) => {
  const totalBoxes = items
    .filter(r => r.qtyType === "Box")
    .reduce((s, r) => s + (r.orderBox || 0), 0);

  const totalBottles = items
    .filter(r => r.qtyType === "Bottles")
    .reduce((s, r) => s + (r.orderQty || 0), 0);

  const displayTotalBoxes = totalBoxes % 1 === 0 ? totalBoxes.toString() : totalBoxes.toFixed(2);
  const displayTotalBottles = Math.ceil(totalBottles).toLocaleString("en-IN");

  return {
    totalBoxes,
    totalBottles,
    displayTotalBoxes,
    displayTotalBottles
  };
};
