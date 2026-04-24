import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { transactionsAPI } from '../api/api'
import { Link } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'

export default function BalanceSheet() {
    const { t } = useTranslation()
    const [sheet, setSheet] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)
    const printRef = useRef()

    useEffect(() => {
        transactionsAPI.getBalanceSheet()
            .then(res => setSheet(res.data))
            .finally(() => setLoading(false))
    }, [])

    const handlePrint = useReactToPrint({ content: () => printRef.current })
    const handleShare = () => navigator.share?.({ title: 'Balance Sheet - MOI VIBARAM' })
    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 {t('balanceSheet')}</h1>
                    <div className="page-subtitle">Person-wise Moi summary</div>
                </div>
                <div className="flex gap-8 no-print">
                    <button className="btn btn-secondary btn-sm" onClick={handleShare}>📤</button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️</button>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : sheet.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon">📊</div>
                    <div>{t('noData')}</div>
                </div>
            ) : (
                <div ref={printRef}>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t('partyName')}</th>
                                    <th>{t('mobile')}</th>
                                    <th>{t('location')}</th>
                                    <th>Total Received</th>
                                    <th>Total Paid</th>
                                    <th>{t('balance')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sheet.map((p, i) => (
                                    <React.Fragment key={i}>
                                        <tr
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSelected(selected === i ? null : i)}
                                        >
                                            <td className="text-muted">{i + 1}</td>
                                            <td>
                                                <Link 
                                                    to={`/person-detail?partyName=${encodeURIComponent(p.partyName)}&mobile=${p.mobile || ''}&spouseName=${encodeURIComponent(p.spouseName || '')}&location=${encodeURIComponent(p.location || '')}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                                    className="hover-underline"
                                                >
                                                    <strong style={{ color: 'var(--primary)' }}>{p.initial ? `${p.initial} ` : ''}{p.partyName}</strong>
                                                </Link>
                                                {p.spouseName && <span className="text-muted" style={{ display: 'block', fontSize: 11 }}>& {p.spouseName}</span>}
                                            </td>
                                            <td>{p.mobile || '—'}</td>
                                            <td>{p.location || '—'}</td>
                                            <td className="text-primary">{fmt(p.totalReceived)}</td>
                                            <td className="text-success">{fmt(p.totalPaid)}</td>
                                            <td style={{ fontWeight: 700 }}>
                                                <span className={p.balance >= 0 ? 'text-primary' : 'text-danger'}>
                                                    {p.balance >= 0 ? '+' : ''}{fmt(p.balance)}
                                                </span>
                                            </td>
                                        </tr>
                                        {/* Drill-down row */}
                                        {selected === i && (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 0 }}>
                                                    <div style={{ background: 'var(--glass)', padding: 16, borderBottom: '1px solid var(--border)' }}>
                                                        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Transaction History with {p.partyName}</div>
                                                        <table className="table" style={{ fontSize: 12 }}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Date</th>
                                                                    <th>Event</th>
                                                                    <th>Type</th>
                                                                    <th>Amount</th>
                                                                    <th>Remarks</th>
                                                                    <th>Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {p.transactions.map(tx => (
                                                                    <tr key={tx._id}>
                                                                        <td>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                                                         <td>{tx.eventId?.eventName || tx.eventName || '—'}</td>
                                                                        <td>
                                                                            <span className={`badge ${tx.type === 'received' ? 'badge-primary' : 'badge-success'}`}>
                                                                                {t(tx.type)}
                                                                            </span>
                                                                        </td>
                                                                        <td className="text-primary">{fmt(tx.cashAmount)}</td>
                                                                        <td className="text-muted">{tx.remarks || '—'}</td>
                                                                        <td>
                                                                            <Link to={`/transactions/edit/${tx._id}`} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}>
                                                                                ✏️ Edit
                                                                            </Link>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
