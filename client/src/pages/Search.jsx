import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { transactionsAPI } from '../api/api'
import { useReactToPrint } from 'react-to-print'

export default function Search() {
    const { t } = useTranslation()
    const [query, setQuery] = useState('')
    const [location, setLocation] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const printRef = useRef()

    const doSearch = async (e) => {
        e?.preventDefault()
        setLoading(true)
        setSearched(true)
        try {
            const res = await transactionsAPI.search({ q: query, location })
            setResults(res.data)
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = useReactToPrint({ content: () => printRef.current })
    const handleShare = () => navigator.share?.({ title: 'Search Results - MOI VIBARAM' })
    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">🔍 {t('search')}</h1>
                    <div className="page-subtitle">Find transactions by name, location, or mobile</div>
                </div>
                {results.length > 0 && (
                    <div className="flex gap-8 no-print">
                        <button className="btn btn-secondary btn-sm" onClick={handleShare}>📤</button>
                        <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️</button>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <form onSubmit={doSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div className="search-bar" style={{ flex: 2, margin: 0 }}>
                        <span>🔍</span>
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by name, nickname or mobile..."
                            onKeyDown={e => e.key === 'Enter' && doSearch()}
                        />
                    </div>
                    <div className="search-bar" style={{ flex: 1, margin: 0, minWidth: 140 }}>
                        <span>📍</span>
                        <input
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="Filter by location..."
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner" /> : '🔍 Search'}
                    </button>
                </form>
            </div>

            {loading && <div className="flex-center" style={{ height: 100 }}><span className="spinner" /></div>}

            {!loading && searched && (
                results.length === 0 ? (
                    <div className="card empty-state">
                        <div className="empty-icon">🔍</div>
                        <div>No results found for "{query || location}"</div>
                    </div>
                ) : (
                    <div ref={printRef} className="card table-wrap">
                        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                            {results.length} result(s) found
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t('partyName')}</th>
                                    <th>{t('mobile')}</th>
                                    <th>{t('location')}</th>
                                    <th>Event</th>
                                    <th>{t('type')}</th>
                                    <th>{t('amount')}</th>
                                    <th>{t('date')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((tx, i) => (
                                    <tr key={tx._id}>
                                        <td className="text-muted">{i + 1}</td>
                                        <td>
                                            <strong>{tx.partyName}</strong>
                                            {tx.nickname && <span className="text-muted" style={{ display: 'block', fontSize: 11 }}>"{tx.nickname}"</span>}
                                        </td>
                                        <td>{tx.mobile || '—'}</td>
                                        <td>{[tx.location, tx.street].filter(Boolean).join(', ') || '—'}</td>
                                        <td>{tx.eventId?.eventName || '—'}</td>
                                        <td>
                                            <span className={`badge ${tx.type === 'received' ? 'badge-primary' : 'badge-success'}`}>
                                                {t(tx.type)}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{fmt(tx.cashAmount)}</td>
                                        <td className="text-muted">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    )
}
