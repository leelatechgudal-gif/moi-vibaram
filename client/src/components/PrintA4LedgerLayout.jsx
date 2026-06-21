import React from 'react';
import { useTranslation } from 'react-i18next';
import logoImg from '../../assets/logo.jpeg';
import splashImg from '../../assets/splash.png';

const SEER_FIELDS = [
    { key: "dress", icon: "👗" },
    { key: "thattuVarisai", icon: "🍽️" },
    { key: "jewels", icon: "💍" },
    { key: "marakkal", icon: "🌾" },
    { key: "maalai", icon: "💐" },
    { key: "arisMootai", icon: "🌾" },
    { key: "paathirangal", icon: "🥘" },
    { key: "others", icon: "📦" }
];const formatGiftItem = (key, item, t) => {
    if (!item) return null;
    const qty = parseFloat(item.quantity) || 0;
    const val = parseFloat(item.value) || 0;

    if (qty === 0 && val === 0) return null;

    const name = t(key);
    if (qty > 0 && val > 0) {
        return t('giftFormatQtyVal', { name, quantity: qty, value: val });
    } else if (qty > 0) {
        return t('giftFormatQty', { name, quantity: qty });
    } else if (val > 0) {
        return t('giftFormatVal', { name, value: val });
    }
    return t('giftFormatNameOnly', { name });
};


