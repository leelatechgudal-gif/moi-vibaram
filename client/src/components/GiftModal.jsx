import React from 'react';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react';

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

export default function GiftModal({ show, guestName, giftData, onChangeField, onClose, onSave }) {
    const { t } = useTranslation();

    if (!show || !giftData) return null;

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div className="modal" style={{ maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <Gift size={20} className="text-primary" />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                            Add Seer Varisai (Gifts)
                        </h3>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                            For Guest: <strong>{guestName || 'New Entry'}</strong>
                        </div>
                    </div>
                </div>

                <div className="seer-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
                    {SEER_FIELDS.map((f) => (
                        <div
                            key={f.key}
                            style={{
                                background: "var(--glass)",
                                padding: 10,
                                borderRadius: 8,
                                border: '1px solid var(--glass-border)'
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '12px' }}>
                                {f.icon} {t(f.key)}
                            </div>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 4,
                                }}
                            >
                                <div>
                                    <label
                                        className="seer-item"
                                        style={{ fontSize: '9px', color: "var(--text-muted)", display: 'block', marginBottom: '2px' }}
                                    >
                                        Value (₹)
                                    </label>
                                    <input
                                        className="form-control"
                                        style={{ fontSize: 11, padding: "4px 6px", height: '28px' }}
                                        type="number"
                                        min="0"
                                        value={giftData[f.key]?.value || ''}
                                        onChange={(e) =>
                                            onChangeField(f.key, "value", e.target.value)
                                        }
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label
                                        className="seer-item"
                                        style={{ fontSize: '9px', color: "var(--text-muted)", display: 'block', marginBottom: '2px' }}
                                    >
                                        Qty
                                    </label>
                                    <input
                                        className="form-control"
                                        style={{ fontSize: 11, padding: "4px 6px", height: '28px' }}
                                        type="number"
                                        min="0"
                                        value={giftData[f.key]?.quantity || ''}
                                        onChange={(e) =>
                                            onChangeField(f.key, "quantity", e.target.value)
                                        }
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <input
                                className="form-control"
                                style={{ fontSize: 11, padding: "4px 6px", height: '28px', marginTop: 6 }}
                                value={giftData[f.key]?.remarks || ''}
                                onChange={(e) =>
                                    onChangeField(f.key, "remarks", e.target.value)
                                }
                                placeholder="Remarks..."
                            />
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={onSave}
                    >
                        Confirm Gifts
                    </button>
                </div>
            </div>
        </div>
    );
}
