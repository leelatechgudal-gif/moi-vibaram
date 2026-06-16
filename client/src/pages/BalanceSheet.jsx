import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { transactionsAPI } from '../api/api'
import { Link } from 'react-router-dom'
import { printElement } from '../utils/print'
import useSort from '../hooks/useSort'
import { Scale, Share2, Printer, Edit2, ChevronDown, ChevronUp } from 'lucide-react'

export default function BalanceSheet() {
    const { t } = useTranslation()
    const [sheet, setSheet] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const printRef = useRef()
    const {
        sortField,
        sortOrder,
        setSortField,
        setSortOrder,
        handleSort,
        renderSortIcon,
        getSortedItems
    } = useSort('partyName', 'asc')

    useEffect(() => {
        transactionsAPI.getBalanceSheet()
            .then(res => setSheet(res.data))
            .finally(() => setLoading(false))
    }, [])

    const handlePrint = () => {
        if (printRef.current) {
            printElement(printRef.current)
        }
    }
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
                
                {/* Mobile Sort UI */}
                <div className="show-mobile" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort by:</span>
                        <select 
                            className="form-control" 
                            style={{ flex: 1, height: 38 }} 
                            value={sortField} 
                            onChange={e => {
                                setSortField(e.target.value);
                                setSortOrder('asc');
                            }}
                        >
                            <option value="partyName">Name</option>
                            <option value="mobile">{t('mobile')}</option>
                            <option value="location">{t('location')}</option>
                            <option value="totalPaid">Paid</option>
                            <option value="totalReceived">Received</option>
                            <option value="balance">{t('balance')}</option>
                        </select>
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ padding: '8px 12px', height: 38, display: 'flex', alignItems: 'center' }}
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                            {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : sheet.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Scale size={48} strokeWidth={1} /></div>
                    <div>{t('noData')}</div>
                </div>
            ) : (() => {
                const filteredSheet = sheet.filter(p => {
                    const query = searchQuery.trim().toLowerCase();
                    return (
                        p.partyName?.toLowerCase().includes(query) ||
                        p.mobile?.includes(searchQuery.trim()) ||
                        p.location?.toLowerCase().includes(query)
                    );
                });

                const sortedFilteredSheet = getSortedItems(filteredSheet, {
                    partyName: (a, b, order) => {
                        const nameA = (a.partyName || '').toLowerCase();
                        const nameB = (b.partyName || '').toLowerCase();
                        if (nameA < nameB) return order === 'asc' ? -1 : 1;
                        if (nameA > nameB) return order === 'asc' ? 1 : -1;
                        return 0;
                    }
                });

                if (sortedFilteredSheet.length === 0) {
                    return (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No records found matching your search.</div>
                    );
                }

                return (
                    <>
                        {/* Desktop View */}
                        <div ref={printRef} className="card table-wrap hide-mobile">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('partyName')}>
                                            Name & Spouse name {renderSortIcon('partyName')}
                                        </th>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('mobile')}>
                                            {t('mobile')} {renderSortIcon('mobile')}
                                        </th>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('location')}>
                                            {t('location')} {renderSortIcon('location')}
                                        </th>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('totalPaid')}>
                                            Paid {renderSortIcon('totalPaid')}
                                        </th>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('totalReceived')}>
                                            Received {renderSortIcon('totalReceived')}
                                        </th>
                                        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('balance')}>
                                            {t('balance')} {renderSortIcon('balance')}
                                        </th>
                                        <th className="no-print"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedFilteredSheet.map((p, i) => (
                                        <React.Fragment key={p._id || i}>
                                            <tr>
                                                <td className="text-muted">{i + 1}</td>
                                                <td>
                                                    <Link
                                                        to={`/person-detail?partyId=${p._id || ''}&partyName=${encodeURIComponent(p.partyName)}&mobile=${p.mobile || ''}&spouseName=${encodeURIComponent(p.spouseName || '')}&location=${encodeURIComponent(p.location || '')}`}
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
                                                        <div style={{ background: 'var(--bg-card)', padding: 16, borderBottom: '1px solid var(--border)' }}>
                                                            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Transaction History with {p.partyName}</div>
                                                            <div className="table-wrap">
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
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
 
                        {/* Mobile View */}
                        <div className="show-mobile">
                            {sortedFilteredSheet.map((p, i) => (
                                <div key={p._id || i} className="card" style={{ padding: 16, marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <Link
                                                to={`/person-detail?partyId=${p._id || ''}&partyName=${encodeURIComponent(p.partyName)}&mobile=${p.mobile || ''}&spouseName=${encodeURIComponent(p.spouseName || '')}&location=${encodeURIComponent(p.location || '')}`}
                                                style={{ textDecoration: 'none', color: 'inherit' }}
                                                className="hover-underline"
                                            >
                                                <strong style={{ fontSize: 16, color: 'var(--primary)' }}>{p.initial ? `${p.initial} ` : ''}{p.partyName}</strong>
                                            </Link>
                                            {p.spouseName && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>& {p.spouseName}</div>}
                                            
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                                {p.mobile && <div>📱 {p.mobile}</div>}
                                                {p.location && <div>📍 {p.location}</div>}
                                            </div>

                                            <div style={{ display: 'flex', gap: 12, fontSize: 12, marginTop: 8 }}>
                                                <div>Paid: <span className="text-success" style={{ fontWeight: 500 }}>{fmt(p.totalPaid)}</span></div>
                                                <div>Received: <span className="text-primary" style={{ fontWeight: 500 }}>{fmt(p.totalReceived)}</span></div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                            <div style={{ fontWeight: 700, fontSize: 16, color: p.balance >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                                                {p.balance >= 0 ? '+' : ''}{fmt(p.balance)}
                                            </div>
                                            <button 
                                                className="btn btn-secondary btn-sm" 
                                                onClick={() => setSelected(selected === p._id ? null : p._id)}
                                                style={{ padding: '4px 8px' }}
                                            >
                                                {selected === p._id ? 'Hide' : 'History'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Drill-down inside card */}
                                    {selected === p._id && (
                                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: 'var(--text)' }}>
                                                Transaction History
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {p.transactions.map(tx => (
                                                    <div key={tx._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                                                        <div>
                                                            <div style={{ fontWeight: 500 }}>
                                                                {tx.eventId?.eventName || tx.eventName || '—'}
                                                                {tx.seerVarisai && Object.values(tx.seerVarisai).some(v => v && (v.value > 0 || v.quantity > 0 || v.remarks)) && (
                                                                    <span style={{ marginLeft: 4 }} title="Gifts/Seer Varisai included">🎁</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(tx.date).toLocaleDateString('en-IN')}</div>
                                                            {tx.remarks && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>"{tx.remarks}"</div>}
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span className={`badge ${tx.type === 'received' ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: 10 }}>
                                                                {t(tx.type)}
                                                            </span>
                                                            <div style={{ fontWeight: 600, marginTop: 4 }}>{fmt(tx.cashAmount)}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                );
            })()}
        </div>
    )
}
