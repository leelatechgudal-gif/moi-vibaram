import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { transactionsAPI } from '../api/api';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';

export default function PersonDetail() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    const partyName = searchParams.get('partyName');
    const mobile = searchParams.get('mobile');
    const spouseName = searchParams.get('spouseName');
    const location = searchParams.get('location');

    useEffect(() => {
        const params = {};
        if (partyName) params.partyName = partyName;
        if (mobile) params.mobile = mobile;
        if (spouseName) params.spouseName = spouseName;
        if (location) params.location = location;

        transactionsAPI.getPersonDetail(params)
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [partyName, mobile, spouseName, location]);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`;

    if (loading) return <div className="flex-center" style={{ height: '80vh' }}><span className="spinner" /></div>;
    if (!data) return <div className="container">Person not found</div>;

    const { person, transactions, totalReceived, totalPaid, balance } = data;

    return (
        <div className="container">
            <div className="page-header no-print">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← {t('back')}</button>
                    <div>
                        <h1 className="page-title">{person.partyName}</h1>
                        <div className="page-subtitle">Transaction history & balance</div>
                    </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ {t('print')}</button>
            </div>

            <div ref={printRef} className="print-container">
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="form-grid">
                        <div>
                            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>NAME</div>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>{person.partyName} {person.initial ? `(${person.initial})` : ''}</div>
                            {person.spouseName && <div className="text-muted" style={{ fontSize: 14 }}>& {person.spouseName}</div>}
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>CONTACT & LOCATION</div>
                            <div style={{ fontWeight: 600 }}>{person.mobile || '—'}</div>
                            <div className="text-muted">{person.location || '—'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>TOTAL LIABILITY</div>
                            <div style={{ 
                                fontWeight: 800, 
                                fontSize: 24, 
                                color: balance > 0 ? 'var(--danger)' : balance < 0 ? 'var(--success)' : 'var(--text-muted)' 
                            }}>
                                {fmt(Math.abs(balance))}
                                <span style={{ fontSize: 14, marginLeft: 6, fontWeight: 500 }}>
                                    {balance > 0 ? '(You owe them)' : balance < 0 ? '(They owe you)' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="divider" style={{ margin: '20px 0' }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="stat-card" style={{ background: 'rgba(52, 211, 153, 0.05)', borderColor: 'rgba(52, 211, 153, 0.2)' }}>
                            <div className="stat-label" style={{ color: 'var(--success)' }}>📥 Total Received</div>
                            <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalReceived)}</div>
                        </div>
                        <div className="stat-card" style={{ background: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                            <div className="stat-label" style={{ color: 'var(--primary)' }}>💸 Total Paid (Invested)</div>
                            <div className="stat-value" style={{ fontSize: 20 }}>{fmt(totalPaid)}</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Transaction History</h3>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Event</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th className="no-print">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx._id}>
                                        <td>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{tx.eventId?.eventName || tx.eventName || '—'}</div>
                                            <div className="text-muted" style={{ fontSize: 11 }}>{tx.remarks}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${tx.type === 'received' ? 'badge-primary' : 'badge-success'}`}>
                                                {t(tx.type)}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: tx.type === 'received' ? 'var(--primary)' : 'var(--success)' }}>
                                            {tx.type === 'received' ? '+' : '-'}{fmt(tx.cashAmount)}
                                        </td>
                                        <td className="no-print">
                                            <Link to={`/transactions/edit/${tx._id}`} className="auth-link">Edit</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
