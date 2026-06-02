import React from "react";
import { ShoppingBag } from "lucide-react";

const POHeader = ({ companyInfo, poNumber, poDate, copyType }) => {
  return (
    <div className="po-header-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderBottom: 'none', paddingBottom: 0 }}>
      {/* Centered Shop Name */}
      <div className="po-logo-block" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div className="po-company-info" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.85rem', margin: 0, fontWeight: 800, color: '#1e293b', letterSpacing: '0.5px' }}>
            {companyInfo?.name || "—"}
          </h1>
        </div>
      </div>

      {/* Dividers & Details Row */}
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '3px solid var(--color-primary)', paddingTop: '12px', marginTop: '4px' }}>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Purchase Order
          </h2>
          {copyType && (
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {copyType}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <table className="po-meta-table" style={{ margin: 0, display: 'inline-table' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>PO No:</td>
                <td style={{ padding: '2px 0', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{poNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>PO Date:</td>
                <td style={{ padding: '2px 0', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{poDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default POHeader;