const PrintA4LedgerLayout = React.forwardRef(({ event, transactions, clerkName, ownerDetails }, ref) => {
    const { t } = useTranslation();

    // Re-verify that transactions is always sorted by location before rendering
    const sortedTransactions = React.useMemo(() => {
        const valid = (transactions || []).filter(r => r.partyName && r.partyName.trim() && r.cashAmount);
        return [...valid].sort((a, b) => {
            const locA = (a.location || '').trim().toLowerCase();
            const locB = (b.location || '').trim().toLowerCase();
            return locA.localeCompare(locB);
        });
    }, [transactions]);

    const totalAmount = React.useMemo(() => {
        return sortedTransactions.reduce((sum, r) => sum + (parseFloat(r.cashAmount) || 0), 0);
    }, [sortedTransactions]);

    const giftTransactions = React.useMemo(() => {
        return sortedTransactions.filter(r => r.seerVarisai && Object.values(r.seerVarisai).some(v => v && (parseFloat(v.value) > 0 || parseFloat(v.quantity) > 0 || (v.remarks && v.remarks.trim()))));
    }, [sortedTransactions]);

    const seerEntriesCount = giftTransactions.length;

    return (
        <div ref={ref} className="print-a4-ledger" style={{
            padding: '10mm 10mm',
            background: '#fff',
            color: '#000',
            fontFamily: "'Outfit', -apple-system, sans-serif",
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 15mm 15mm 15mm 15mm;
                }
                @media print {
                    html, body {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        background: #fff !important;
                        color: #000 !important;
                    }
                    .print-a4-ledger {
                        display: block !important;
                        padding: 10mm 15mm !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        border: none !important;
                        outline: none !important;
                        box-shadow: none !important;
                    }
                    .print-a4-ledger table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 11px !important;
                        margin-top: 15px !important;
                    }
                    .print-a4-ledger th {
                        border: 1px solid #000 !important;
                        padding: 6px 8px !important;
                        font-weight: bold !important;
                        text-align: left !important;
                        background: #f2f2f2 !important;
                        text-transform: uppercase !important;
                        font-size: 10px !important;
                    }
                    .print-a4-ledger td {
                        border: 1px solid #000 !important;
                        padding: 6px 8px !important;
                        vertical-align: top !important;
                        line-height: 1.3 !important;
                    }
                    .print-a4-ledger .header-title {
                        font-size: 20px !important;
                        font-weight: bold !important;
                        text-align: center !important;
                        margin-bottom: 4px !important;
                        text-transform: uppercase !important;
                    }
                    .print-a4-ledger .header-subtitle {
                        font-size: 12px !important;
                        text-align: center !important;
                        margin-bottom: 20px !important;
                        border-bottom: 1px solid #000 !important;
                        padding-bottom: 10px !important;
                    }
                    .print-a4-ledger .footer-summary {
                        margin-top: 20px !important;
                        text-align: right !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                    }
                    .print-page-break {
                        page-break-before: always !important;
                        break-before: page !important;
                        display: block !important;
                    }
                }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={splashImg} alt="Moi Vibaram Logo" style={{ height: '44px', objectFit: 'contain' }} />
                    <div style={{ textAlign: 'left' }}>
                        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('appName')}</h1>
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', fontWeight: 600 }}>{t('traditionalDigitalLedger')}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={logoImg} alt="Leela Tech Logo" style={{ height: '32px', objectFit: 'contain' }} />
                    <div style={{ fontSize: '10px', fontWeight: '600', textAlign: 'right', lineHeight: '1.2' }}>
                        <div>Contact: +91 80068 80050</div>
                        <div>{ownerDetails?.name || ''}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px', background: '#f9f9f9', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '11px' }}>
                <div><strong>{t('eventName')}:</strong> {event?.eventName || '—'}</div>
                <div><strong>{t('date')}:</strong> {event?.date ? new Date(event.date).toLocaleDateString('en-IN') : '—'}</div>
                <div><strong>{t('venue')}:</strong> {event?.venue || '—'}</div>
                <div><strong>{t('location')}:</strong> {event?.location || '—'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px', background: '#f9f9f9', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '11px' }}>
                <div><strong>Total Entries:</strong> {sortedTransactions.length}</div>
                <div><strong>Clerk Name:</strong> {clerkName || '—'}</div>
                <div><strong>Total Amount:</strong> ₹{totalAmount.toLocaleString('en-IN')}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>S.No</th>
                        <th style={{ width: '250px' }}>Name</th>
                        <th style={{ width: '100px' }}>Mobile</th>
                        <th style={{ width: '130px' }}>Location</th>
                        <th style={{ width: '90px' }}>Payment Type</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTransactions.map((r, i) => (
                        <tr key={r._id || i}>
                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                            <td>
                                <div style={{ fontWeight: '600' }}>
                                    {r.initial ? `${r.initial} . ` : ''}{r.partyName}{r.spouseName ? ` - ${r.spouseName}` : ''}
                                </div>
                                {r.occupation && (
                                    <div style={{ fontSize: '9px', color: '#555', marginTop: '1px' }}>
                                        ({r.occupation})
                                    </div>
                                )}
                            </td>
                            <td>{r.mobile || '—'}</td>
                            <td>{r.location || '—'}</td>
                            <td style={{ textTransform: 'capitalize' }}>
                                {r.paymentType === 'gpay' ? 'GPay' : 'Cash'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '500' }}>
                                ₹{(parseFloat(r.cashAmount) || 0).toLocaleString('en-IN')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="footer-summary">
                Total Amount Received: ₹{totalAmount.toLocaleString('en-IN')}
            </div>

            {/* Branding footer */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px', textAlign: 'center', fontSize: '10px', color: '#333' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1a1a2e' }}>{t('addressLeelaTech')}</div>
                <div style={{ marginTop: '2px' }}>
                    No -3m, 1st Ward, Pasumpon Nagar, Melagudalu, Theni -DT, Gudalur - 625518
                </div>
                <div style={{ marginTop: '1px' }}>
                    Mob: 8006880050 | Email: anand@leelatech.co.in
                </div>
            </div>

            {/* PAGE 2: Seer Varisai Ledger */}
            <div className="print-page-break" style={{ marginTop: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={splashImg} alt="Moi Vibaram Logo" style={{ height: '44px', objectFit: 'contain' }} />
                        <div style={{ textAlign: 'left' }}>
                            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('appName')}</h1>
                            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', fontWeight: 600 }}>{t('traditionalDigitalLedger')}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={logoImg} alt="Leela Tech Logo" style={{ height: '32px', objectFit: 'contain' }} />
                        <div style={{ fontSize: '10px', fontWeight: '600', textAlign: 'right', lineHeight: '1.2' }}>
                            <div>Contact: +91 80068 80050</div>
                            <div>{ownerDetails?.name || ''}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px', background: '#f9f9f9', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '11px' }}>
                    <div><strong>{t('eventName')}:</strong> {event?.eventName || '—'}</div>
                    <div><strong>{t('date')}:</strong> {event?.date ? new Date(event.date).toLocaleDateString('en-IN') : '—'}</div>
                    <div><strong>{t('venue')}:</strong> {event?.venue || '—'}</div>
                    <div><strong>{t('location')}:</strong> {event?.location || '—'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px', background: '#f9f9f9', padding: '8px 10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '11px' }}>
                    <div><strong>Total Entries:</strong> {sortedTransactions.length}</div>
                    <div><strong>Clerk Name:</strong> {clerkName || '—'}</div>
                    <div><strong>Total Seer Varisai (Gifts) Entries:</strong> {seerEntriesCount}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>{t('sNo')}</th>
                            <th style={{ width: '220px' }}>{t('partyName')}</th>
                            <th style={{ width: '100px' }}>{t('mobile')}</th>
                            <th style={{ width: '130px' }}>{t('location')}</th>
                            <th>{t('giftColumn')}</th>
                            <th style={{ width: '90px', textAlign: 'right' }}>{t('valueLabel', { defaultValue: 'Value' })}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {giftTransactions.length > 0 ? (
                            giftTransactions.map((r, i) => (
                                <tr key={r._id || i}>
                                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: '600' }}>
                                            {r.initial ? `${r.initial} . ` : ''}{r.partyName}{r.spouseName ? ` ${t('and')} ${r.spouseName}` : ''}
                                        </div>
                                    </td>
                                    <td>{r.mobile || '—'}</td>
                                    <td>{r.location || '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {SEER_FIELDS.map(f => {
                                                const item = r.seerVarisai[f.key];
                                                const formatted = formatGiftItem(f.key, item, t);
                                                if (!formatted) return null;
                                                return (
                                                    <div key={f.key} style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span>{f.icon}</span>
                                                        <span>{formatted}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '500' }}>
                                        ₹{Object.values(r.seerVarisai || {}).reduce((sum, item) => sum + (parseFloat(item?.value) || 0), 0).toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '12px', color: '#888' }}>
                                    {t('noData')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Branding footer */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px', textAlign: 'center', fontSize: '10px', color: '#333' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1a1a2e' }}>{t('addressLeelaTech')}</div>
                    <div style={{ marginTop: '2px' }}>
                        No -3m, 1st Ward, Pasumpon Nagar, Melagudalu, Theni -DT, Gudalur - 625518
                    </div>
                    <div style={{ marginTop: '1px' }}>
                        Mob: 8006880050 | Email: anand@leelatech.co.in
                    </div>
                </div>
            </div>
        </div>
    );
});

PrintA4LedgerLayout.displayName = 'PrintA4LedgerLayout';

export default PrintA4LedgerLayout;
