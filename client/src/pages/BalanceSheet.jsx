import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { transactionsAPI } from '../api/api'
import { Link } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import { Scale, Share2, Printer, Edit2, ChevronDown, ChevronUp } from 'lucide-react'

export default function BalanceSheet() {
    const { t } = useTranslation()
    const [sheet, setSheet] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
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
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Scale size={28} /> {t('balanceSheet')}</h1>
                    <div className="page-subtitle">Person-wise Moi summary</div>
                </div>
                <div className="flex gap-8 no-print">
                    <button className="btn btn-secondary btn-sm" onClick={handleShare}><Share2 size={16} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={16} /></button>
                </div>
            </div>

            <div className="mb-16 no-print">
                <input
                    type="search"
                    className="form-control"
                    placeholder="Search by name, mobile, or location..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : sheet.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Scale size={48} strokeWidth={1} /></div>
                    <div>{t('noData')}</div>
                </div>
            ) : (() => {
                const filteredSheet = sheet.filter(p =>
                    p.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.mobile?.includes(searchQuery) ||
                    p.location?.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (filteredSheet.length === 0) {
                    return (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No records found matching your search.</div>
                    );
                }

                return (
                    <div ref={printRef}>
                        <div className="card table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name & Spouse name</th>
                                        <th>{t('mobile')}</th>
                                        <th>{t('location')}</th>
                                        <th>Paid</th>
                                        <th>Received</th>
                                        <th>{t('balance')}</th>
                                        <th className="no-print"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSheet.map((p, i) => (
                                        <React.Fragment key={p._id || i}>
                                            <tr>
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
                                                    {p.transactions.some(tx => tx.seerVarisai && Object.values(tx.seerVarisai).some(v => v && (v.value > 0 || v.quantity > 0 || v.remarks))) && (
                                                        <span style={{ marginLeft: 6 }} title="Gifts/Seer Varisai included in history">🎁</span>
                                                    )}
                                                    {p.spouseName && <span className="text-muted" style={{ display: 'block', fontSize: 11 }}>& {p.spouseName}</span>}
                                                </td>
                                                <td>{p.mobile || '—'}</td>
                                                <td>{p.location || '—'}</td>
                                                <td className="text-success">{fmt(p.totalPaid)}</td>
                                                <td className="text-primary">{fmt(p.totalReceived)}</td>
                                                <td style={{ fontWeight: 700 }}>
                                                    <span className={p.balance >= 0 ? 'text-primary' : 'text-danger'}>
                                                        {p.balance >= 0 ? '+' : ''}{fmt(p.balance)}
                                                    </span>
                                                </td>
                                                <td className="no-print">
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(selected === p._id ? null : p._id)}>
                                                        {selected === p._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Drill-down row */}
                                            {selected === p._id && (
                                                <tr>
                                                    <td colSpan={8} style={{ padding: 0 }}>
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
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {p.transactions.map(tx => (
                                                                        <tr key={tx._id}>
                                                                            <td>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                                                            <td>
                                                                                {tx.eventId?.eventName || tx.eventName || '—'}
                                                                                {tx.seerVarisai && Object.values(tx.seerVarisai).some(v => v && (v.value > 0 || v.quantity > 0 || v.remarks)) && (
                                                                                    <span style={{ marginLeft: 4 }} title="Gifts/Seer Varisai included">🎁</span>
                                                                                )}
                                                                            </td>
                                                                            <td>
                                                                                <span className={`badge ${tx.type === 'received' ? 'badge-primary' : 'badge-success'}`}>
                                                                                    {t(tx.type)}
                                                                                </span>
                                                                            </td>
                                                                            <td className="text-primary">{fmt(tx.cashAmount)}</td>
                                                                            <td className="text-muted">{tx.remarks || '—'}</td>
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
                );
            })()}
        </div>
    )
}
