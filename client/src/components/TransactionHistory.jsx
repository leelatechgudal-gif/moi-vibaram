import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

export default function TransactionHistory({ transactions, type, person, user, totalPaid, totalReceived, balance, onDelete }) {
  const { t } = useTranslation();
  const fmt = (n) => `${(n || 0)}`;
  const userName = user?.name || "Me";
  const partyName = person?.name || person?.partyName || "Party";

  return (
    <div className="card" style={{ padding: '0', background: '#fff', border: 'none', boxShadow: 'none' }}>
      {/* Application Title for Printing */}
      <div style={{ textAlign: 'center', padding: '20px 0 10px 0' }}>
        <h1 style={{ margin: 0, color: 'var(--maroon)', fontSize: '28px', fontWeight: 800, letterSpacing: '2px' }}>MOI VIBARAM</h1>
        <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 500 }}>Traditional Digital Ledger</div>
      </div>

      {/* Top Person Details Section */}
      {person && (
        <div style={{ margin: '10px 0', padding: '16px', border: '2px solid black', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '12px 32px' }}>
          <div style={{ width: '100%', borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 4, fontWeight: 'bold', fontSize: 18, color: 'black' }}>
            Customer Details
          </div>
          {(person.name || person.partyName) && (
            <div style={{ minWidth: 'calc(50% - 32px)' }}><span style={{ color: '#555', fontWeight: 'bold', display: 'inline-block', width: 120 }}>Name:</span> <span style={{ fontWeight: 'bold', color: 'black', fontSize: 16 }}>{person.name || person.partyName}</span></div>
          )}
          {person.spouseName && (
            <div style={{ minWidth: 'calc(50% - 32px)' }}><span style={{ color: '#555', fontWeight: 'bold', display: 'inline-block', width: 120 }}>Spouse Name:</span> <span style={{ fontWeight: 'bold', color: 'black', fontSize: 16 }}>{person.spouseName}</span></div>
          )}
          {person.mobile && (
            <div style={{ minWidth: 'calc(50% - 32px)' }}><span style={{ color: '#555', fontWeight: 'bold', display: 'inline-block', width: 120 }}>Phone Number:</span> <span style={{ fontWeight: 'bold', color: 'black', fontSize: 16 }}>{person.mobile}</span></div>
          )}
          {person.location && (
            <div style={{ minWidth: 'calc(50% - 32px)' }}><span style={{ color: '#555', fontWeight: 'bold', display: 'inline-block', width: 120 }}>Location:</span> <span style={{ fontWeight: 'bold', color: 'black', fontSize: 16 }}>{person.location}</span></div>
          )}
          {person.fatherName && (
            <div style={{ minWidth: 'calc(50% - 32px)' }}><span style={{ color: '#555', fontWeight: 'bold', display: 'inline-block', width: 120 }}>Father Name:</span> <span style={{ fontWeight: 'bold', color: 'black', fontSize: 16 }}>{person.fatherName}</span></div>
          )}
          {person.motherName && (
            <div style={{ minWidth: 'calc(50% - 32px)' }}><span style={{ color: '#555', fontWeight: 'bold', display: 'inline-block', width: 120 }}>Mother Name:</span> <span style={{ fontWeight: 'bold', color: 'black', fontSize: 16 }}>{person.motherName}</span></div>
          )}
        </div>
      )}

      <div className="table-wrap" style={{ border: '2px solid black', margin: '10px 0', padding: 0, borderRadius: 0, overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', border: 'none', margin: 0 }}>
          <thead>
            <tr>
              <th colSpan={5} style={{ textAlign: 'center', background: '#f0f0f0', borderBottom: '2px solid black', fontSize: 20, padding: 12, color: 'black' }}>
                Moi Balancing Sheet
              </th>
              <th className="no-print" style={{ borderBottom: '2px solid black', background: '#f0f0f0' }}></th>
            </tr>
            <tr>
              <th style={{ border: '1px solid black', borderLeft: 'none', background: '#e0e0e0', textAlign: 'center', padding: 8, color: 'black', fontWeight: 'bold' }}>Name</th>
              <th colSpan={2} style={{ border: '1px solid black', background: '#fff', textAlign: 'center', padding: 8, color: 'black', fontWeight: 'bold' }}>{partyName}</th>
              <th style={{ border: '1px solid black', background: '#e0e0e0', textAlign: 'center', padding: 8, color: 'black', fontWeight: 'bold' }}>Spouse Name</th>
              <th style={{ border: '1px solid black', borderRight: 'none', background: '#fff', textAlign: 'center', padding: 8, color: 'black', fontWeight: 'bold' }}>{person?.spouseName || '—'}</th>
              <th className="no-print" style={{ border: '1px solid black', borderRight: 'none', background: '#fff' }}></th>
            </tr>
            <tr>
              <th style={{ border: '1px solid black', borderLeft: 'none', background: '#e0e0e0', padding: 8, textAlign: 'center', width: '60px', color: 'black', fontWeight: 'bold' }}>S.No</th>
              <th style={{ border: '1px solid black', background: '#e0e0e0', padding: 8, textAlign: 'center', width: '120px', color: 'black', fontWeight: 'bold' }}>Date</th>
              <th style={{ border: '1px solid black', background: '#e0e0e0', padding: 8, textAlign: 'left', color: 'black', fontWeight: 'bold' }}>Function Name</th>
              <th style={{ border: '1px solid black', background: '#e0e0e0', padding: 8, textAlign: 'center', width: '120px', color: 'black', fontWeight: 'bold' }}>Moi Paid</th>
              <th style={{ border: '1px solid black', borderRight: 'none', background: '#e0e0e0', padding: 8, textAlign: 'center', width: '120px', color: 'black', fontWeight: 'bold' }}>Moi Received</th>
              <th className="no-print" style={{ border: '1px solid black', borderRight: 'none', background: '#e0e0e0', padding: 8, textAlign: 'center', color: 'black', fontWeight: 'bold' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr key={tx._id}>
                <td style={{ border: '1px solid black', borderLeft: 'none', textAlign: 'center', padding: 8, color: 'black' }}>{index + 1}</td>
                <td style={{ border: '1px solid black', textAlign: 'center', padding: 8, color: 'black' }}>
                  {new Date(tx.date).toLocaleDateString("en-IN").replace(/\//g, '-')}
                </td>
                <td style={{ border: '1px solid black', padding: 8, color: 'black' }}>
                  {tx.eventId?.eventName || tx.eventName || "—"}
                  {tx.seerVarisai && Object.values(tx.seerVarisai).some(v => v && (v.value > 0 || v.quantity > 0 || v.remarks)) && (
                    <span style={{ marginLeft: 8, color: 'var(--maroon)' }} title="Gifts/Seer Varisai Included">
                      🎁
                    </span>
                  )}
                  {tx.remarks && <span style={{ fontSize: 11, color: '#666', marginLeft: 8 }}>({tx.remarks})</span>}
                </td>
                <td style={{ border: '1px solid black', textAlign: 'center', padding: 8, color: 'black' }}>
                  {tx.type === "paid" ? fmt(tx.cashAmount) : "0"}
                </td>
                <td style={{ border: '1px solid black', borderRight: 'none', textAlign: 'center', padding: 8, color: 'black' }}>
                  {tx.type === "received" ? fmt(tx.cashAmount) : "0"}
                </td>
                <td className="no-print" style={{ border: '1px solid black', borderRight: 'none', padding: 8 }}>
                  <div style={{ display: "flex", gap: "8px", justifyContent: 'center' }}>
                    <Link to={`/transactions/edit/${tx._id}`} className="auth-link">Edit</Link>
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this transaction?")) {
                          onDelete && onDelete(tx._id);
                        }
                      }}
                      className="auth-link"
                      style={{ color: "var(--danger)", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit", fontFamily: "inherit" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Total Row */}
            <tr style={{ background: '#e0e0e0', fontWeight: 'bold' }}>
              <td colSpan={3} style={{ border: '1px solid black', borderLeft: 'none', textAlign: 'center', padding: 8, color: 'black' }}>Total Value</td>
              <td style={{ border: '1px solid black', textAlign: 'center', padding: 8, color: 'black' }}>{fmt(totalPaid)}</td>
              <td style={{ border: '1px solid black', borderRight: 'none', textAlign: 'center', padding: 8, color: 'black' }}>{fmt(totalReceived)}</td>
              <td className="no-print" style={{ border: '1px solid black', borderRight: 'none' }}></td>
            </tr>
          </tbody>
        </table>

        {/* Summary Table directly below, like in the image */}
        <div style={{ padding: '20px' }}>
          <table style={{ width: '100%', maxWidth: '600px', borderCollapse: 'collapse', border: '2px solid black', margin: '0 auto' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', width: '70%', color: 'black' }}>
                  Total Moi Paid By {userName}
                </td>
                <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontWeight: 'bold', width: '30%', color: 'black' }}>
                  {fmt(totalPaid)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black' }}>
                  Total Moi Received from {partyName}
                </td>
                <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: 'black' }}>
                  {fmt(totalReceived)}
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black' }}>
                  Balance To be paid to {balance < 0 ? userName : partyName}
                </td>
                <td style={{ border: '1px solid black', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: balance < 0 ? 'red' : 'green' }}>
                  {fmt(Math.abs(balance))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="no-print" style={{ padding: '0 20px 20px 20px', textAlign: 'center' }}>
          <Link
            to="/transactions/new"
            state={{ type, fixedType: true }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} style={{ marginRight: 4 }} /> Create Moi ({type === "paid" ? "I paid" : "I have received"})
          </Link>
        </div>

        {/* Branded Footer */}
        <div style={{ marginTop: '30px', padding: '20px 0', textAlign: 'center', borderTop: '1px solid #eee' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'black', marginBottom: '4px' }}>
            Powered by Leela Tech
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            &copy; {new Date().getFullYear()} Leela Tech. All rights reserved.
          </div>
          <div style={{ fontSize: '10px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>
            Generated via Moi Vibaram - Modern Ledger for Traditional Celebrations
          </div>
        </div>
      </div>
    </div>
  );
}
