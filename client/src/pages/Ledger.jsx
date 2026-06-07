import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { printElement } from '../utils/print';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, partiesAPI, transactionsAPI } from '../api/api';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import OwnerOtpModal from '../components/OwnerOtpModal';
import { numberToWords } from '../utils/numberToWords';
import logoImg from '../../assets/logo.jpeg';
import iconImg from '../../assets/icon.png';
import {
    BookMarked,
    Plus,
    Save,
    Edit3,
    Printer,
    X,
    Check,
    Trash2,
    ArrowLeft,
    Coins,
    Gift,
    Search,
    Eye,
    EyeOff
} from 'lucide-react';

export default function Ledger({ sidebarCollapsed, setSidebarCollapsed }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        return () => {
            if (setSidebarCollapsed) {
                setSidebarCollapsed(false);
            }
        };
    }, [setSidebarCollapsed]);

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

    // Total visibility state
    const [showTotalAmount, setShowTotalAmount] = useState(() => {
        const stored = localStorage.getItem('ledger_show_total');
        return stored === 'true';
    });

    useEffect(() => {
        localStorage.setItem('ledger_show_total', showTotalAmount);
    }, [showTotalAmount]);

    // Owner OTP Approval Modal
    const [otpModal, setOtpModal] = useState({ show: false, idx: null, loading: false, message: '', error: '', payload: null });

    // Printing Setup
    const [printData, setPrintData] = useState(null);
    const printRef = useRef();
    const handlePrint = () => {
        if (printRef.current) {
            printElement(printRef.current, () => setPrintData(null));
        }
    };

    // Sign-off / Clerk Declaration Modal State
    const [isSignOffOpen, setIsSignOffOpen] = useState(false);
    const [denominations, setDenominations] = useState({
        500: '',
        200: '',
        100: '',
        50: '',
        20: '',
        10: '',
        coins: ''
    });
    const [gpayAmount, setGpayAmount] = useState('0');
    const [gpayMobNo, setGpayMobNo] = useState('');
    const [clerkPhone, setClerkPhone] = useState('');
    const [witness1, setWitness1] = useState({ name: '', mobile: '' });
    const [witness2, setWitness2] = useState({ name: '', mobile: '' });
    const [isClosingEvent, setIsClosingEvent] = useState(false);

    // Set clerk mobile initially if auth user is loaded
    useEffect(() => {
        if (user && user.mobile) {
            setClerkPhone(user.mobile);
        }
    }, [user]);

    const declarationPrintRef = useRef();
    const handlePrintDeclaration = () => {
        if (declarationPrintRef.current) {
            printElement(declarationPrintRef.current);
        }
    };

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
                paymentType: t.paymentType || 'cash',
                occupation: t.occupation || t.partyId?.occupation || '',
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
                occupation: '',
                paymentType: 'cash',
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
        updated[idx].occupation = party.occupation || '';
        updated[idx].partyId = party._id;
        setRows(updated);
        setActiveRowIndex(null);
    };

    const handleSaveRow = async (idx) => {
        const updated = [...rows];
        const row = updated[idx];

        // Mandatory fields check
        if (!row.partyName || !row.partyName.trim()) {
            alert('Name is required');
            return;
        }
        if (!row.spouseName || !row.spouseName.trim()) {
            alert('Spouse Name is required');
            return;
        }
        if (row.mobile && row.mobile.trim()) {
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(row.mobile.trim())) {
                alert('Please enter a valid 10-digit mobile number starting with 6-9');
                return;
            }
        }
        if (!row.location || !row.location.trim()) {
            alert('Location is required');
            return;
        }
        if (!row.cashAmount || parseFloat(row.cashAmount) <= 0) {
            alert('Amount must be greater than 0');
            return;
        }
        if (!row.paymentType) {
            alert('Payment Type is required');
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
                paymentType: row.paymentType,
                occupation: row.occupation.trim(),
                partyId: row.partyId,
                eventId: selectedEventId
            };

            let savedTx;
            if (row._id) {
                const res = await transactionsAPI.update(row._id, payload);
                if (res.data && res.data.otpRequired) {
                    setOtpModal({
                        show: true,
                        idx,
                        loading: false,
                        message: res.data.message,
                        error: '',
                        payload
                    });
                    const freshRows = [...rows];
                    freshRows[idx].isSaving = false;
                    setRows(freshRows);
                    return;
                }
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
                        location: pop.location,
                        occupation: pop.occupation || pop.partyId?.occupation || ''
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
                paymentType: pop.paymentType || 'cash',
                occupation: pop.occupation || pop.partyId?.occupation || '',
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

    const handleConfirmOtp = async (otp) => {
        const { idx, payload } = otpModal;
        if (idx === null || !payload) return;

        setOtpModal(prev => ({ ...prev, loading: true, error: '' }));

        const updated = [...rows];
        const row = updated[idx];
        row.isSaving = true;
        setRows(updated);

        try {
            const res = await transactionsAPI.update(row._id, { ...payload, otp });
            const savedTx = res.data;
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
                        location: pop.location,
                        occupation: pop.occupation || pop.partyId?.occupation || ''
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
                paymentType: pop.paymentType || 'cash',
                occupation: pop.occupation || pop.partyId?.occupation || '',
                isEditing: false,
                isSaving: false
            };
            setRows(freshRows);
            setOtpModal({ show: false, idx: null, loading: false, message: '', error: '', payload: null });
        } catch (err) {
            console.error('[ledger saveOtp]', err);
            const errMsg = err.response?.data?.message || 'Failed to verify OTP or save entry';
            setOtpModal(prev => ({ ...prev, loading: false, error: errMsg }));
            const freshRows = [...rows];
            freshRows[idx].isSaving = false;
            setRows(freshRows);
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

    const handleOpenSignOff = () => {
        const calculatedGpay = rows.filter(r => r.paymentType === 'gpay').reduce((sum, r) => sum + (parseFloat(r.cashAmount) || 0), 0);
        setGpayAmount(calculatedGpay.toString());
        setIsSignOffOpen(true);
    };

    const handleCloseLedger = async () => {
        if (!selectedEventId) return;
        const confirmClose = window.confirm("Are you sure you want to close this live ledger? This will lock the event and it will no longer be available for live entry.");
        if (!confirmClose) return;

        setIsClosingEvent(true);
        try {
            const fd = new FormData();
            fd.append('isLiveLedger', 'false');
            await eventsAPI.update(selectedEventId, fd);
            alert("Ledger closed successfully.");
            setIsSignOffOpen(false);

            // Reset modal states
            setDenominations({
                500: '',
                200: '',
                100: '',
                50: '',
                20: '',
                10: '',
                coins: ''
            });
            setGpayAmount('0');
            setGpayMobNo('');
            setWitness1({ name: '', mobile: '' });
            setWitness2({ name: '', mobile: '' });

            // Reload events to refresh the dropdown (removes closed event)
            await loadEvents();
            setSelectedEventId('');
            setRows([]);
        } catch (err) {
            console.error('[ledger closeLedger]', err);
            alert(err.response?.data?.message || 'Failed to close ledger');
        } finally {
            setIsClosingEvent(false);
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

    const selectedEvent = events.find(ev => ev._id === selectedEventId);
    const noOfPersonsPaid = rows.length;
    const totalMoiReceived = rows.reduce((sum, r) => sum + (parseFloat(r.cashAmount) || 0), 0);
    const denom500 = parseInt(denominations[500]) || 0;
    const denom200 = parseInt(denominations[200]) || 0;
    const denom100 = parseInt(denominations[100]) || 0;
    const denom50 = parseInt(denominations[50]) || 0;
    const denom20 = parseInt(denominations[20]) || 0;
    const denom10 = parseInt(denominations[10]) || 0;
    const denomCoins = parseFloat(denominations.coins) || 0;
    const totalDenomValue = (denom500 * 500) + (denom200 * 200) + (denom100 * 100) + (denom50 * 50) + (denom20 * 20) + (denom10 * 10) + denomCoins;
    const differenceAmount = (totalDenomValue + (parseFloat(gpayAmount) || 0)) - totalMoiReceived;

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
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookMarked size={28} /> {t('ledger')}
                        </h1>
                        <div className="page-subtitle">Day-of-event Live Transaction Entry & Bills</div>
                    </div>
                </div>
                {selectedEventId && (
                    <button
                        className="btn btn-success"
                        onClick={handleOpenSignOff}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Printer size={16} /> Sign-off & Close Ledger
                    </button>
                )}
            </div>

            {/* Filter controls */}
            <div className="card no-print" style={{ marginBottom: 16 }}>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="form-group">
                        <label className="form-label">{t('eventName')}</label>
                        <select
                            className="form-control"
                            value={selectedEventId}
                            onChange={handleEventChange}
                        >
                            <option value="">Select event...</option>
                            {events.map(ev => (
                                <option key={ev._id} value={ev._id}>
                                    {ev.eventName} — {new Date(ev.date).toLocaleDateString('en-IN')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('date')}</label>
                        <input
                            type="date"
                            className="form-control"
                            value={selectedEventDate}
                            disabled={true}
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
                        <p className="text-muted">Please select an event in the filter section above to view and enter live transactions.</p>
                    </div>
                ) : (
                    <>
                        <div className="no-print" style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                            <button className="btn btn-primary" onClick={handleAddRow} style={{ height: 38, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Plus size={16} /> Add Row
                            </button>
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
                                <button className="btn btn-secondary btn-sm" onClick={() => setFilterNameQuery('')} style={{ height: 38 }}>
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
                                        <th style={{ minWidth: 150 }}>{t('spouseName')} *</th>
                                        <th style={{ minWidth: 130 }}>{t('mobile')}</th>
                                        <th style={{ minWidth: 130 }}>{t('location')} *</th>
                                        <th style={{ width: 110 }}>{t('amount')} (₹) *</th>
                                        <th style={{ width: 120 }}>{t('paymentType')} *</th>
                                        <th style={{ minWidth: 160 }}>{t('occupation')}</th>
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

                                                {/* Payment Type cell */}
                                                <td>
                                                    {row.isEditing ? (
                                                        <select
                                                            className="ledger-input"
                                                            value={row.paymentType || 'cash'}
                                                            onChange={(e) => handleFieldChange(idx, 'paymentType', e.target.value)}
                                                            disabled={row.isSaving}
                                                            style={{ background: 'var(--surface)', color: 'var(--text)', border: 'none', padding: '0 8px' }}
                                                        >
                                                            <option value="cash">Cash</option>
                                                            <option value="gpay">GPay</option>
                                                        </select>
                                                    ) : (
                                                        <div className="ledger-text-cell">
                                                            <span className={`badge ${row.paymentType === 'gpay' ? 'badge-primary' : 'badge-success'}`}>
                                                                {row.paymentType === 'gpay' ? t('gpay') : t('cash')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Occupation cell */}
                                                <td>
                                                    {row.isEditing ? (
                                                        <input
                                                            className="ledger-input"
                                                            value={row.occupation || ''}
                                                            onChange={(e) => handleFieldChange(idx, 'occupation', e.target.value)}
                                                            placeholder="Occupation"
                                                            disabled={row.isSaving}
                                                        />
                                                    ) : (
                                                        <div className="ledger-text-cell">{row.occupation || '—'}</div>
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
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredRows.length === 0 && (
                                        <tr>
                                            <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                                {t('noData')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Row and Totals bar */}
                        {/* Totals bar */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <div className="ledger-total-bar" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Total Count: {filteredRows.length}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>{t('total')}:</span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold' }}>
                                        {showTotalAmount ? `₹${totalAmount.toLocaleString('en-IN')}` : '₹ ••••••'}
                                    </span>
                                    <button
                                        type="button"
                                        className="ledger-btn-icon"
                                        style={{ padding: '2px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
                                        onClick={() => setShowTotalAmount(!showTotalAmount)}
                                        title={showTotalAmount ? "Hide Total Amount" : "Show Total Amount"}
                                    >
                                        {showTotalAmount ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>



            {/* Owner OTP Modal */}
            <OwnerOtpModal
                show={otpModal.show}
                onConfirm={handleConfirmOtp}
                onCancel={() => setOtpModal({ show: false, idx: null, loading: false, message: '', error: '', payload: null })}
                loading={otpModal.loading}
                message={otpModal.message}
                error={otpModal.error}
            />

            {/* Clerk Declaration & Sign-off Modal */}
            {isSignOffOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIsSignOffOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal" style={{ maxWidth: '950px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
                            <h2 className="modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)' }}>
                                <Coins size={24} /> Clerk Declaration & Sign-off
                            </h2>
                            <button className="ledger-btn-icon" onClick={() => setIsSignOffOpen(false)} style={{ padding: '6px' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body: Flex row wrapper */}
                        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap' }}>

                            {/* Left column: Inputs */}
                            <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                {/* Section 1: Denominations */}
                                <div style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>
                                        Denominations Count
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                        {[500, 200, 100, 50, 20, 10].map(denom => (
                                            <div key={denom} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '45px', fontWeight: '600', fontSize: '13px' }}>₹{denom} x</span>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    style={{ padding: '6px 10px', height: '34px' }}
                                                    placeholder="0"
                                                    min="0"
                                                    value={denominations[denom]}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const cleanVal = val === '' ? '' : Math.max(0, parseInt(val) || 0);
                                                        setDenominations(prev => ({ ...prev, [denom]: cleanVal }));
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 2' }}>
                                            <span style={{ width: '90px', fontWeight: '600', fontSize: '13px' }}>Coins (Total ₹)</span>
                                            <input
                                                type="number"
                                                className="form-control"
                                                style={{ padding: '6px 10px', height: '34px' }}
                                                placeholder="0.00"
                                                min="0"
                                                value={denominations.coins}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const cleanVal = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
                                                    setDenominations(prev => ({ ...prev, coins: cleanVal }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', marginTop: '12px', fontWeight: '700', fontSize: '14px', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                                        Counted Cash: <span style={{ color: 'var(--primary)' }}>₹{totalDenomValue.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                {/* Section 2: Cash Report & GPay */}
                                <div style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>
                                        Moi Cash & GPay Report
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>Total Ledger Entries</label>
                                            <div className="form-control" style={{ background: 'var(--bg)', height: '38px', display: 'flex', alignItems: 'center' }}>
                                                {noOfPersonsPaid} guests
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>Total Ledger Sum</label>
                                            <div className="form-control" style={{ background: 'var(--bg)', height: '38px', display: 'flex', alignItems: 'center', fontWeight: '700' }}>
                                                ₹{totalMoiReceived.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>GPay Amount (₹)</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                style={{ height: '38px' }}
                                                value={gpayAmount}
                                                onChange={e => setGpayAmount(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>GPay Mobile No</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                style={{ height: '38px' }}
                                                placeholder="GPay mobile number"
                                                value={gpayMobNo}
                                                onChange={e => setGpayMobNo(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Reconciliation Status */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: '16px',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: differenceAmount === 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        border: `1px solid ${differenceAmount === 0 ? 'var(--success)' : 'var(--danger)'}`,
                                        fontSize: '13px'
                                    }}>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>Total Counted:</span> <strong>₹{(totalDenomValue + (parseFloat(gpayAmount) || 0)).toLocaleString('en-IN')}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>Difference:</span> <strong style={{ color: differenceAmount === 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                {differenceAmount > 0 ? `+₹${differenceAmount.toLocaleString('en-IN')}` : `₹${differenceAmount.toLocaleString('en-IN')}`}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Witnesses & Clerk Details */}
                                <div style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)' }}>
                                        Witnesses & Clerk Contact
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>Witness-1 Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Name"
                                                style={{ height: '34px', padding: '6px 10px' }}
                                                value={witness1.name}
                                                onChange={e => setWitness1({ ...witness1, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>Witness-1 Mobile</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Mobile"
                                                style={{ height: '34px', padding: '6px 10px' }}
                                                value={witness1.mobile}
                                                onChange={e => setWitness1({ ...witness1, mobile: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>Witness-2 Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Name"
                                                style={{ height: '34px', padding: '6px 10px' }}
                                                value={witness2.name}
                                                onChange={e => setWitness2({ ...witness2, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>Witness-2 Mobile</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Mobile"
                                                style={{ height: '34px', padding: '6px 10px' }}
                                                value={witness2.mobile}
                                                onChange={e => setWitness2({ ...witness2, mobile: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                                            <label className="form-label" style={{ fontSize: '10px' }}>Clerk Contact Mobile (Print Format)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Your mobile number"
                                                style={{ height: '34px', padding: '6px 10px' }}
                                                value={clerkPhone}
                                                onChange={e => setClerkPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right column: Document Preview */}
                            <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: 0 }}>
                                        Document Live Preview (Declaration Form)
                                    </h3>
                                </div>

                                <div style={{
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: '#ffffff',
                                    color: '#000000',
                                    padding: '24px',
                                    fontSize: '13px',
                                    lineHeight: '1.4',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                    fontFamily: "'Outfit', sans-serif"
                                }}>
                                    {/* Mini printable preview structure */}
                                    <div style={{ textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: '12px', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: '800', fontSize: '16px' }}>LEELA TECH</div>
                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555' }}>Trust Begins</div>
                                        <div style={{ fontWeight: '700', color: '#e74c3c', textDecoration: 'underline', marginTop: '6px', fontSize: '14px' }}>DECLARATION FORM</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
                                        <div><strong>Event:</strong> {selectedEvent?.eventName}</div>
                                        <div><strong>Location:</strong> {selectedEvent?.location}</div>
                                        <div><strong>Venue:</strong> {selectedEvent?.venue}</div>
                                        <div><strong>Mobile:</strong> {clerkPhone}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
                                        <div style={{ flex: 1.2 }}>
                                            <div style={{ fontWeight: '700', borderBottom: '1px solid #ddd', paddingBottom: '3px', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', color: '#e74c3c' }}>Cash Report</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>Paid count:</span><strong>{noOfPersonsPaid}</strong></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>Ledger Sum:</span><strong>₹{totalMoiReceived}</strong></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>Cash count:</span><strong>₹{totalDenomValue}</strong></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>Gpay Sum:</span><strong>₹{gpayAmount}</strong></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>Diff:</span><strong style={{ color: differenceAmount !== 0 ? '#e74c3c' : '#000' }}>₹{differenceAmount}</strong></div>
                                        </div>
                                        <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '12px' }}>
                                            <div style={{ fontWeight: '700', borderBottom: '1px solid #ddd', paddingBottom: '3px', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', color: '#e74c3c' }}>Denominations</div>
                                            {[500, 200, 100, 50, 20, 10].map(d => (
                                                <div key={d} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                    <span>{d} x</span>
                                                    <span>{denominations[d] || 0}</span>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', marginTop: '4px', fontWeight: 'bold' }}>
                                                <span>Total:</span>
                                                <span>₹{totalDenomValue}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', marginBottom: '12px', fontSize: '11px' }}>
                                        <strong>Amount in words:</strong> <span style={{ textTransform: 'capitalize', fontStyle: 'italic' }}>
                                            {totalDenomValue > 0 ? `${numberToWords(totalDenomValue, 'en')} Only` : 'Zero rupees only'}
                                        </span>
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #000', marginBottom: '12px' }}>
                                        <thead>
                                            <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #000' }}>
                                                <th style={{ padding: '4px', borderRight: '1px solid #000' }}>Witnesses</th>
                                                <th style={{ padding: '4px', borderRight: '1px solid #000' }}>Witness 1</th>
                                                <th style={{ padding: '4px' }}>Witness 2</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid #000' }}>
                                                <td style={{ padding: '4px', borderRight: '1px solid #000' }}><strong>Name</strong></td>
                                                <td style={{ padding: '4px', borderRight: '1px solid #000' }}>{witness1.name}</td>
                                                <td style={{ padding: '4px' }}>{witness2.name}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '4px', borderRight: '1px solid #000' }}><strong>Mobile</strong></td>
                                                <td style={{ padding: '4px', borderRight: '1px solid #000' }}>{witness1.mobile}</td>
                                                <td style={{ padding: '4px' }}>{witness2.mobile}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
                                        <div style={{ fontSize: '11px' }}>
                                            Clerk: <strong>{user?.name}</strong>
                                        </div>
                                        <div style={{ borderTop: '1px solid #000', width: '110px', textAlign: 'center', fontSize: '10px', paddingTop: '4px', fontWeight: 'bold' }}>
                                            Clerk Signature
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Modal Action Footer */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-secondary" onClick={() => setIsSignOffOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-secondary" onClick={handlePrintDeclaration} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Printer size={16} /> Print Declaration Form
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCloseLedger}
                                disabled={isClosingEvent}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                {isClosingEvent ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={16} />}
                                Confirm & Close Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong>Payment Method:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{printData?.paymentType || 'CASH'}</span>
                        </div>

                        <div style={{ borderBottom: '1px dashed #ccc', margin: '15px 0' }} />

                        <div style={{ marginBottom: '15px' }}>
                            <h4 style={{ margin: '0 0 8px 0', textTransform: 'uppercase', fontSize: '12px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>Guest Details</h4>
                            <div style={{ paddingLeft: '5px' }}>
                                <div><strong>Name:</strong> {printData ? `${printData.initial ? printData.initial + ' ' : ''}${printData.partyName}` : ''}</div>
                                {printData?.spouseName && <div><strong>Spouse:</strong> {printData.spouseName}</div>}
                                {printData?.mobile && <div><strong>Mobile:</strong> {printData.mobile}</div>}
                                {printData?.location && <div><strong>Location:</strong> {printData.location}</div>}
                                {printData?.occupation && <div><strong>Occupation:</strong> {printData.occupation}</div>}
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
                    </div>

                    <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>Powered by Leela Tech</div>
                        <div style={{ fontSize: '10px', color: '#666' }}>&copy; {new Date().getFullYear()} Leela Tech. All rights reserved.</div>
                        <div style={{ fontSize: '9px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>Moi Vibaram - Modern Ledger for Traditional Celebrations</div>
                    </div>
                </div>
            </div>

            {/* Printable Declaration Sheet Container - Hidden on screen, visible during print */}
            <div style={{ display: 'none' }}>
                <div ref={declarationPrintRef} className="print-declaration-sheet" style={{
                    padding: '20px 30px',
                    background: '#fff',
                    color: '#000',
                    fontFamily: "'Outfit', sans-serif",
                    width: '100%',
                    maxWidth: '800px',
                    margin: '0 auto',
                    boxSizing: 'border-box',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none'
                }}>
                    <style>{`
                        @page {
                            size: A4;
                            margin: 10mm 12mm;
                        }
                        @media print {
                            html, body {
                                height: auto !important;
                                min-height: auto !important;
                                overflow: visible !important;
                                background: #fff !important;
                            }
                            .print-declaration-sheet {
                                display: block !important;
                                padding: 10mm 15mm !important;
                                margin: 0 auto !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                border: none !important;
                                outline: none !important;
                                box-shadow: none !important;
                            }
                            .print-page-break {
                                page-break-after: always !important;
                                break-after: page !important;
                                display: block !important;
                                box-sizing: border-box !important;
                                height: 100% !important;
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                        }
                    `}</style>


                    {/* PAGE 2: Declaration Summary */}
                    <div style={{
                        boxSizing: 'border-box',
                        display: 'block',
                        paddingTop: '10px'
                    }}>
                        <div style={{ display: 'block' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div>
                                    <img src={logoImg} alt="Leela Tech Logo" style={{ height: '40px', objectFit: 'contain' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <img src={iconImg} alt="Leela Tech Icon" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
                                    <div style={{ fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>
                                        Date : {new Date(selectedEvent?.date || new Date()).toLocaleDateString('en-IN').replace(/\//g, '/')}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <div style={{ fontSize: '13px', color: '#333' }}>Welcome, <strong>{user?.name || 'Anand'}</strong></div>
                                <div style={{ fontSize: '13px', color: '#666', marginTop: '1px' }}>Your Moi Ledger at a glance</div>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '1px', margin: '0 0 2px 0', color: '#000' }}>MOI VIBARAM</h2>
                                <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>Trust Begins</div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000000', textDecoration: 'underline', marginTop: '4px', textTransform: 'uppercase' }}>Declaration Form</h3>
                            </div>

                            {/* Event Details Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: '12px', borderBottom: '1.5px solid #000', paddingBottom: '8px' }}>
                                <div style={{ fontSize: '13px' }}><strong>Event Name:</strong> {selectedEvent?.eventName || '—'}</div>
                                <div style={{ fontSize: '13px' }}><strong>Location:</strong> {selectedEvent?.location || '—'}</div>
                                <div style={{ fontSize: '13px' }}><strong>Venue:</strong> {selectedEvent?.venue || '—'}</div>
                                <div style={{ fontSize: '13px' }}><strong>Mobile No:</strong> {clerkPhone || '—'}</div>
                            </div>

                            {/* Cash Report & Denominations columns */}
                            <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
                                {/* Left Side: Moi Cash Report */}
                                <div style={{ flex: 1.2 }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#000000', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                        Moi Cash Report
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                            <span>No Of Persons paid</span>
                                            <strong>{noOfPersonsPaid}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                            <span>Total Moi Received</span>
                                            <strong>₹{totalMoiReceived.toLocaleString('en-IN')}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                            <span>Cash amount</span>
                                            <strong>₹{totalDenomValue.toLocaleString('en-IN')}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                            <span>Gpay Amount</span>
                                            <strong>₹{(parseFloat(gpayAmount) || 0).toLocaleString('en-IN')}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                            <span>Difference Amount</span>
                                            <strong style={{ color: '#000000' }}>
                                                ₹{differenceAmount.toLocaleString('en-IN')}
                                            </strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '3px', marginTop: '4px' }}>
                                            <span>Gpay Mob No</span>
                                            <strong>{gpayMobNo || '—'}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Denominations */}
                                <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#000000', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                        Denominations
                                    </h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <tbody>
                                            {[500, 200, 100, 50, 20, 10].map(denom => (
                                                <tr key={denom} style={{ borderBottom: '1px dashed #f0f0f0' }}>
                                                    <td style={{ padding: '3px 0' }}>{denom} *</td>
                                                    <td style={{ padding: '3px 0', textAlign: 'center' }}>
                                                        {denominations[denom] || '0'}
                                                    </td>
                                                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: '600' }}>
                                                        ₹{((parseInt(denominations[denom]) || 0) * denom).toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr style={{ borderBottom: '1px dashed #f0f0f0' }}>
                                                <td style={{ padding: '3px 0' }}>Coins *</td>
                                                <td style={{ padding: '3px 0', textAlign: 'center' }}>
                                                    {denominations.coins ? '—' : '0'}
                                                </td>
                                                <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: '600' }}>
                                                    ₹{(parseFloat(denominations.coins) || 0).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                            <tr style={{ fontWeight: '800', borderTop: '1.5px solid #000', fontSize: '13px' }}>
                                                <td style={{ padding: '5px 0' }} colSpan={2}>Total Value</td>
                                                <td style={{ padding: '5px 0', textAlign: 'right' }}>
                                                    ₹{totalDenomValue.toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Cash Amount Words */}
                            <div style={{ fontSize: '12px', borderTop: '1.5px solid #000', borderBottom: '1.5px solid #000', padding: '8px 0', marginBottom: '12px' }}>
                                <strong>Cash Amount Words (₹):</strong> <span style={{ textTransform: 'capitalize', fontStyle: 'italic', marginLeft: '6px' }}>
                                    {totalDenomValue > 0 ? `${numberToWords(totalDenomValue, 'en')} Only` : 'Zero rupees only'}
                                </span>
                            </div>

                            {/* Witness Table and Stamp / Customer Signature Section */}
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '15px' }}>
                                {/* Witnesses Table */}
                                <div style={{ flex: 1.5 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #000' }}>
                                        <thead>
                                            <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #000' }}>
                                                <th style={{ padding: '5px', borderRight: '1px solid #000', textAlign: 'left' }}>Particulars</th>
                                                <th style={{ padding: '5px', borderRight: '1px solid #000', textAlign: 'left' }}>Witness -1</th>
                                                <th style={{ padding: '5px', textAlign: 'left' }}>Witness -2</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid #000' }}>
                                                <td style={{ padding: '5px', fontWeight: '600', borderRight: '1px solid #000' }}>Name</td>
                                                <td style={{ padding: '5px', borderRight: '1px solid #000' }}>{witness1.name || ' '}</td>
                                                <td style={{ padding: '5px' }}>{witness2.name || ' '}</td>
                                            </tr>
                                            <tr style={{ borderBottom: '1px solid #000' }}>
                                                <td style={{ padding: '5px', fontWeight: '600', borderRight: '1px solid #000' }}>Mobile No</td>
                                                <td style={{ padding: '5px', borderRight: '1px solid #000' }}>{witness1.mobile || ' '}</td>
                                                <td style={{ padding: '5px' }}>{witness2.mobile || ' '}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '15px 5px 5px 5px', fontWeight: '600', borderRight: '1px solid #000', verticalAlign: 'bottom' }}>Signature</td>
                                                <td style={{ padding: '15px 5px 5px 5px', borderRight: '1px solid #000', verticalAlign: 'bottom' }}>
                                                    <div style={{ borderTop: '1px dashed #aaa', width: '100%', marginTop: '10px' }}></div>
                                                </td>
                                                <td style={{ padding: '15px 5px 5px 5px', verticalAlign: 'bottom' }}>
                                                    <div style={{ borderTop: '1px dashed #aaa', width: '100%', marginTop: '10px' }}></div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Revenue Stamp & Customer Signature */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '80px',
                                        height: '95px',
                                        border: '1px dashed #888',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        color: '#555',
                                        textAlign: 'center',
                                        padding: '6px',
                                        background: '#fafafa'
                                    }}>
                                        Revenue Stamp
                                    </div>
                                    <div style={{ textAlign: 'center', marginTop: '5px' }}>
                                        <div style={{ borderTop: '1px solid #000', width: '120px', margin: '0 auto 3px' }}></div>
                                        <div style={{ fontSize: '12px', fontWeight: '600' }}>Customer Signature</div>
                                    </div>
                                </div>
                            </div>

                            {/* Clerk Info & Signature Footer */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #000', paddingTop: '10px', marginTop: '12px' }}>
                                <div style={{ fontSize: '12px' }}>
                                    Moi Entry person Name: <strong>{user?.name || 'Anand'}</strong>
                                    <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
                                    Mob No: <strong>{clerkPhone || '—'}</strong>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ borderTop: '1px solid #000', width: '150px', margin: '0 auto 3px' }}></div>
                                    <div style={{ fontSize: '12px', fontWeight: '600' }}>Employee Signature</div>
                                </div>
                            </div>
                        </div>

                        {/* Branding footer */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1a1a2e' }}>Address: Leela Tech</div>
                            <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                                No -3m, 1st Ward, Pasumpon Nagar, Melagudalu, Theni -DT, Gudalur - 625518
                            </div>
                            <div style={{ fontSize: '10px', color: '#555', marginTop: '1px' }}>
                                Mob: 8006880050 | Email: anand@leelatech.co.in
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
