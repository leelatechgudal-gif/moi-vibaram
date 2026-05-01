import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { transactionsAPI } from '../api/api'
import { useReactToPrint } from 'react-to-print'
import { Search as SearchIcon, Share2, Printer, MapPin } from 'lucide-react'

export default function Search() {
    const { t } = useTranslation()
    const [query, setQuery] = useState('')
    const [location, setLocation] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [totalResults, setTotalResults] = useState(0)
    const printRef = useRef()

    const doSearch = async (e, pageNum = 1) => {
        e?.preventDefault()
        if (pageNum === 1) setLoading(true)
        else setLoadingMore(true)
        setSearched(true)
        try {
            const res = await transactionsAPI.search({ q: query, location, page: pageNum, limit: 10 })
            const { data, hasMore: more, total } = res.data
            if (pageNum === 1) {
                setResults(data)
            } else {
                setResults(prev => [...prev, ...data])
            }
            setPage(pageNum)
            setHasMore(more)
            setTotalResults(total)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            doSearch(null, page + 1)
        }
    }

    const handlePrint = useReactToPrint({ content: () => printRef.current })
    const handleShare = () => navigator.share?.({ title: 'Search Results - MOI VIBARAM' })
    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SearchIcon size={28} /> {t('search')}</h1>
                    <div className="page-subtitle">Find transactions by name, location, or mobile</div>
                </div>
                {results.length > 0 && (
                    <div className="flex gap-8 no-print">
                        <button className="btn btn-secondary btn-sm" onClick={handleShare}><Share2 size={16} /></button>
                        <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={16} /></button>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <form onSubmit={doSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div className="search-bar" style={{ flex: 2, margin: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center' }}><SearchIcon size={16} className="text-muted" /></span>
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by name, nickname or mobile..."
                            onKeyDown={e => e.key === 'Enter' && doSearch()}
                        />
                    </div>
                    <div className="search-bar" style={{ flex: 1, margin: 0, minWidth: 140 }}>
                        <span style={{ display: 'flex', alignItems: 'center' }}><MapPin size={16} className="text-muted" /></span>
                        <input
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="Filter by location..."
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner" /> : <><SearchIcon size={16} style={{ marginRight: 6 }} /> Search</>}
                    </button>
                </form>
            </div>

            {loading && <div className="flex-center" style={{ height: 100 }}><span className="spinner" /></div>}

            {!loading && searched && (
                results.length === 0 ? (
                    <div className="card empty-state">
                        <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><SearchIcon size={48} strokeWidth={1} /></div>
                        <div>No results found for "{query || location}"</div>
                    </div>
                ) : (
                    <div ref={printRef} className="card table-wrap">
                        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                            Showing {results.length} of {totalResults} result(s) found
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t('partyName')}</th>
                                    <th>Spouse / Nickname</th>
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
                                            <strong>{tx.initial ? `${tx.initial} ` : ''}{tx.partyName}</strong>
                                        </td>
                                        <td style={{ fontSize: 13 }}>
                                            {tx.spouseName && <div className="text-primary" style={{ fontWeight: 500 }}>{tx.spouseName} (S)</div>}
                                            {tx.nickname && <div className="text-muted" style={{ fontStyle: 'italic' }}>"{tx.nickname}"</div>}
                                            {!tx.spouseName && !tx.nickname && '—'}
                                        </td>
                                        <td>{tx.mobile || '—'}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{tx.location || '—'}</div>
                                            {tx.street && <div className="text-muted" style={{ fontSize: 11 }}>{tx.street}</div>}
                                        </td>
                                        <td>{tx.eventId?.eventName || tx.eventName || '—'}</td>
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
                        {hasMore && (
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? <span className="spinner" /> : 'Load More'}
                                </button>
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
    )
}
