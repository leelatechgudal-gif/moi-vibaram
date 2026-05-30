import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, partiesAPI, transactionsAPI } from '../api/api';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import { numberToWords } from '../utils/numberToWords';
import { 
    BookMarked, 
    Plus, 
    Save, 
    Edit3, 
    Printer, 
    X, 
    Check, 
    Trash2, 
    CalendarPlus,
    ArrowLeft,
    Coins,
    Gift,
    Search
} from 'lucide-react';

export default function Ledger() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Filters
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedEventDate, setSelectedEventDate] = useState(new Date().toISOString().slice(0, 10));

    // Autocomplete Cache
    const [partiesList, setPartiesList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRowIndex, setActiveRowIndex] = useState(null);

    // Grid State
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterNameQuery, setFilterNameQuery] = useState('');

    // Event Modal
    const [showEventModal, setShowEventModal] = useState(false);
    const [eventFormData, setEventFormData] = useState({
        eventName: '',
        date: new Date().toISOString().slice(0, 10),
        location: '',
    });
    const [eventLoading, setEventLoading] = useState(false);

    // Delete Modal
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, idx: null });
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Printing Setup
    const [printData, setPrintData] = useState(null);
    const printRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        onAfterPrint: () => setPrintData(null),
    });

    // Auto-trigger printing when printData is populated
    useEffect(() => {
        if (printData) {
            handlePrint();
        }
    }, [printData]);

    // Load initial data
    useEffect(() => {
        loadEvents();
        loadParties();
    }, []);

    // Load transactions on filter changes
    useEffect(() => {
        if (selectedEventId) {
            loadTransactions();
        } else {
            setRows([]);
        }
    }, [selectedEventId]);

    // Setup outside click listener for autocomplete lists
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.ledger-autocomplete-container')) {
                setActiveRowIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadEvents = async () => {
        try {
            const res = await eventsAPI.getAll({ params: { isLiveLedger: true } });
            setEvents(res.data);
            if (res.data.length > 0) {
                const firstEvent = res.data[0];
                setSelectedEventId(firstEvent._id);
                if (firstEvent.date) {
                    setSelectedEventDate(new Date(firstEvent.date).toISOString().slice(0, 10));
                }
            }
        } catch (err) {
            console.error('[ledger loadEvents]', err);
        }
    };

    const loadParties = async () => {
        try {
            const res = await partiesAPI.getAll();
            setPartiesList(res.data || []);
        } catch (err) {
            console.error('[ledger loadParties]', err);
        }
    };

    const loadTransactions = async () => {
        setLoading(true);
        setError('');
        try {
            if (!selectedEventId) {
                setRows([]);
                setLoading(false);
                return;
            }
            const params = { type: 'received', eventId: selectedEventId };
            const res = await transactionsAPI.getAll(params);
            const data = res.data.data || res.data || [];
            
            const mapped = data.map(t => ({
                _id: t._id,
                partyId: t.partyId?._id || t.partyId,
                initial: t.initial || '',
                partyName: t.partyName || '',
                spouseName: t.spouseName || '',
                mobile: t.mobile || '',
                location: t.location || '',
                cashAmount: t.cashAmount || '',
                remarks: t.remarks || '',
                isEditing: false,
                isSaving: false
            }));
            setRows(mapped);
        } catch (err) {
            console.error('[ledger loadTransactions]', err);
            setError('Failed to load existing ledger entries.');
        } finally {
            setLoading(false);
        }
    };

    const handleEventChange = (e) => {
        const id = e.target.value;
        setSelectedEventId(id);
        const ev = events.find(item => item._id === id);
        if (ev && ev.date) {
            setSelectedEventDate(new Date(ev.date).toISOString().slice(0, 10));
        }
    };

    const handleAddRow = () => {
        setRows(prev => [
            {
                tempId: Date.now() + Math.random(),
                initial: '',
                partyName: '',
                spouseName: '',
                mobile: '',
                location: '',
                cashAmount: '',
                remarks: '',
                partyId: null,
                isEditing: true,
                isSaving: false
            },
            ...prev
        ]);
    };

    const handleEditRow = (idx) => {
        const updated = [...rows];
        updated[idx].original = { ...updated[idx] };
        updated[idx].isEditing = true;
        setRows(updated);
    };

    const handleCancelRow = (idx) => {
        const updated = [...rows];
        const row = updated[idx];
        if (row.tempId) {
            updated.splice(idx, 1);
        } else if (row.original) {
            updated[idx] = { ...row.original, isEditing: false };
        } else {
            row.isEditing = false;
        }
        setRows(updated);
        setActiveRowIndex(null);
    };

    const handleFieldChange = (idx, field, val) => {
        const updated = [...rows];
        updated[idx][field] = val;
        setRows(updated);
    };

    const handleSelectParty = (idx, party) => {
        const updated = [...rows];
        updated[idx].initial = party.initial || '';
        updated[idx].partyName = party.name || '';
        updated[idx].spouseName = party.spouseName || '';
        updated[idx].mobile = party.mobile || '';
        updated[idx].location = party.location || '';
        updated[idx].partyId = party._id;
        setRows(updated);
        setActiveRowIndex(null);
    };

    const handleSaveRow = async (idx) => {
        const updated = [...rows];
        const row = updated[idx];

        if (!row.partyName.trim()) {
            alert('Name is required');
            return;
        }
        if (!row.cashAmount || parseFloat(row.cashAmount) <= 0) {
            alert('Amount must be greater than 0');
            return;
        }
        if (!selectedEventId) {
            alert('Please select or create an event');
            return;
        }

        row.isSaving = true;
        setRows(updated);

        try {
            const payload = {
                type: 'received',
                date: selectedEventDate,
                initial: row.initial.trim(),
                partyName: row.partyName.trim(),
                spouseName: row.spouseName.trim(),
                mobile: row.mobile.trim(),
                location: row.location.trim(),
                cashAmount: parseFloat(row.cashAmount),
                remarks: row.remarks.trim(),
                partyId: row.partyId,
                eventId: selectedEventId
            };

            let savedTx;
            if (row._id) {
                const res = await transactionsAPI.update(row._id, payload);
                savedTx = res.data;
            } else {
                const res = await transactionsAPI.create(payload);
                savedTx = res.data;
            }

            const pop = savedTx.data || savedTx;

            // Cache new party for autocompletion
            if (pop.partyId) {
                const pId = typeof pop.partyId === 'object' ? pop.partyId._id : pop.partyId;
                const pName = typeof pop.partyId === 'object' ? pop.partyId.name : pop.partyName;
                if (!partiesList.some(p => p._id === pId)) {
                    setPartiesList(prev => [...prev, {
                        _id: pId,
                        name: pName,
                        initial: pop.initial,
                        spouseName: pop.spouseName,
                        mobile: pop.mobile,
                        location: pop.location
                    }]);
                }
            }

            const freshRows = [...rows];
            freshRows[idx] = {
                _id: pop._id,
                partyId: pop.partyId?._id || pop.partyId,
                initial: pop.initial || pop.partyId?.initial || '',
                partyName: pop.partyName || pop.partyId?.name || '',
                spouseName: pop.spouseName || pop.partyId?.spouseName || '',
                mobile: pop.mobile || pop.partyId?.mobile || '',
                location: pop.location || pop.partyId?.location || '',
                cashAmount: pop.cashAmount || 0,
                remarks: pop.remarks || '',
                isEditing: false,
                isSaving: false
            };
            setRows(freshRows);
        } catch (err) {
            console.error('[ledger saveRow]', err);
            alert(err.response?.data?.message || 'Failed to save entry');
            const freshRows = [...rows];
            freshRows[idx].isSaving = false;
            setRows(freshRows);
        }
    };

    const handleDeleteClick = (id, idx) => {
        setDeleteModal({ show: true, id, idx });
    };

    const confirmDelete = async (password) => {
        setDeleteLoading(true);
        try {
            await transactionsAPI.delete(deleteModal.id, password);
            const fresh = [...rows];
            fresh.splice(deleteModal.idx, 1);
            setRows(fresh);
            setDeleteModal({ show: false, id: null, idx: null });
        } catch (err) {
            console.error('[ledger delete]', err);
            alert(err.response?.data?.message || 'Password confirmation failed.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleTriggerPrint = (row) => {
        // Resolve event information for receipt
        const resolvedEvent = events.find(e => e._id === selectedEventId);

        setPrintData({
            ...row,
            eventId: resolvedEvent,
            type: 'received'
        });
    };

    const handleEventModalSubmit = async (e) => {
        e.preventDefault();
        setEventLoading(true);
        try {
            const fd = new FormData();
            fd.append('eventName', eventFormData.eventName.trim());
            fd.append('date', eventFormData.date);
            fd.append('location', eventFormData.location.trim());
            fd.append('isLiveLedger', true);

            const res = await eventsAPI.create(fd);
            const newEv = res.data;
            setEvents(prev => [newEv, ...prev]);
            setSelectedEventId(newEv._id);
            if (newEv.date) {
                setSelectedEventDate(new Date(newEv.date).toISOString().slice(0, 10));
            }
            setShowEventModal(false);
            setEventFormData({
                eventName: '',
                date: new Date().toISOString().slice(0, 10),
                location: '',
            });
        } catch (err) {
            console.error('[ledger createEvent]', err);
            alert(err.response?.data?.message || 'Failed to create event');
        } finally {
            setEventLoading(false);
        }
    };

    // Auto-filter parties
    const filteredParties = searchQuery.trim()
        ? partiesList.filter(p =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    const filteredRows = rows.filter(r => 
        r.isEditing ||
        !filterNameQuery.trim() ||
        r.partyName?.toLowerCase().includes(filterNameQuery.trim().toLowerCase())
    );

    const totalAmount = filteredRows.reduce((sum, r) => sum + (parseFloat(r.cashAmount) || 0), 0);

    return (
        <div className="container">
            {/* Custom spreadsheet CSS style tags inline */}
            <style>{`
                .ledger-card {
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius);
                    padding: 16px;
                    margin-top: 16px;
                    box-shadow: var(--shadow);
                }
                .ledger-table-wrap {
                    max-height: calc(100vh - 360px);
                    min-height: 250px;
                    overflow-y: auto;
                    overflow-x: auto;
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    position: relative;
                }
                .ledger-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 13px;
                }
                .ledger-table th {
                    padding: 10px;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    background: var(--bg-card);
                    border-top: 1px solid var(--border);
                    border-bottom: 2px solid var(--border);
                    border-right: 1px solid var(--border);
                    white-space: nowrap;
                    font-size: 11px;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .ledger-table th:first-child {
                    border-left: 1px solid var(--border);
                }
                .ledger-table td {
                    padding: 0;
                    border-bottom: 1px solid var(--border);
                    border-right: 1px solid var(--border);
                    height: 42px;
                    vertical-align: middle;
                    position: relative;
                }
                .ledger-table td:first-child {
                    border-left: 1px solid var(--border);
                }
                .ledger-input {
                    width: 100%;
                    height: 100%;
                    padding: 8px 10px;
                    border: none;
                    background: transparent;
                    color: var(--text);
                    font-family: inherit;
                    font-size: 13px;
                    outline: none;
                    box-sizing: border-box;
                }
                .ledger-input:focus {
                    background: rgba(108, 99, 255, 0.08);
                    outline: 2px solid var(--primary);
                }
                .ledger-text-cell {
                    padding: 8px 10px;
                    font-size: 13px;
                    color: var(--text);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .ledger-action-cell {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 4px 8px;
                }
                .ledger-btn-icon {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .ledger-btn-icon:hover {
                    color: var(--primary);
                    background: var(--glass);
                }
                .ledger-btn-icon.success:hover {
                    color: var(--success);
                }
                .ledger-btn-icon.danger:hover {
                    color: var(--danger);
                }
                .ledger-autocomplete-list {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 280px;
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-sm);
                    max-height: 180px;
                    overflow-y: auto;
                    z-index: 999;
                    list-style: none;
                    padding: 0;
                    margin: 2px 0 0 0;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    backdrop-filter: blur(10px);
                }
                .ledger-autocomplete-list li {
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--border);
                    cursor: pointer;
                    text-align: left;
                    line-height: 1.4;
                }
                .ledger-autocomplete-list li:hover {
                    background: var(--glass);
                }
                .ledger-autocomplete-list li:last-child {
                    border-bottom: none;
                }
                .ledger-total-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-sm);
                    padding: 12px 20px;
                    margin-top: 16px;
                    font-weight: 700;
                    font-size: 15px;
                }
            `}</style>

            <div className="page-header no-print">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft size={16} style={{ marginRight: 4 }} /> {t('back')}
                    </button>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookMarked size={28} /> {t('ledger')}
                        </h1>
                        <div className="page-subtitle">Day-of-event Live Transaction Entry & Bills</div>
                    </div>
                </div>
            </div>

            {/* Filter controls */}
            <div className="card no-print" style={{ marginBottom: 16 }}>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="form-group">
                        <label className="form-label">{t('eventName')}</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select 
                                className="form-control"
                                value={selectedEventId}
                                onChange={handleEventChange}
                                style={{ flex: 1 }}
                            >
                                <option value="">Select event...</option>
                                {events.map(ev => (
                                    <option key={ev._id} value={ev._id}>
                                        {ev.eventName} — {new Date(ev.date).toLocaleDateString('en-IN')}
                                    </option>
                                ))}
                            </select>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowEventModal(true)}
                                title="Add New Event"
                                style={{ padding: '8px 12px' }}
                                type="button"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('date')}</label>
                        <input 
                            type="date"
                            className="form-control"
                            value={selectedEventDate}
                            onChange={(e) => setSelectedEventDate(e.target.value)}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (typeof e.target.showPicker === 'function') {
                                    try { e.target.showPicker(); } catch (err) {}
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && <div className="error-msg no-print">{error}</div>}

            {/* Main Ledger Grid Card */}
            <div className="ledger-card">
                {loading ? (
                    <div className="flex-center" style={{ padding: '40px 0' }}>
                        <span className="spinner" />
                    </div>
                ) : !selectedEventId ? (
                    <div className="empty-state">
                        <div className="empty-icon">📅</div>
                        <h3>Select an Event to Start</h3>
                        <p className="text-muted">Please select or create an event in the filter section above to view and enter live transactions.</p>
                        <button className="btn btn-primary mt-8" onClick={() => setShowEventModal(true)}>
                            <Plus size={16} /> Create Event
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="no-print" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '4px 10px' }}>
                                <Search size={16} className="text-muted" style={{ marginRight: 8 }} />
                                <input
                                    value={filterNameQuery}
                                    onChange={e => setFilterNameQuery(e.target.value)}
                                    placeholder="Search entries by guest name..."
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', width: '100%', padding: '6px 0', fontSize: '13px' }}
                                />
                            </div>
                            {filterNameQuery && (
                                <button className="btn btn-secondary btn-sm" onClick={() => setFilterNameQuery('')} style={{ height: 36 }}>
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="ledger-table-wrap">
                            <table className="ledger-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 50, textAlign: 'center' }}>S.No</th>
                                        <th style={{ width: 70 }}>Initial</th>
                                        <th style={{ minWidth: 160 }}>{t('partyName')} *</th>
                                        <th style={{ minWidth: 150 }}>{t('spouseName')}</th>
                                        <th style={{ minWidth: 130 }}>{t('mobile')}</th>
                                        <th style={{ minWidth: 130 }}>{t('location')}</th>
                                        <th style={{ width: 110 }}>{t('amount')} (₹) *</th>
                                        <th style={{ minWidth: 160 }}>{t('remarks')}</th>
                                        <th style={{ width: 120, textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.map((row, filteredIdx) => {
                                        const idx = rows.findIndex(r => (r._id && r._id === row._id) || (r.tempId && r.tempId === row.tempId));
                                        return (
                                            <tr key={row._id || row.tempId || filteredIdx}>
                                                <td style={{ textAlign: 'center', fontWeight: '500', color: 'var(--text-muted)' }}>
                                                    {filteredIdx + 1}
                                                </td>
                                            
                                            {/* Initial cell */}
                                            <td>
                                                {row.isEditing ? (
                                                    <input 
                                                        className="ledger-input"
                                                        value={row.initial}
                                                        onChange={(e) => handleFieldChange(idx, 'initial', e.target.value)}
                                                        placeholder="A."
                                                        disabled={row.isSaving}
                                                    />
                                                ) : (
                                                    <div className="ledger-text-cell">{row.initial || '—'}</div>
                                                )}
                                            </td>

                                            {/* Name cell with Autocomplete */}
                                            <td>
                                                {row.isEditing ? (
                                                    <div className="ledger-autocomplete-container" style={{ height: '100%' }}>
                                                        <input 
                                                            className="ledger-input"
                                                            value={row.partyName}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                handleFieldChange(idx, 'partyName', val);
                                                                handleFieldChange(idx, 'partyId', null); // Clear ID since they typed
                                                                setSearchQuery(val);
                                                                setActiveRowIndex(idx);
                                                            }}
                                                            onFocus={() => {
                                                                setSearchQuery(row.partyName);
                                                                setActiveRowIndex(idx);
                                                            }}
                                                            placeholder="Type guest name..."
                                                            disabled={row.isSaving}
                                                        />
                                                        {activeRowIndex === idx && searchQuery.trim() && (
                                                            <ul className="ledger-autocomplete-list">
                                                                {filteredParties.slice(0, 5).map((p, pIdx) => (
                                                                    <li 
                                                                        key={pIdx}
                                                                        onMouseDown={() => handleSelectParty(idx, p)}
                                                                    >
                                                                        <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                                                            {p.initial ? `${p.initial} ` : ''}{p.name}
                                                                        </div>
                                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                            {p.location || 'Unknown Location'} {p.mobile && `• 📞 ${p.mobile}`} {p.spouseName && `• 💍 ${p.spouseName}`}
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                                {filteredParties.length === 0 && (
                                                                    <li style={{ color: 'var(--text-muted)', fontSize: '12px', pointerEvents: 'none' }}>
                                                                        No existing person found (will create)
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="ledger-text-cell" style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                                        {row.partyName}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Spouse Name cell */}
                                            <td>
                                                {row.isEditing ? (
                                                    <input 
                                                        className="ledger-input"
                                                        value={row.spouseName}
                                                        onChange={(e) => handleFieldChange(idx, 'spouseName', e.target.value)}
                                                        placeholder="Spouse name"
                                                        disabled={row.isSaving}
                                                    />
                                                ) : (
                                                    <div className="ledger-text-cell">{row.spouseName || '—'}</div>
                                                )}
                                            </td>

                                            {/* Mobile cell */}
                                            <td>
                                                {row.isEditing ? (
                                                    <input 
                                                        className="ledger-input"
                                                        value={row.mobile}
                                                        onChange={(e) => handleFieldChange(idx, 'mobile', e.target.value)}
                                                        placeholder="Mobile"
                                                        disabled={row.isSaving}
                                                    />
                                                ) : (
                                                    <div className="ledger-text-cell">{row.mobile || '—'}</div>
                                                )}
                                            </td>

                                            {/* Location cell */}
                                            <td>
                                                {row.isEditing ? (
                                                    <input 
                                                        className="ledger-input"
                                                        value={row.location}
                                                        onChange={(e) => handleFieldChange(idx, 'location', e.target.value)}
                                                        placeholder="Location"
                                                        disabled={row.isSaving}
                                                    />
                                                ) : (
                                                    <div className="ledger-text-cell">{row.location || '—'}</div>
                                                )}
                                            </td>

                                            {/* Amount cell */}
                                            <td>
                                                {row.isEditing ? (
                                                    <input 
                                                        type="number"
                                                        className="ledger-input"
                                                        min="0"
                                                        value={row.cashAmount}
                                                        onChange={(e) => handleFieldChange(idx, 'cashAmount', e.target.value)}
                                                        placeholder="0"
                                                        disabled={row.isSaving}
                                                    />
                                                ) : (
                                                    <div className="ledger-text-cell" style={{ fontWeight: 'bold' }}>
                                                        ₹{row.cashAmount}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Remarks cell */}
                                            <td>
                                                {row.isEditing ? (
                                                    <input 
                                                        className="ledger-input"
                                                        value={row.remarks}
                                                        onChange={(e) => handleFieldChange(idx, 'remarks', e.target.value)}
                                                        placeholder="Remarks"
                                                        disabled={row.isSaving}
                                                    />
                                                ) : (
                                                    <div className="ledger-text-cell">{row.remarks || '—'}</div>
                                                )}
                                            </td>

                                            {/* Action cell */}
                                            <td>
                                                <div className="ledger-action-cell">
                                                    {row.isEditing ? (
                                                        <>
                                                            <button 
                                                                className="ledger-btn-icon success"
                                                                onClick={() => handleSaveRow(idx)}
                                                                disabled={row.isSaving}
                                                                title="Save Entry"
                                                            >
                                                                {row.isSaving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={16} />}
                                                            </button>
                                                            <button 
                                                                className="ledger-btn-icon danger"
                                                                onClick={() => handleCancelRow(idx)}
                                                                disabled={row.isSaving}
                                                                title="Cancel Changes"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                className="ledger-btn-icon"
                                                                onClick={() => handleEditRow(idx)}
                                                                title="Edit Row"
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                            <button 
                                                                className="ledger-btn-icon"
                                                                onClick={() => handleTriggerPrint(row)}
                                                                title="Print Receipt"
                                                            >
                                                                <Printer size={16} />
                                                            </button>
                                                            <button 
                                                                className="ledger-btn-icon danger"
                                                                onClick={() => handleDeleteClick(row._id, idx)}
                                                                title="Delete Row"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {filteredRows.length === 0 && (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                                {t('noData')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Row and Totals bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
                            <button className="btn btn-secondary btn-sm no-print" onClick={handleAddRow}>
                                <Plus size={16} /> Add Row
                            </button>
                            <div className="ledger-total-bar">
                                <span style={{ marginRight: 16, color: 'var(--text-muted)' }}>Total Count: {filteredRows.length}</span>
                                <span>{t('total')}: ₹{totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create Event Modal */}
            {showEventModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEventModal(false)}>
                    <div className="modal" style={{ maxWidth: 450 }}>
                        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CalendarPlus size={20} /> Create New Event
                        </div>
                        <form onSubmit={handleEventModalSubmit} className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Event Name *</label>
                                <input 
                                    className="form-control"
                                    value={eventFormData.eventName}
                                    onChange={(e) => setEventFormData({ ...eventFormData, eventName: e.target.value })}
                                    placeholder="e.g. My Son's Wedding"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Event Date *</label>
                                <input 
                                    type="date"
                                    className="form-control"
                                    value={eventFormData.date}
                                    onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (typeof e.target.showPicker === 'function') {
                                            try { e.target.showPicker(); } catch (err) {}
                                        }
                                    }}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input 
                                    className="form-control"
                                    value={eventFormData.location}
                                    onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                                    placeholder="Venue or City"
                                />
                            </div>
                            <div className="flex gap-8" style={{ gridColumn: '1 / -1', marginTop: 16 }}>
                                <button type="submit" className="btn btn-primary" disabled={eventLoading}>
                                    {eventLoading ? <span className="spinner" /> : 'Create Event'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEventModal(false)}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Confirm Modal for Delete */}
            <PasswordConfirmModal 
                show={deleteModal.show}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction record? This cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ show: false, id: null, idx: null })}
                loading={deleteLoading}
            />

            {/* Printable Receipt Container - Hidden on screen, visible during print */}
            <div style={{ display: 'none' }}>
                <div ref={printRef} className="print-receipt" style={{
                    padding: '40px',
                    background: '#fff',
                    color: '#000',
                    fontFamily: 'Outfit, sans-serif',
                    width: '100%',
                    maxWidth: '450px',
                    margin: '0 auto',
                    border: '2px dashed #000',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: '800', letterSpacing: '1px', color: '#000' }}>MOI VIBARAM</h2>
                        <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Traditional Digital Ledger</div>
                    </div>
                    
                    <div style={{ borderBottom: '1px solid #ccc', margin: '15px 0' }} />
                    
                    <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong>Date:</strong> <span>{printData ? new Date(printData.date).toLocaleDateString('en-IN').replace(/\//g, '-') : ''}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong>Receipt No:</strong> <span>{printData ? printData._id?.substring(18).toUpperCase() : 'TEMP'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong>Transaction Type:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{printData ? (printData.type === 'received' ? 'Moi Received' : 'Moi Paid') : ''}</span>
                        </div>
                        
                        <div style={{ borderBottom: '1px dashed #ccc', margin: '15px 0' }} />
                        
                        <div style={{ marginBottom: '15px' }}>
                            <h4 style={{ margin: '0 0 8px 0', textTransform: 'uppercase', fontSize: '12px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>Guest Details</h4>
                            <div style={{ paddingLeft: '5px' }}>
                                <div><strong>Name:</strong> {printData ? `${printData.initial ? printData.initial + ' ' : ''}${printData.partyName}` : ''}</div>
                                {printData?.spouseName && <div><strong>Spouse:</strong> {printData.spouseName}</div>}
                                {printData?.mobile && <div><strong>Mobile:</strong> {printData.mobile}</div>}
                                {printData?.location && <div><strong>Location:</strong> {printData.location}</div>}
                            </div>
                        </div>
                        
                        <div style={{ borderBottom: '1px dashed #ccc', margin: '15px 0' }} />
                        
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong>Event Name:</strong> <span>{printData ? (printData.eventId?.eventName || printData.eventName || '') : ''}</span>
                            </div>
                        </div>
                        
                        <div style={{ borderBottom: '2px solid #000', margin: '15px 0' }} />
                        
                        <div style={{ textAlign: 'center', padding: '15px', background: '#f9f9f9', border: '1px solid #ccc', margin: '10px 0' }}>
                            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Amount</div>
                            <div style={{ fontSize: '26px', fontWeight: '800', color: '#000' }}>₹{printData ? printData.cashAmount : '0'}</div>
                            <div style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '6px', textTransform: 'capitalize', color: '#333' }}>
                                {printData ? `${numberToWords(printData.cashAmount, 'en')} Only` : ''}
                            </div>
                        </div>
                        
                        {printData?.remarks && (
                            <div style={{ fontSize: '12px', color: '#333', marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                                <strong>Remarks:</strong> {printData.remarks}
                            </div>
                        )}
                    </div>
                    
                    <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>Powered by Leela Tech</div>
                        <div style={{ fontSize: '10px', color: '#666' }}>&copy; {new Date().getFullYear()} Leela Tech. All rights reserved.</div>
                        <div style={{ fontSize: '9px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>Moi Vibaram - Modern Ledger for Traditional Celebrations</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
