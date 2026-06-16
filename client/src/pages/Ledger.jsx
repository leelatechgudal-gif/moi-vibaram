import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { printElement } from '../utils/print';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, partiesAPI, transactionsAPI, tenantAPI } from '../api/api';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import OwnerOtpModal from '../components/OwnerOtpModal';

// Modular imported components
import GiftModal from '../components/GiftModal';
import ClerkSignOffModal from '../components/ClerkSignOffModal';
import PrintReceiptLayout from '../components/PrintReceiptLayout';
import PrintDeclarationLayout from '../components/PrintDeclarationLayout';
import PrintA4LedgerLayout from '../components/PrintA4LedgerLayout';
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
    EyeOff,
    Download
} from 'lucide-react';

const SEER_FIELDS = [
    { key: "dress", icon: "👗" },
    { key: "thattuVarisai", icon: "🍽️" },
    { key: "jewels", icon: "💍" },
    { key: "marakkal", icon: "🌾" },
    { key: "maalai", icon: "💐" },
    { key: "arisMootai", icon: "🌾" },
    { key: "paathirangal", icon: "🥘" },
    { key: "others", icon: "📦" }
];

const defaultSeer = () =>
    Object.fromEntries(
        SEER_FIELDS.map((f) => [f.key, { value: "", quantity: "", remarks: "" }])
    );

