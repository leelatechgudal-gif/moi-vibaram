import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';

export default function OwnerOtpModal({ show, onConfirm, onCancel, loading, message, error }) {
    const [otp, setOtp] = useState('');

    if (!show) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (otp.trim().length !== 6) {
            alert('Please enter a 6-digit OTP code.');
            return;
        }
        onConfirm(otp.trim());
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
            <div className="modal" style={{ maxWidth: 400, width: '90%' }}>
                <div className="modal-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <KeyRound size={24} /> Edit Approval Required
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 24, lineHeight: 1.5 }}>
                        <div style={{ fontSize: 14, color: 'var(--text)' }}>
                            {message || "An OTP was sent to the owner's mobile to approve this edit."}
                        </div>
                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label className="form-label">Enter 6-Digit OTP</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={otp} 
                                onChange={(e) => setOtp(e.target.value)} 
                                required 
                                autoFocus
                                placeholder="Enter OTP"
                                maxLength={6}
                                style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20, fontWeight: 700 }}
                            />
                        </div>
                        {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}
                    </div>
                    <div className="flex gap-8">
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                            {loading ? <span className="spinner" /> : 'Approve & Save'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
