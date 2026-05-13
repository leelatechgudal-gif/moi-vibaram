import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function PasswordConfirmModal({ show, title, message, onConfirm, onCancel, loading }) {
    const [password, setPassword] = useState('');

    if (!show) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(password);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
            <div className="modal" style={{ maxWidth: 400, width: '90%' }}>
                <div className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trash2 size={24} /> {title || 'Confirm Deletion'}
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 24, lineHeight: 1.5 }}>
                        <div>{message || 'Are you sure you want to delete this?'}</div>
                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label className="form-label">Enter Password to Confirm</label>
                            <input 
                                type="password" 
                                className="form-control" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                autoFocus
                                placeholder="Your password"
                            />
                        </div>
                    </div>
                    <div className="flex gap-8">
                        <button type="submit" className="btn btn-danger" disabled={loading} style={{ flex: 1 }}>
                            {loading ? <span className="spinner" /> : 'Delete'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
