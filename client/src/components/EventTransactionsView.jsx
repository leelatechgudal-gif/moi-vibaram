import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { transactionsAPI } from '../api/api';
import useSort from '../hooks/useSort';
import ResponsiveTable from '../components/ResponsiveTable';
import { Share2, Printer, ArrowLeft, Search, MapPin, ChevronDown, ChevronUp, Download } from 'lucide-react';

export default function EventTransactionsView({ event, onBack, handlePrintEventA4, handleExportEventCSV }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalResults, setTotalResults] = useState(0);
    const printRef = useRef();
    const {
        sortField,
        sortOrder,
        setSortField,
        setSortOrder,
        handleSort,
        renderSortIcon,
        getSortedItems
    } = useSort('date', 'desc');

    const sortedResults = getSortedItems(results, {
        spouseName: (a, b, order) => {
            const valA = (a.spouseName || a.nickname || '').toLowerCase();
            const valB = (b.spouseName || b.nickname || '').toLowerCase();
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        },
        date: (a, b, order) => {
            const valA = new Date(a.date || 0);
            const valB = new Date(b.date || 0);
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        }
    });

    const doSearch = async (e, pageNum = 1) => {
        e?.preventDefault();
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        setSearched(true);
        try {
            const res = await transactionsAPI.search({
                eventId: event._id,
                q: query.trim(),
                location: location.trim(),
                page: pageNum,
                limit: 10
            });
            const { data, hasMore: more, total } = res.data;
            if (pageNum === 1) {
                setResults(data);
            } else {
                setResults(prev => [...prev, ...data]);
            }
            setPage(pageNum);
            setHasMore(more);
            setTotalResults(total);
        } catch (err) {
            console.error('Search transactions failed', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        doSearch(null, 1);
    }, [event._id]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            doSearch(null, page + 1);
        }
    };

    const handleShare = () => {
        const text = `${event.eventName} on ${new Date(event.date).toLocaleDateString('en-IN')} at ${event.venue || ''} ${event.location || ''}`;
        navigator.share?.({ title: `${event.eventName} Transactions`, text });
    };

    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`;

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ padding: '6px' }} title="Back to Events">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">{event.eventName}</h1>
                        <div className="page-subtitle">
                            {new Date(event.date).toLocaleDateString('en-IN')} {event.venue && `• ${event.venue}`} {event.location && `• ${event.location}`}
                        </div>
                    </div>
                </div>
                {results.length > 0 && (
                    <div className="flex gap-8 no-print" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handlePrintEventA4(event)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Printer size={16} /> Print A4 Ledger
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleExportEventCSV(event)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Download size={16} /> Export CSV
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleShare}><Share2 size={16} /></button>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <form onSubmit={e => doSearch(e, 1)} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 2, margin: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center' }}><Search size={16} className="text-muted" /></span>
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by name, nickname or mobile..."
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

                    <div className="show-mobile" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
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
                                <option value="date">{t('date')}</option>
                                <option value="partyName">{t('partyName')}</option>
                                <option value="spouseName">Spouse / Nickname</option>
                                <option value="mobile">{t('mobile')}</option>
                                <option value="location">{t('location')}</option>
                                <option value="type">{t('type')}</option>
                                <option value="cashAmount">{t('amount')}</option>
                            </select>
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ padding: '8px 12px', height: 38, display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                                {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 38 }}>
                        {loading ? <span className="spinner" /> : <><Search size={16} style={{ marginRight: 6 }} /> Search</>}
                    </button>
                </form>
            </div>

            {loading && <div className="flex-center" style={{ height: 100 }}><span className="spinner" /></div>}

            {!loading && searched && (
                results.length === 0 ? (
                    <div className="card empty-state">
                        <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Search size={48} strokeWidth={1} /></div>
                        <div>No transactions found.</div>
                    </div>
                ) : (
                    <>
                        <ResponsiveTable
                            ref={printRef}
                            headers={[
                                '#',
                                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('partyName')}>
                                    {t('partyName')} {renderSortIcon('partyName')}
                                </div>,
                                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('spouseName')}>
                                    Spouse / Nickname {renderSortIcon('spouseName')}
                                </div>,
                                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('mobile')}>
                                    {t('mobile')} {renderSortIcon('mobile')}
                                </div>,
                                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('location')}>
                                    {t('location')} {renderSortIcon('location')}
                                </div>,
                                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('type')}>
                                    {t('type')} {renderSortIcon('type')}
                                </div>,
                                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('cashAmount')}>
                                    {t('amount')} {renderSortIcon('cashAmount')}
                                </div>,
                                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleSort('date')}>
                                    {t('date')} {renderSortIcon('date')}
                                </div>
                            ]}
                            rows={sortedResults}
                            headerContent={
                                <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                                    Showing {results.length} of {totalResults} result(s) found
                                </div>
                            }
                            renderRow={(tx, i) => [
                                <span className="text-muted">{i + 1}</span>,
                                <strong>{tx.initial ? `${tx.initial} ` : ''}{tx.partyName}</strong>,
                                <div style={{ fontSize: 13 }}>
                                    {tx.spouseName && <div className="text-primary" style={{ fontWeight: 500 }}>{tx.spouseName} (S)</div>}
                                    {tx.nickname && <div className="text-muted" style={{ fontStyle: 'italic' }}>"{tx.nickname}"</div>}
                                    {!tx.spouseName && !tx.nickname && '—'}
                                </div>,
                                tx.mobile || '—',
                                <div>
                                    <div style={{ fontWeight: 500 }}>{tx.location || '—'}</div>
                                    {tx.street && <div className="text-muted" style={{ fontSize: 11 }}>{tx.street}</div>}
                                </div>,
                                <span className={`badge ${tx.type === 'received' ? 'badge-primary' : 'badge-success'}`}>
                                    {t(tx.type)}
                                </span>,
                                <span style={{ fontWeight: 600 }}>{fmt(tx.cashAmount)}</span>,
                                <span className="text-muted">{new Date(tx.date).toLocaleDateString('en-IN')}</span>
                            ]}
                            renderMobileCard={(tx) => (
                                <div key={tx._id} className="card" style={{ padding: 16, marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div>
                                            <strong style={{ fontSize: 16, color: 'var(--text)' }}>{tx.initial ? `${tx.initial} ` : ''}{tx.partyName}</strong>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                                {tx.spouseName && <span className="text-primary" style={{ fontWeight: 500 }}>{tx.spouseName} (S) </span>}
                                                {tx.nickname && <span style={{ fontStyle: 'italic' }}>"{tx.nickname}"</span>}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, fontSize: 16, color: tx.type === 'received' ? 'var(--primary)' : 'var(--success)' }}>
                                                {tx.type === 'paid' ? '-' : '+'}₹{(tx.cashAmount || 0).toLocaleString('en-IN')}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString('en-IN')}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                                        {tx.mobile && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📱 {tx.mobile}</div>}
                                        {tx.location && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📍 {tx.location}</div>}
                                    </div>
                                </div>
                            )}
                        />
                        {hasMore && (
                            <div style={{ textAlign: 'center', marginTop: 16 }}>
                                <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? <span className="spinner" /> : 'Load More'}
                                </button>
                            </div>
                        )}
                    </>
                )
            )}
        </div>
    );
}
