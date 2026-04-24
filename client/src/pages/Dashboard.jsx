import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { transactionsAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { useReactToPrint } from 'react-to-print'

function StatDrillDown({ type, onClose }) {
    const { t } = useTranslation()
    const [txList, setTxList] = useState([])
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const fetchTx = async (pageNum = 1) => {
        if (pageNum === 1) setLoading(true)
        else setLoadingMore(true)
        try {
            const res = await transactionsAPI.getAll({ type, page: pageNum, limit: 10 })
            const { data, hasMore: more } = res.data
            setTxList(prev => pageNum === 1 ? data : [...prev, ...data])
            setPage(pageNum)
            setHasMore(more)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    useEffect(() => { fetchTx(1) }, [type])

    const filteredTx = txList.filter(t => 
        t.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.mobile?.includes(searchQuery) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`

    return (
        <div className="card">
            <div className="flex-between mb-16">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>← Back</button>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>
                        {type === 'paid' ? 'Moi Invested (Paid)' : 'Moi Received'}
                    </h3>
                </div>
                <Link 
                    to="/transactions/new" 
                    state={{ type, fixedType: true }}
                    className="btn btn-primary btn-sm"
                >
                    ➕ Create Moi ({type === 'paid' ? 'I paid' : 'I have received'})
                </Link>
            </div>

            <div className="mb-16">
                <input 
                    type="search" 
                    className="form-control" 
                    placeholder="Search loaded transactions..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {loading && txList.length === 0 ? (
                <div className="flex-center"><span className="spinner" /></div>
            ) : filteredTx.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('name')}</th>
                                <th>{t('event')}</th>
                                <th>{t('amount')}</th>
                                <th>{t('date')}</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTx.map(tx => (
                                <tr key={tx._id}>
                                    <td>
                                        <Link 
                                            to={`/person-detail?partyName=${encodeURIComponent(tx.partyName)}&mobile=${tx.mobile || ''}&spouseName=${encodeURIComponent(tx.spouseName || '')}&location=${encodeURIComponent(tx.location || '')}`}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ textDecoration: 'none', color: 'inherit' }}
                                            className="hover-underline"
                                        >
                                            <strong style={{ color: 'var(--primary)' }}>{tx.initial ? `${tx.initial} ` : ''}{tx.partyName}</strong>
                                        </Link>
                                        <br />
                                        <span className="text-muted">{tx.location || '—'} {tx.mobile && `• ${tx.mobile}`}</span>
                                    </td>
                                    <td>{tx.eventId?.eventName || tx.eventName || '—'}</td>
                                    <td style={{ fontWeight: 600 }}>{fmt(tx.cashAmount)}</td>
                                    <td className="text-muted">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                    <td>
                                        <Link to={`/transactions/edit/${tx._id}`} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}>
                                            ✏️ Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {hasMore && !searchQuery && (
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => fetchTx(page + 1)}
                                disabled={loadingMore}
                            >
                                {loadingMore ? <span className="spinner" /> : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function Dashboard() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [data, setData] = useState(null)
    const [expandedEvent, setExpandedEvent] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [selectedStat, setSelectedStat] = useState(null)
    
    // Pagination state for event transactions
    const [eventTxMap, setEventTxMap] = useState({})
    const [eventPages, setEventPages] = useState({})
    const [eventHasMore, setEventHasMore] = useState({})
    const [loadingTx, setLoadingTx] = useState(false)
    const printRef = useRef()

    useEffect(() => {
        transactionsAPI.getMasterSheet()
            .then(res => setData(res.data))
            .finally(() => setLoading(false))
    }, [])

    const loadEventTransactions = async (eventId, pageNum = 1) => {
        setLoadingTx(true);
        try {
            const res = await transactionsAPI.getAll({ eventId, page: pageNum, limit: 10 });
            const { data, hasMore } = res.data;
            setEventTxMap(prev => ({
                ...prev,
                [eventId]: pageNum === 1 ? data : [...(prev[eventId] || []), ...data]
            }));
            setEventPages(prev => ({ ...prev, [eventId]: pageNum }));
            setEventHasMore(prev => ({ ...prev, [eventId]: hasMore }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTx(false);
        }
    };

    const handlePrint = useReactToPrint({ content: () => printRef.current })
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: 'MOI VIBARAM', text: `Invested: ₹${data?.grandTotalPaid || 0} | Received: ₹${data?.grandTotalReceived || 0}` })
        }
    }

    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`

    return (
        <div ref={printRef}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">👋 Welcome, {user?.name}</h1>
                    <div className="page-subtitle">Your Moi Ledger at a glance</div>
                </div>
                <div className="flex gap-8 no-print">
                    <button className="btn btn-secondary btn-sm" onClick={handleShare}>📤 {t('share')}</button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️ {t('print')}</button>
                    <Link to="/transactions/new" className="btn btn-primary btn-sm">➕ {t('createMoi')}</Link>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
                        <div className="stat-card stat-invested" style={{ cursor: 'pointer', outline: selectedStat === 'paid' ? '2px solid var(--primary)' : 'none' }} onClick={() => setSelectedStat(selectedStat === 'paid' ? null : 'paid')}>
                            <div className="stat-label">💰 {t('moiInvested')}</div>
                            <div className="stat-value">{fmt(data?.grandTotalPaid)}</div>
                            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Total paid out (Click to view)</div>
                        </div>
                        <div className="stat-card stat-received" style={{ cursor: 'pointer', outline: selectedStat === 'received' ? '2px solid var(--primary)' : 'none' }} onClick={() => setSelectedStat(selectedStat === 'received' ? null : 'received')}>
                            <div className="stat-label">📥 {t('moiReceived')}</div>
                            <div className="stat-value">{fmt(data?.grandTotalReceived)}</div>
                            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Total received (Click to view)</div>
                        </div>
                        <div className={`stat-card ${(data?.closingBalance || 0) >= 0 ? 'stat-balance-pos' : 'stat-balance-neg'}`}>
                            <div className="stat-label">⚖️ {t('closingBalance')}</div>
                            <div className="stat-value">{fmt(data?.closingBalance)}</div>
                            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Net balance</div>
                        </div>
                    </div>

                    {selectedStat ? (
                        <StatDrillDown type={selectedStat} onClose={() => setSelectedStat(null)} />
                    ) : (
                        <div className="card">
                            <div className="flex-between mb-16">
                            <h3 style={{ fontWeight: 700 }}>Events Summary</h3>
                            <Link to="/master-sheet" className="auth-link" style={{ fontSize: 13 }}>View Master Sheet →</Link>
                        </div>
                        {!data?.events || data.events.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <div>No events found. <Link to="/transactions/new" className="auth-link">Create your first Moi</Link></div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {data.events.map(event => {
                                    const isExpanded = expandedEvent === event._id;
                                    const eventTx = eventTxMap[event._id] || [];
                                    
                                    const filteredTx = eventTx.filter(t => 
                                        t.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        t.mobile?.includes(searchQuery) ||
                                        t.location?.toLowerCase().includes(searchQuery.toLowerCase())
                                    );

                                    return (
                                        <div key={event._id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                                            <div 
                                                style={{ padding: 16, background: 'var(--glass)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                onClick={() => {
                                                    if (!isExpanded && !eventTxMap[event._id]) {
                                                        loadEventTransactions(event._id, 1);
                                                    }
                                                    setExpandedEvent(isExpanded ? null : event._id);
                                                    setSearchQuery('');
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 16 }}>{event.eventName}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                                        {new Date(event.date).toLocaleDateString('en-IN')} {event.location && `• ${event.location}`}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 16, alignItems: 'center', textAlign: 'right' }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Invested</div>
                                                        <div className="text-success" style={{ fontWeight: 600 }}>{fmt(event.totalPaid)}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Received</div>
                                                        <div className="text-primary" style={{ fontWeight: 600 }}>{fmt(event.totalReceived)}</div>
                                                    </div>
                                                    <div style={{ fontSize: 18 }}>{isExpanded ? '🔽' : '▶️'}</div>
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                                                    <div style={{ marginBottom: 16 }}>
                                                        <input 
                                                            type="search" 
                                                            className="form-control" 
                                                            placeholder="Search loaded transactions..." 
                                                            value={searchQuery}
                                                            onChange={e => setSearchQuery(e.target.value)}
                                                        />
                                                    </div>
                                                    {loadingTx && eventTx.length === 0 ? (
                                                        <div className="flex-center"><span className="spinner" /></div>
                                                    ) : filteredTx.length === 0 ? (
                                                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</div>
                                                    ) : (
                                                        <div className="table-wrap">
                                                            <table className="table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>{t('partyName')}</th>
                                                                        <th>{t('type')}</th>
                                                                        <th>{t('amount')}</th>
                                                                        <th>{t('date')}</th>
                                                                        <th>Action</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {filteredTx.map(tx => (
                                                                        <tr key={tx._id}>
                                                                            <td>
                                                                                <Link 
                                                                                    to={`/person-detail?partyName=${encodeURIComponent(tx.partyName)}&mobile=${tx.mobile || ''}&spouseName=${encodeURIComponent(tx.spouseName || '')}&location=${encodeURIComponent(tx.location || '')}`}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                                                                    className="hover-underline"
                                                                                >
                                                                                    <strong style={{ color: 'var(--primary)' }}>{tx.initial ? `${tx.initial} ` : ''}{tx.partyName}</strong>
                                                                                </Link>
                                                                                <br />
                                                                                <span className="text-muted">{tx.location || '—'} {tx.mobile && `• ${tx.mobile}`}</span>
                                                                            </td>
                                                                            <td><span className={`badge ${tx.type === 'received' ? 'badge-primary' : 'badge-success'}`}>{t(tx.type)}</span></td>
                                                                            <td style={{ fontWeight: 600 }}>{fmt(tx.cashAmount)}</td>
                                                                            <td className="text-muted">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                                                            <td>
                                                                                <Link to={`/transactions/edit/${tx._id}`} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}>
                                                                                    ✏️ Edit
                                                                                </Link>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                            {eventHasMore[event._id] && !searchQuery && (
                                                                <div style={{ textAlign: 'center', marginTop: 16 }}>
                                                                    <button 
                                                                        className="btn btn-secondary" 
                                                                        onClick={() => loadEventTransactions(event._id, (eventPages[event._id] || 1) + 1)}
                                                                        disabled={loadingTx}
                                                                    >
                                                                        {loadingTx ? <span className="spinner" /> : 'Load More Transactions'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
