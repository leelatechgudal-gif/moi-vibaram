import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SEER_FIELDS = [
  { key: "dress", label: "Dress", icon: "👗" },
  { key: "thattuVarisai", label: "Thattu Varisai", icon: "🍽️" },
  { key: "jewels", label: "Jewels", icon: "💍" },
  { key: "marakkal", label: "Marakkal", icon: "🌾" },
  { key: "maalai", label: "Maalai", icon: "💐" },
  { key: "arisMootai", label: "Aris Mootai", icon: "🌾" },
  { key: "paathirangal", label: "Paathirangal", icon: "🥘" },
  { key: "others", label: "Others", icon: "📦" },
];

export default function SeerVarisaiHistory({ transactions, person }) {
  const { t } = useTranslation();
  const partyName = person?.name || person?.partyName || "Party";

  const seerTransactions = transactions.filter(tx => {
    return tx.seerVarisai && Object.values(tx.seerVarisai).some(v => v && (v.value > 0 || v.quantity > 0 || v.remarks));
  });

  if (seerTransactions.length === 0) return null;

  return (
    <div style={{ marginTop: '50px', breakBefore: 'page' }}>
      {/* Application Title for Printing */}
      <div style={{ textAlign: 'center', padding: '20px 0 10px 0' }}>
        <h1 style={{ margin: 0, color: 'var(--maroon)', fontSize: '28px', fontWeight: 800, letterSpacing: '2px' }}>MOI VIBARAM</h1>
        <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 500 }}>Seer Varisai Ledger</div>
      </div>

      <div className="table-wrap" style={{ border: '2px solid black', margin: '10px 0', padding: 0, borderRadius: 0, overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', border: 'none', margin: 0 }}>
          <thead>
            <tr>
              <th colSpan={5} style={{ textAlign: 'center', background: '#f0f0f0', borderBottom: '2px solid black', fontSize: 20, padding: 12, color: 'black' }}>
                Seer Varisai Balancing Sheet
              </th>
            </tr>
            <tr>
              <th style={{ border: '1px solid black', borderLeft: 'none', background: '#e0e0e0', textAlign: 'center', padding: 8, color: 'black', fontWeight: 'bold' }}>Name</th>
              <th colSpan={2} style={{ border: '1px solid black', background: '#fff', textAlign: 'center', padding: 8, color: 'black', fontWeight: 'bold' }}>{partyName}</th>
              <th style={{ border: '1px solid black', background: '#e0e0e0', textAlign: 'center', padding: 8, color: 'black', fontWeight: 'bold' }}>Spouse Name</th>
              <th style={{ border: '1px solid black', borderRight: 'none', background: '#fff', textAlign: 'center', padding: 8, color: 'black', fontWeight: 'bold' }}>{person?.spouseName || '—'}</th>
            </tr>
            <tr>
              <th style={{ border: '1px solid black', borderLeft: 'none', background: '#e0e0e0', padding: 8, textAlign: 'center', width: '100px', color: 'black', fontWeight: 'bold' }}>{t('date')}</th>
              <th style={{ border: '1px solid black', background: '#e0e0e0', padding: 8, textAlign: 'left', color: 'black', fontWeight: 'bold' }}>{t('eventName')}</th>
              <th style={{ border: '1px solid black', background: '#e0e0e0', padding: 8, textAlign: 'left', color: 'black', fontWeight: 'bold' }}>{t('giftColumn')}</th>
              <th style={{ border: '1px solid black', background: '#e0e0e0', padding: 8, textAlign: 'left', color: 'black', fontWeight: 'bold' }}>{t('valueLabel', { defaultValue: 'Value' })}</th>
              <th className="no-print" style={{ border: '1px solid black', borderRight: 'none', background: '#e0e0e0', padding: 8, textAlign: 'center', width: '80px', color: 'black', fontWeight: 'bold' }}>{t('edit')}</th>
            </tr>
          </thead>
          <tbody>
            {seerTransactions.map((tx) => (
              <tr key={tx._id}>
                <td style={{ border: '1px solid black', borderLeft: 'none', textAlign: 'center', padding: 8, color: 'black' }}>
                  {new Date(tx.date).toLocaleDateString("en-IN").replace(/\//g, '-')}
                </td>
                <td style={{ border: '1px solid black', padding: 8, color: 'black' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge ${tx.type === 'received' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '9px', padding: '2px 6px', textTransform: 'uppercase' }}>
                      {tx.type === 'received' ? t('received') : t('paid')}
                    </span>
                    <span>{tx.eventId?.eventName || tx.eventName || "—"}</span>
                  </div>
                </td>
                <td style={{ border: '1px solid black', padding: 8, color: 'black' }}>
                  {SEER_FIELDS.map(f => {
                    const item = tx.seerVarisai?.[f.key];
                    if (item && (parseFloat(item.quantity) > 0 || parseFloat(item.value) > 0 || (item.remarks && item.remarks.trim()))) {
                      const qty = parseFloat(item.quantity) || 0;
                      return (
                        <div key={f.key} style={{ margin: '4px 0', minHeight: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{f.icon}</span>
                          <span>{t(f.key)} {qty > 0 ? `- ${qty}` : ''}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </td>
                <td style={{ border: '1px solid black', padding: 8, color: 'black' }}>
                  {SEER_FIELDS.map(f => {
                    const item = tx.seerVarisai?.[f.key];
                    if (item && (parseFloat(item.quantity) > 0 || parseFloat(item.value) > 0 || (item.remarks && item.remarks.trim()))) {
                      const val = parseFloat(item.value) || 0;
                      return (
                        <div key={f.key} style={{ margin: '4px 0', minHeight: '18px', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                          {val > 0 ? `₹${val.toLocaleString('en-IN')}` : '—'}
                        </div>
                      );
                    }
                    return null;
                  })}
                </td>
                <td className="no-print" style={{ border: '1px solid black', borderRight: 'none', padding: 8, textAlign: 'center', verticalAlign: 'middle' }}>
                  <Link to={`/transactions/edit/${tx._id}`} className="auth-link">{t('edit')}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Branded Footer */}
      <div style={{ marginTop: '30px', padding: '20px 0', textAlign: 'center', borderTop: '1px solid #eee' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'black', marginBottom: '4px' }}>
          Powered by Leela Tech
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          &copy; {new Date().getFullYear()} Leela Tech. All rights reserved.
        </div>
      </div>
    </div>
  );
}
