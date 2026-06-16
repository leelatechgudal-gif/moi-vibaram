import React from 'react';
import { useTranslation } from 'react-i18next';
import { numberToWords } from '../utils/numberToWords';
import logoImg from '../../assets/logo.jpeg';
import iconImg from '../../assets/icon.png';
import splashImg from '../../assets/splash.png';

const PrintDeclarationLayout = React.forwardRef(({
    selectedEvent,
    user,
    clerkPhone,
    noOfPersonsPaid,
    totalMoiReceived,
    totalDenomValue,
    gpayAmount,
    differenceAmount,
    gpayMobNo,
    denominations,
    witness1,
    witness2
}, ref) => {
    const { t, i18n } = useTranslation();

    return (
        <div ref={ref} className="print-declaration-sheet" style={{
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

            <div style={{
                boxSizing: 'border-box',
                display: 'block',
                paddingTop: '10px'
            }}>
                <div style={{ display: 'block' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                            <img src={splashImg} alt="Moi Vibaram Logo" style={{ height: '40px', objectFit: 'contain' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={logoImg} alt="Leela Tech Logo" style={{ height: '32px', objectFit: 'contain' }} />
                            <img src={iconImg} alt="Leela Tech Icon" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
                            <div style={{ fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>
                                {t('date')} : {new Date(selectedEvent?.date || new Date()).toLocaleDateString('en-IN').replace(/\//g, '/')}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '13px', color: '#333' }}>{t('welcomeText')}, <strong>{user?.name || 'Anand'}</strong></div>
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '1px' }}>{t('atAGlance')}</div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '1px', margin: '0 0 2px 0', color: '#000' }}>{t('appName')}</h2>
                        <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{t('tagline')}</div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000000', textDecoration: 'underline', marginTop: '4px', textTransform: 'uppercase' }}>{t('declarationForm')}</h3>
                    </div>

                    {/* Event Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: '12px', borderBottom: '1.5px solid #000', paddingBottom: '8px' }}>
                        <div style={{ fontSize: '13px' }}><strong>{t('eventName')}:</strong> {selectedEvent?.eventName || '—'}</div>
                        <div style={{ fontSize: '13px' }}><strong>{t('location')}:</strong> {selectedEvent?.location || '—'}</div>
                        <div style={{ fontSize: '13px' }}><strong>{t('venue')}:</strong> {selectedEvent?.venue || '—'}</div>
                        <div style={{ fontSize: '13px' }}><strong>{t('mobile')}:</strong> {clerkPhone || '—'}</div>
                    </div>

                    {/* Cash Report & Denominations columns */}
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
                        {/* Left Side: Moi Cash Report */}
                        <div style={{ flex: 1.2 }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#000000', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                {t('moiCashReport')}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                    <span>{t('noOfPersonsPaid')}</span>
                                    <strong>{noOfPersonsPaid}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                    <span>{t('totalMoiReceived')}</span>
                                    <strong>₹{totalMoiReceived.toLocaleString('en-IN')}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                    <span>{t('cashAmountText')}</span>
                                    <strong>₹{totalDenomValue.toLocaleString('en-IN')}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                    <span>{t('gpayAmountText')}</span>
                                    <strong>₹{(parseFloat(gpayAmount) || 0).toLocaleString('en-IN')}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                                    <span>{t('differenceAmountText')}</span>
                                    <strong style={{ color: '#000000' }}>
                                        ₹{differenceAmount.toLocaleString('en-IN')}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '3px', marginTop: '4px' }}>
                                    <span>{t('gpayMobNoText')}</span>
                                    <strong>{gpayMobNo || '—'}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Denominations */}
                        <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#000000', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>
                                {t('denominationsText')}
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
                                        <td style={{ padding: '3px 0' }}>{t('others')} *</td>
                                        <td style={{ padding: '3px 0', textAlign: 'center' }}>
                                            {denominations.coins ? '—' : '0'}
                                        </td>
                                        <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: '600' }}>
                                            ₹{(parseFloat(denominations.coins) || 0).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                    <tr style={{ fontWeight: '800', borderTop: '1.5px solid #000', fontSize: '13px' }}>
                                        <td style={{ padding: '5px 0' }} colSpan={2}>{t('totalValue')}</td>
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
                        <strong>{t('cashAmountWords')}:</strong> <span style={{ textTransform: 'capitalize', fontStyle: 'italic', marginLeft: '6px' }}>
                            {totalDenomValue > 0 ? numberToWords(totalDenomValue, i18n.language?.startsWith('ta') ? 'ta' : 'en') : (i18n.language?.startsWith('ta') ? 'பூஜ்யம் ரூபாய் மட்டும்' : 'Zero rupees only')}
                        </span>
                    </div>

                    {/* Witness Table and Stamp / Customer Signature Section */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '15px' }}>
                        {/* Witnesses Table */}
                        <div style={{ flex: 1.5 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #000' }}>
                                <thead>
                                    <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #000' }}>
                                        <th style={{ padding: '5px', borderRight: '1px solid #000', textAlign: 'left' }}>{t('particulars')}</th>
                                        <th style={{ padding: '5px', borderRight: '1px solid #000', textAlign: 'left' }}>{t('witness1')}</th>
                                        <th style={{ padding: '5px', textAlign: 'left' }}>{t('witness2')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                        <td style={{ padding: '5px', fontWeight: '600', borderRight: '1px solid #000' }}>{t('partyName')}</td>
                                        <td style={{ padding: '5px', borderRight: '1px solid #000' }}>{witness1.name || ' '}</td>
                                        <td style={{ padding: '5px' }}>{witness2.name || ' '}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                        <td style={{ padding: '5px', fontWeight: '600', borderRight: '1px solid #000' }}>{t('mobile')}</td>
                                        <td style={{ padding: '5px', borderRight: '1px solid #000' }}>{witness1.mobile || ' '}</td>
                                        <td style={{ padding: '5px' }}>{witness2.mobile || ' '}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '15px 5px 5px 5px', fontWeight: '600', borderRight: '1px solid #000', verticalAlign: 'bottom' }}>{t('signature')}</td>
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
                                {t('revenueStamp')}
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '5px' }}>
                                <div style={{ borderTop: '1px solid #000', width: '120px', margin: '0 auto 3px' }}></div>
                                <div style={{ fontSize: '12px', fontWeight: '600' }}>{t('customerSignature')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Clerk Info & Signature Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #000', paddingTop: '10px', marginTop: '12px' }}>
                        <div style={{ fontSize: '12px' }}>
                            {t('clerkName')}: <strong>{user?.name || 'Anand'}</strong>
                            <span style={{ margin: '0 10px', color: '#ccc' }}>|</span>
                            {t('mobile')}: <strong>{clerkPhone || '—'}</strong>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #000', width: '150px', margin: '0 auto 3px' }}></div>
                            <div style={{ fontSize: '12px', fontWeight: '600' }}>{t('employeeSignature')}</div>
                        </div>
                    </div>
                </div>

                {/* Branding footer */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#1a1a2e' }}>{t('addressLeelaTech')}</div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                        No -3m, 1st Ward, Pasumpon Nagar, Melagudalu, Theni -DT, Gudalur - 625518
                    </div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '1px' }}>
                        Mob: 8006880050 | Email: anand@leelatech.co.in
                    </div>
                </div>
            </div>
        </div>
    );
});

PrintDeclarationLayout.displayName = 'PrintDeclarationLayout';

export default PrintDeclarationLayout;
