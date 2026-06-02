import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#334155",
    backgroundColor: "#ffffff",
  },
  headerArea: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  logoBlock: {
    alignItems: "center",
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 2,
    borderTopColor: "#0052cc",
    paddingTop: 10,
    marginTop: 4,
    width: "100%",
  },
  detailsLeft: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  detailsRight: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0052cc",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  copyType: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaTable: {
    width: 120,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1,
  },
  metaLabel: {
    color: "#64748b",
    fontSize: 8,
  },
  metaValue: {
    color: "#1e293b",
    fontWeight: "bold",
    fontSize: 8,
  },
  boxesRow: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 16,
  },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  boxHeader: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: "bold",
    fontSize: 9,
    color: "#1e293b",
    textTransform: "uppercase",
  },
  boxBody: {
    padding: 10,
    lineHeight: 1.4,
    fontSize: 8,
  },
  boxFieldRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  boxFieldLabel: {
    width: 80,
    fontWeight: "bold",
    color: "#64748b",
  },
  boxFieldValue: {
    flex: 1,
    color: "#1e293b",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeaderCell: {
    padding: 6,
    color: "#172b4d",
    fontWeight: "bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowAlternate: {
    flexDirection: "row",
    backgroundColor: "#fafbfc",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableCell: {
    padding: 6,
    fontSize: 8,
    color: "#172b4d",
  },
  tableCellBold: {
    fontWeight: "bold",
  },
  tableTotalRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderTopWidth: 2,
    borderTopColor: "#94a3b8",
  },
  tableTotalCell: {
    padding: 8,
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e1b4b",
  },
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 20,
  },
  termsBlock: {
    flex: 1,
    paddingRight: 30,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e293b",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  termsList: {
    lineHeight: 1.4,
    fontSize: 7.5,
    color: "#64748b",
  },
  termsItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  termsNumber: {
    width: 12,
  },
  termsText: {
    flex: 1,
  },
  signatureBlock: {
    width: 180,
    alignItems: "center",
  },
  signatureBody: {
    width: "100%",
    height: 45,
    borderBottomWidth: 1,
    borderBottomColor: "#172b4d",
    marginBottom: 6,
  },
  signatureHeader: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#172b4d",
  },
  signatureSub: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 2,
  },
  colSNo: { width: "8%", textAlign: "center" },
  colShopName: { width: "22%" },
  colItemName: { width: "40%" },
  colBoxes: { width: "15%", textAlign: "center" },
  colBottles: { width: "15%", textAlign: "center" },
});