export default function Ledger({ sidebarCollapsed, setSidebarCollapsed }) {
    const { t, i18n } = useTranslation();
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

    const getSerialNo = () => {
        if (!printData) return '';
        const idx = rows.findIndex(r => r._id === printData._id);
        const seq = idx !== -1 ? idx + 1 : rows.length + 1;
        return String(seq).padStart(3, '0');
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
    const [ownerDetails, setOwnerDetails] = useState(null);
    const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

    // Gift Modal State
    const [giftModal, setGiftModal] = useState({ show: false, idx: null, data: null });

    const handleGiftFieldChange = (field, key, value) => {
        setGiftModal(prev => ({
            ...prev,
            data: {
                ...prev.data,
                [field]: {
                    ...prev.data[field],
                    [key]: value
                }
            }
        }));
    };

    const handleSaveGifts = () => {
        if (giftModal.idx !== null && giftModal.data) {
            handleFieldChange(giftModal.idx, 'seerVarisai', giftModal.data);
        }
        setGiftModal({ show: false, idx: null, data: null });
    };

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

    const ledgerPrintRef = useRef();
    const handlePrintA4Ledger = () => {
        if (ledgerPrintRef.current) {
            printElement(ledgerPrintRef.current);
        }
    };

    const sortedRows = React.useMemo(() => {
        const validRows = rows.filter(r => r.partyName && r.partyName.trim() && r.cashAmount);
        return [...validRows].sort((a, b) => {
            const locA = (a.location || '').trim().toLowerCase();
            const locB = (b.location || '').trim().toLowerCase();
            return locA.localeCompare(locB);
        });
    }, [rows]);

    const handleExportCSV = () => {
        if (sortedRows.length === 0) {
            alert("No valid ledger entries to export.");
            return;
        }

        const headers = ["S.No", "Name", "Mobile", "Location", "Payment Type", "Amount"];
        const csvRows = sortedRows.map((r, i) => {
            const nameLine1 = `${r.initial ? r.initial + ' . ' : ''}${r.partyName || ''}${r.spouseName ? ' - ' + r.spouseName : ''}`;
            const nameLine2 = r.occupation ? `(${r.occupation})` : '';
            const combinedName = nameLine2 ? `${nameLine1}\n${nameLine2}` : nameLine1;

            return [
                i + 1,
                combinedName,
                r.mobile || '',
                r.location || '',
                r.paymentType === 'gpay' ? 'GPay' : 'Cash',
                r.cashAmount || 0
            ];
        });

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row =>
                row.map(val => {
                    const str = String(val);
                    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const eventNameSafe = (selectedEvent?.eventName || 'ledger').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute("href", url);
        link.setAttribute("download", `${eventNameSafe}_ledger_export.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        fetchOwnerDetails();
    }, []);

    const fetchOwnerDetails = async () => {
        try {
            const res = await tenantAPI.getOwner();
            setOwnerDetails(res.data);
        } catch (err) {
            console.error('[ledger fetchOwnerDetails]', err);
        }
    };

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
            if (!e.target.closest('.search-autocomplete-container')) {
                setShowSearchSuggestions(false);
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
                seerVarisai: t.seerVarisai || defaultSeer(),
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
            ...prev,
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
                seerVarisai: defaultSeer(),
                isEditing: true,
                isSaving: false
            }
        ]);
    };

    const handleEditRow = (idx) => {
        const updated = [...rows];
        updated[idx].original = { ...updated[idx] };
        updated[idx].seerVarisai = updated[idx].seerVarisai || defaultSeer();
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
        updated[idx].seerVarisai = updated[idx].seerVarisai || defaultSeer();
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
            const mobileRegex = /^\d{10}$/;
            if (!mobileRegex.test(row.mobile.trim())) {
                alert('Please enter a valid 10-digit mobile number');
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
                eventId: selectedEventId,
                seerVarisai: row.seerVarisai || defaultSeer()
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
                seerVarisai: pop.seerVarisai || defaultSeer(),
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
                seerVarisai: pop.seerVarisai || defaultSeer(),
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
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.mobile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.spouseName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    const matchingTenantParties = showSearchSuggestions && filterNameQuery.trim()
        ? partiesList.filter(p => {
            const alreadyInRows = rows.some(r => r.partyId === p._id);
            if (alreadyInRows) return false;
            const q = filterNameQuery.toLowerCase();
            return (
                p.name?.toLowerCase().includes(q) ||
                p.mobile?.toLowerCase().includes(q) ||
                p.location?.toLowerCase().includes(q) ||
                p.spouseName?.toLowerCase().includes(q)
            );
        })
        : [];

    const handleAddPartyToLedger = (party) => {
        setFilterNameQuery('');
        setShowSearchSuggestions(false);

        const hasEditingRow = rows.findIndex(r => r.isEditing && !r.partyId && !r.partyName);
        const targetIdx = hasEditingRow !== -1 ? hasEditingRow : rows.length;

        const newRow = {
            tempId: Date.now() + Math.random(),
            initial: party.initial || '',
            partyName: party.name || '',
            spouseName: party.spouseName || '',
            mobile: party.mobile || '',
            location: party.location || '',
            cashAmount: '',
            occupation: party.occupation || '',
            paymentType: 'cash',
            partyId: party._id,
            seerVarisai: defaultSeer(),
            isEditing: true,
            isSaving: false
        };

        setRows(prev => {
            if (hasEditingRow !== -1) {
                const updated = [...prev];
                updated[hasEditingRow] = newRow;
                return updated;
            } else {
                return [...prev, newRow];
            }
        });

        setTimeout(() => {
            const input = document.getElementById(`amount-input-${targetIdx}`);
            if (input) {
                input.focus();
            }
        }, 100);
    };

    const filteredRows = rows.filter(r =>
        r.isEditing ||
        !filterNameQuery.trim() ||
        r.partyName?.toLowerCase().includes(filterNameQuery.trim().toLowerCase()) ||
        r.mobile?.toLowerCase().includes(filterNameQuery.trim().toLowerCase()) ||
        r.location?.toLowerCase().includes(filterNameQuery.trim().toLowerCase()) ||
        r.spouseName?.toLowerCase().includes(filterNameQuery.trim().toLowerCase())
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
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={handlePrintA4Ledger}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Printer size={16} /> Print A4 Ledger
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleExportCSV}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Download size={16} /> Export CSV
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={handleOpenSignOff}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Printer size={16} /> Sign-off & Close Ledger
                        </button>
                    </div>
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
                            <div className="search-autocomplete-container" style={{ position: 'relative', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '4px 10px' }}>
                                    <Search size={16} className="text-muted" style={{ marginRight: 8 }} />
                                    <input
                                        value={filterNameQuery}
                                        onChange={e => {
                                            setFilterNameQuery(e.target.value);
                                            setShowSearchSuggestions(true);
                                        }}
                                        onFocus={() => setShowSearchSuggestions(true)}
                                        placeholder="Search entries by guest name or mobile number..."
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', width: '100%', padding: '6px 0', fontSize: '13px' }}
                                    />
                                </div>
                                {matchingTenantParties.length > 0 && (
                                    <ul className="ledger-autocomplete-list" style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        zIndex: 1000,
                                        marginTop: 4,
                                        maxHeight: 250,
                                        overflowY: 'auto',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        padding: 0,
                                        listStyle: 'none'
                                    }}>
                                        <li style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                            SUGGESTED GUESTS (Click to add to ledger)
                                        </li>
                                        {matchingTenantParties.map((p, pIdx) => (
                                            <li
                                                key={pIdx}
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid var(--glass-border)',
                                                    transition: 'background 0.2s'
                                                }}
                                                onClick={() => handleAddPartyToLedger(p)}
                                                className="hover-bg"
                                            >
                                                <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                                    {p.initial ? `${p.initial} ` : ''}{p.name}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {p.location || 'Unknown Location'} {p.mobile && `• 📞 ${p.mobile}`} {p.spouseName && `• 💍 ${p.spouseName}`}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {filterNameQuery && (
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                    setFilterNameQuery('');
                                    setShowSearchSuggestions(false);
                                }} style={{ height: 38 }}>
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
                                                            {row.partyName} {row.seerVarisai && Object.values(row.seerVarisai).some(v => v && (parseFloat(v.value) > 0 || parseFloat(v.quantity) > 0 || (v.remarks && v.remarks.trim()))) && <span title="Gifts/Seer Varisai Included" style={{ marginLeft: 6 }}>🎁</span>}
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
                                                            id={`amount-input-${idx}`}
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
                                                                    className="ledger-btn-icon"
                                                                    onClick={() => {
                                                                        const currentSeer = row.seerVarisai ? JSON.parse(JSON.stringify(row.seerVarisai)) : defaultSeer();
                                                                        setGiftModal({
                                                                            show: true,
                                                                            idx,
                                                                            data: currentSeer
                                                                        });
                                                                    }}
                                                                    disabled={row.isSaving}
                                                                    title="Add Gifts/Seer Varisai"
                                                                >
                                                                    <Gift size={16} style={row.seerVarisai && Object.values(row.seerVarisai).some(v => v && (parseFloat(v.value) > 0 || parseFloat(v.quantity) > 0 || (v.remarks && v.remarks.trim()))) ? { color: 'var(--primary)' } : {}} />
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                            <button className="btn btn-primary" onClick={handleAddRow} style={{ height: 38, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Plus size={16} /> Add Row
                            </button>
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

            {/* Gift/Seer Varisai Modal */}
            <GiftModal
                show={giftModal.show}
                guestName={giftModal.idx !== null ? (rows[giftModal.idx]?.initial ? `${rows[giftModal.idx].initial} . ` : '') + (rows[giftModal.idx]?.partyName || 'New Entry') : ''}
                giftData={giftModal.data}
                onChangeField={handleGiftFieldChange}
                onClose={() => setGiftModal({ show: false, idx: null, data: null })}
                onSave={handleSaveGifts}
            />

            {/* Clerk Declaration & Sign-off Modal */}
            <ClerkSignOffModal
                show={isSignOffOpen}
                onClose={() => setIsSignOffOpen(false)}
                selectedEvent={selectedEvent}
                user={user}
                denominations={denominations}
                setDenominations={setDenominations}
                totalDenomValue={totalDenomValue}
                noOfPersonsPaid={noOfPersonsPaid}
                totalMoiReceived={totalMoiReceived}
                differenceAmount={differenceAmount}
                gpayAmount={gpayAmount}
                setGpayAmount={setGpayAmount}
                gpayMobNo={gpayMobNo}
                setGpayMobNo={setGpayMobNo}
                clerkPhone={clerkPhone}
                setClerkPhone={setClerkPhone}
                witness1={witness1}
                setWitness1={setWitness1}
                witness2={witness2}
                setWitness2={setWitness2}
                handlePrintDeclaration={handlePrintDeclaration}
                handleCloseLedger={handleCloseLedger}
                isClosingEvent={isClosingEvent}
            />

            {/* Printable Receipt Container - Hidden on screen, visible during print */}
            <div style={{ display: 'none' }}>
                <PrintReceiptLayout
                    ref={printRef}
                    printData={printData}
                    ownerDetails={ownerDetails}
                    user={user}
                    serialNo={getSerialNo()}
                />
            </div>

            {/* Printable Declaration Sheet Container - Hidden on screen, visible during print */}
            {isSignOffOpen && (
                <div style={{ display: 'none' }}>
                    <PrintDeclarationLayout
                        ref={declarationPrintRef}
                        selectedEvent={selectedEvent}
                        user={user}
                        clerkPhone={clerkPhone}
                        noOfPersonsPaid={noOfPersonsPaid}
                        totalMoiReceived={totalMoiReceived}
                        totalDenomValue={totalDenomValue}
                        gpayAmount={gpayAmount}
                        differenceAmount={differenceAmount}
                        gpayMobNo={gpayMobNo}
                        denominations={denominations}
                        witness1={witness1}
                        witness2={witness2}
                    />
                </div>
            )}

            {/* Printable A4 Ledger Container */}
            <div style={{ display: 'none' }}>
                <PrintA4LedgerLayout
                    ref={ledgerPrintRef}
                    event={selectedEvent}
                    transactions={rows}
                    clerkName={user?.name}
                    ownerDetails={ownerDetails}
                />
            </div>
        </div>
    );
}
