import React from 'react';
import { useTranslation } from 'react-i18next';
import { numberToWords } from '../utils/numberToWords';
import { Coins, X, Printer, Check } from 'lucide-react';
import logoImg from '../../assets/logo.jpeg';
import iconImg from '../../assets/icon.png';
import splashImg from '../../assets/splash.png';

export default function ClerkSignOffModal({
    show,
    onClose,
    selectedEvent,
    user,
    denominations,
    setDenominations,
    totalDenomValue,
    noOfPersonsPaid,
    totalMoiReceived,
    differenceAmount,
    gpayAmount,
    setGpayAmount,
    gpayMobNo,
    setGpayMobNo,
    clerkPhone,
    setClerkPhone,
    witness1,
    setWitness1,
    witness2,
    setWitness2,
    handlePrintDeclaration,
    handleCloseLedger,
    isClosingEvent
}) {
    const { t, i18n } = useTranslation();

    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal" style={{ maxWidth: '950px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
                    <h2 className="modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)' }}>
                        <Coins size={24} /> Clerk Declaration & Sign-off
                    </h2>
                    <button className="ledger-btn-icon" onClick={onClose} style={{ padding: '6px' }}>
                        <X size={18} />
                    </button>
                </div>

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
                                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555' }}>{t('tagline')}</div>
                                <div style={{ fontWeight: '700', color: '#e74c3c', textDecoration: 'underline', marginTop: '6px', fontSize: '14px' }}>{t('declarationForm')}</div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
                                <div><strong>{t('eventName')}:</strong> {selectedEvent?.eventName}</div>
                                <div><strong>{t('location')}:</strong> {selectedEvent?.location}</div>
                                <div><strong>{t('venue')}:</strong> {selectedEvent?.venue}</div>
                                <div><strong>{t('mobile')}:</strong> {clerkPhone}</div>
                            </div>

                            <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
                                <div style={{ flex: 1.2 }}>
                                    <div style={{ fontWeight: '700', borderBottom: '1px solid #ddd', paddingBottom: '3px', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', color: '#e74c3c' }}>{t('moiCashReport')}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>{t('noOfPersonsPaid')}:</span><strong>{noOfPersonsPaid}</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>{t('totalMoiReceived')}:</span><strong>₹{totalMoiReceived}</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>{t('cashAmountText')}:</span><strong>₹{totalDenomValue}</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>{t('gpayAmountText')}:</span><strong>₹{gpayAmount}</strong></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span>{t('differenceAmountText')}:</span><strong style={{ color: differenceAmount !== 0 ? '#e74c3c' : '#000' }}>₹{differenceAmount}</strong></div>
                                </div>
                                <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '12px' }}>
                                    <div style={{ fontWeight: '700', borderBottom: '1px solid #ddd', paddingBottom: '3px', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', color: '#e74c3c' }}>{t('denominationsText')}</div>
                                    {[500, 200, 100, 50, 20, 10].map(d => (
                                        <div key={d} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                            <span>{d} x</span>
                                            <span>{denominations[d] || 0}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', marginTop: '4px', fontWeight: 'bold' }}>
                                        <span>{t('total')}:</span>
                                        <span>₹{totalDenomValue}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', marginBottom: '12px', fontSize: '11px' }}>
                                <strong>{t('amountInWords')}:</strong> <span style={{ textTransform: 'capitalize', fontStyle: 'italic' }}>
                                    {totalDenomValue > 0 ? numberToWords(totalDenomValue, i18n.language?.startsWith('ta') ? 'ta' : 'en') : (i18n.language?.startsWith('ta') ? 'பூஜ்யம் ரூபாய் மட்டும்' : 'Zero rupees only')}
                                </span>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #000', marginBottom: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #000' }}>
                                        <th style={{ padding: '4px', borderRight: '1px solid #000' }}>{t('witnesses')}</th>
                                        <th style={{ padding: '4px', borderRight: '1px solid #000' }}>{t('witness1')}</th>
                                        <th style={{ padding: '4px' }}>{t('witness2')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                        <td style={{ padding: '4px', borderRight: '1px solid #000' }}><strong>{t('partyName')}</strong></td>
                                        <td style={{ padding: '4px', borderRight: '1px solid #000' }}>{witness1.name}</td>
                                        <td style={{ padding: '4px' }}>{witness2.name}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px', borderRight: '1px solid #000' }}><strong>{t('mobile')}</strong></td>
                                        <td style={{ padding: '4px', borderRight: '1px solid #000' }}>{witness1.mobile}</td>
                                        <td style={{ padding: '4px' }}>{witness2.mobile}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
                                <div style={{ fontSize: '11px' }}>
                                    {t('clerkSignature')}: <strong>{user?.name}</strong>
                                </div>
                                <div style={{ borderTop: '1px solid #000', width: '110px', textAlign: 'center', fontSize: '10px', paddingTop: '4px', fontWeight: 'bold' }}>
                                    {t('clerkSignature')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={onClose}>
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
    );
}