const TraderPDF = ({
  partyName,
  items = [],
  poNumber,
  poDate,
  vendorDetails,
  companyInfo
}) => {
  const totalBoxes = items
    .filter((r) => r.qtyType === "Box")
    .reduce((s, r) => s + (r.orderBox || 0), 0);

  const totalBottles = items
    .filter((r) => r.qtyType === "Bottles")
    .reduce((s, r) => s + (r.orderQty || 0), 0);

  const displayTotalBoxes = totalBoxes % 1 === 0 ? totalBoxes.toString() : totalBoxes.toFixed(2);
  const displayTotalBottles = Math.ceil(totalBottles).toLocaleString("en-IN");

  const termsToDisplay = vendorDetails?.terms || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.headerArea}>
          <View style={styles.logoBlock}>
            <Text style={styles.companyName}>{companyInfo?.name || "DRINQKART"}</Text>
          </View>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailsLeft}>
              <Text style={styles.title}>Purchase Order</Text>
              <Text style={styles.copyType}>Original for Trader / Transporter</Text>
            </View>
            <View style={styles.detailsRight}>
              <View style={styles.metaTable}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>PO No:</Text>
                  <Text style={styles.metaValue}>{poNumber}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>PO Date:</Text>
                  <Text style={styles.metaValue}>{poDate}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Vendor & Ship To Columns */}
        <View style={styles.boxesRow}>
          {/* Vendor Details */}
          <View style={styles.box}>
            <Text style={styles.boxHeader}>Vendor</Text>
            <View style={styles.boxBody}>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Party Name:</Text>
                <Text style={[styles.boxFieldValue, { fontWeight: "bold" }]}>{partyName || "—"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Address:</Text>
                <Text style={styles.boxFieldValue}>{vendorDetails?.address || "—"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>GSTIN:</Text>
                <Text style={styles.boxFieldValue}>{vendorDetails?.gstin || "—"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Contact Name:</Text>
                <Text style={styles.boxFieldValue}>{vendorDetails?.contact_name || "—"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Contact:</Text>
                <Text style={styles.boxFieldValue}>{vendorDetails?.contact || "—"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Email:</Text>
                <Text style={styles.boxFieldValue}>{vendorDetails?.email || "—"}</Text>
              </View>
            </View>
          </View>

          {/* Ship To Details */}
          <View style={styles.box}>
            <Text style={styles.boxHeader}>Ship To:</Text>
            <View style={styles.boxBody}>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Company Name:</Text>
                <Text style={[styles.boxFieldValue, { fontWeight: "bold" }]}>{companyInfo?.name || "DRINQKART"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Address:</Text>
                <Text style={styles.boxFieldValue}>{companyInfo?.address || "—"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>GSTIN:</Text>
                <Text style={styles.boxFieldValue}>{companyInfo?.gstin || "—"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Contact:</Text>
                <Text style={styles.boxFieldValue}>{companyInfo?.contact || "—"}</Text>
              </View>
              <View style={styles.boxFieldRow}>
                <Text style={styles.boxFieldLabel}>Email:</Text>
                <Text style={styles.boxFieldValue}>{companyInfo?.email || "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colSNo]}>S.No</Text>
            <Text style={[styles.tableHeaderCell, styles.colShopName]}>Shop Name</Text>
            <Text style={[styles.tableHeaderCell, styles.colItemName]}>Item Name</Text>
            <Text style={[styles.tableHeaderCell, styles.colBoxes]}>Order Qty (Boxes)</Text>
            <Text style={[styles.tableHeaderCell, styles.colBottles]}>Order Qty (Bottles)</Text>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => {
            const isAlternate = index % 2 !== 0;
            const rowStyle = isAlternate ? styles.tableRowAlternate : styles.tableRow;
            return (
              <View key={item.id || index} style={rowStyle}>
                <Text style={[styles.tableCell, styles.colSNo]}>{index + 1}</Text>
                <Text style={[styles.tableCell, styles.colShopName, styles.tableCellBold]}>
                  {item.shopName || "—"}
                </Text>
                <Text style={[styles.tableCell, styles.colItemName, styles.tableCellBold]}>
                  {item.itemName || "—"}
                </Text>
                <Text style={[styles.tableCell, styles.colBoxes, item.qtyType === "Box" ? styles.tableCellBold : {}]}>
                  {item.qtyType === "Box" ? item.displayQty : "—"}
                </Text>
                <Text style={[styles.tableCell, styles.colBottles, item.qtyType === "Bottles" ? styles.tableCellBold : {}]}>
                  {item.qtyType === "Bottles" ? item.displayQty : "—"}
                </Text>
              </View>
            );
          })}

          {/* Totals Row */}
          {items.length > 0 && (
            <View style={styles.tableTotalRow}>
              <Text style={[styles.tableTotalCell, { width: "70%", textAlign: "right" }]}>Total:</Text>
              <Text style={[styles.tableTotalCell, styles.colBoxes]}>{displayTotalBoxes}</Text>
              <Text style={[styles.tableTotalCell, styles.colBottles]}>{displayTotalBottles}</Text>
            </View>
          )}
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          {/* Terms Block */}
          {termsToDisplay && termsToDisplay.length > 0 && (
            <View style={styles.termsBlock}>
              <Text style={styles.termsTitle}>Terms and conditions:</Text>
              <View style={styles.termsList}>
                {termsToDisplay.map((t, idx) => (
                  <View key={idx} style={styles.termsItem}>
                    <Text style={styles.termsNumber}>{idx + 1}.</Text>
                    <Text style={styles.termsText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Signature Block */}
          <View style={styles.signatureBlock}>
            <View style={styles.signatureBody} />
            <Text style={styles.signatureHeader}>For {companyInfo?.name || "DRINQKART"}</Text>
            <Text style={styles.signatureSub}>Authorized signatory</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default TraderPDF;
