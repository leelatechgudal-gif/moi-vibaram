import React, { useState, useEffect } from 'react';
import { transactionsAPI, eventsAPI } from '../api/api';

export default function BulkUpload() {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [csvText, setCsvText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        eventsAPI.getAll().then(res => setEvents(res.data)).catch(console.error);
    }, []);

    const handleUpload = async () => {
        if (!selectedEventId) return setError('Please select an event first');
        if (!csvText.trim()) return setError('Please paste some CSV data');
        
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const rows = csvText.trim().split('\n').map(row => row.split(','));
            const headers = rows[0].map(h => h.trim().toLowerCase());
            
            const transactions = [];
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i];
                if (cols.length < 2) continue; // Skip empty rows
                
                const t = { eventId: selectedEventId, type: 'received' };
                headers.forEach((h, idx) => {
                    const val = cols[idx]?.trim() || '';
                    if (h === 'date') t.date = val;
                    if (h === 'location') t.location = val;
                    if (h === 'name' || h === 'full name' || h === 'partyname') t.partyName = val;
                    if (h === 'amount' || h === 'cashamount') t.cashAmount = val;
                    if (h === 'spousename') t.spouseName = val;
                    if (h === 'parentname' || h === 'fathername') t.fatherName = val;
                    if (h === 'labels') t.labels = val.split(';').map(l => l.trim());
                });

                if (t.partyName && t.cashAmount) {
                    transactions.push(t);
                }
            }

            if (transactions.length === 0) {
                return setError('No valid transactions found. Ensure Name and Amount are present.');
            }

            const res = await transactionsAPI.bulkCreate({ transactions });
            setSuccess(res.data.message);
            setCsvText('');
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📂 Bulk Upload</h1>
                    <div className="page-subtitle">Upload multiple Moi entries via CSV</div>
                </div>
            </div>

            <div className="card">
                <div className="form-group">
                    <label className="form-label">Select Event *</label>
                    <select className="form-control" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                        <option value="">-- Choose Event --</option>
                        {events.map(e => <option key={e._id} value={e._id}>{e.eventName}</option>)}
                    </select>
                </div>
                
                <div className="form-group mt-16">
                    <label className="form-label">Paste CSV Data</label>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Expected headers: Date, Location, Name, Amount, SpouseName, ParentName, Labels
                    </div>
                    <textarea 
                        className="form-control" 
                        rows={10} 
                        value={csvText} 
                        onChange={e => setCsvText(e.target.value)}
                        placeholder="Date, Location, Name, Amount, SpouseName, ParentName, Labels\n2026-04-21, Chennai, Raj, 1000, Priya, Murugan, VIP"
                    />
                </div>

                {error && <div className="error-msg mt-8">{error}</div>}
                {success && <div className="success-msg mt-8">{success}</div>}

                <button className="btn btn-primary mt-16" onClick={handleUpload} disabled={loading}>
                    {loading ? <span className="spinner" /> : '🚀 Upload Data'}
                </button>
            </div>
        </div>
    );
}
