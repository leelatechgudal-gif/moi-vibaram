import React, { useState, useEffect, useRef } from 'react';
import { transactionsAPI, eventsAPI } from '../api/api';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { UploadCloud, Download, Gift, Coins, Upload } from 'lucide-react';

const TEMPLATE_HEADERS = [
    'S.No', 'Initial', 'Name', 'FatherName', 'MotherName', 'SpouseName', 
    'Nickname', 'Occupation', 'Mobile', 'Location', 'Street', 'Remarks', 'Labels', 'Amount', 'Date', 'EventName'
];

export default function BulkUpload() {
    const { t } = useTranslation();
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [globalType, setGlobalType] = useState('received');
    const [parsedData, setParsedData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef();

    useEffect(() => {
        eventsAPI.getAll().then(res => setEvents(res.data)).catch(console.error);
    }, []);

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Moi_Template");
        XLSX.writeFile(wb, "Moi_Vibaram_Template.xlsx");
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError('');
        setSuccess('');

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (data.length <= 1) {
                    throw new Error("File is empty or contains only headers");
                }

                const headers = data[0].map(h => String(h).trim().toLowerCase());
                const rows = data.slice(1);

                const mapped = rows.map((row, index) => {
                    if (row.length === 0) return null;
                    const item = {};
                    headers.forEach((h, idx) => {
                        const val = row[idx];
                        if (h === 'initial') item.initial = val;
                        if (h === 'name') item.partyName = val;
                        if (h === 'fathername') item.fatherName = val;
                        if (h === 'mothername') item.motherName = val;
                        if (h === 'spousename') item.spouseName = val;
                        if (h === 'nickname') item.nickname = val;
                        if (h === 'occupation') item.occupation = val;
                        if (h === 'location') item.location = val;
                        if (h === 'street') item.street = val;
                        if (h === 'mobile') item.mobile = val;
                        if (h === 'amount') item.cashAmount = val;
                        if (h === 'date') item.date = val;
                        if (h === 'eventname' || h === 'event') item.eventName = val;
                        if (h === 'remarks') item.remarks = val;
                        if (h === 'labels') item.labels = String(val).split(';').map(l => l.trim());
                    });
                    return item;
                }).filter(i => i && (i.partyName || i.cashAmount));

                setParsedData(mapped);
            } catch (err) {
                setError("Failed to parse file: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleUpload = async () => {
        if (globalType === 'received' && !selectedEventId && parsedData.some(t => !t.eventName)) {
            return setError('Please select an event from the dropdown OR ensure all rows have an EventName in the file');
        }
        if (parsedData.length === 0) return setError('No data to upload');

        setLoading(true);
        setError('');

        try {
            const transactions = parsedData.map(t => ({
                ...t,
                eventId: (globalType === 'received' && selectedEventId) ? selectedEventId : undefined,
                eventName: t.eventName || (globalType === 'paid' ? 'External Event' : undefined),
                type: globalType,
                // Basic cleanup
                cashAmount: parseFloat(t.cashAmount) || 0
            }));

            const res = await transactionsAPI.bulkCreate({ transactions });
            setSuccess(res.data.message);
            setParsedData([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: 900 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UploadCloud size={28} /> Bulk Upload</h1>
                    <div className="page-subtitle">Import multiple Moi entries from Excel or CSV</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
                    <Download size={16} style={{ marginRight: 6 }} /> Download Template
                </button>
            </div>

            <div className="card">
                <div className="form-grid">
                    {globalType === 'received' && (
                        <div className="form-group">
                            <label className="form-label">Select Event (Optional if EventName is in file)</label>
                            <select className="form-control" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                                <option value="">-- Choose Event --</option>
                                {events.map(e => (
                                    <option key={e._id} value={e._id}>
                                        {e.eventName} ({new Date(e.date).toLocaleDateString('en-IN')})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Global Moi Type</label>
                        <select className="form-control" value={globalType} onChange={e => setGlobalType(e.target.value)}>
                            <option value="received">{t('received')} (They gave me)</option>
                            <option value="paid">{t('paid')} (I gave them)</option>
                        </select>
                    </div>
                </div>
                
                <div className="form-group mt-16">
                    <label className="form-label">Upload File (.xlsx or .csv)</label>
                    <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        className="form-control" 
                        onChange={handleFileChange}
                        ref={fileInputRef}
                    />
                </div>

                {error && <div className="error-msg mt-8">{error}</div>}
                {success && <div className="success-msg mt-8">{success}</div>}

                {parsedData.length > 0 && (
                    <div className="mt-24">
                        <div className="flex-between mb-8">
                            <h3 style={{ fontWeight: 700 }}>Data Preview ({parsedData.length} rows)</h3>
                            <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
                                {loading ? <span className="spinner" /> : <><Upload size={16} style={{ marginRight: 6 }} /> Confirm & Upload All</>}
                            </button>
                        </div>
                        <div className="table-wrap" style={{ maxHeight: 400, overflow: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>{globalType === 'received' ? 'Location' : 'Event'}</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{row.initial ? `${row.initial} ` : ''}{row.partyName}</strong></td>
                                            <td>{globalType === 'received' ? (row.location || '—') : (row.eventName || '—')}</td>
                                            <td style={{ fontWeight: 600 }}>₹{row.cashAmount}</td>
                                            <td className="text-muted">{row.date || 'Auto'}</td>
                                            <td>
                                                {(!row.partyName || !row.cashAmount) ? 
                                                    <span className="badge badge-warning">Invalid</span> : 
                                                    <span className="badge badge-success">Ready</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
