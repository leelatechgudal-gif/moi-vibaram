import React from 'react';
import { useTranslation } from 'react-i18next';
import { numberToWords } from '../utils/numberToWords';
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
];

const formatGiftItem = (key, item, t) => {
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

const PrintReceiptLayout = React.forwardRef(({ printData, ownerDetails, user, serialNo }, ref) => {
    const { t, i18n } = useTranslation();

    return (
        <div ref={ref} className="print-receipt" style={{
            padding: '4mm 4mm',
            background: '#fff',
            color: '#000',
            fontFamily: "monospace, Courier, 'Courier New'",
            width: '80mm',
            maxWidth: '80mm',
            margin: '0 auto',
            boxSizing: 'border-box'
        }}>
            <style>{`
                @page {
                    size: 80mm auto;
                    margin: 0 !important;
                }
                @media print {
                    html, body {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        background: #fff !important;
                        color: #000 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-receipt {
                        display: block !important;
                        padding: 4mm 4mm !important;
                        margin: 0 auto !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        font-size: 11px !important;
                        line-height: 1.3 !important;
                        box-sizing: border-box !important;
                        font-family: monospace, Courier, 'Courier New' !important;
                    }
                    .print-receipt h2 {
                        font-size: 14px !important;
                        margin: 0 0 2px 0 !important;
                        font-weight: 800 !important;
                        text-transform: uppercase !important;
                    }
                    .print-receipt .sub-title {
                        font-size: 8px !important;
                        margin-bottom: 4px !important;
                        font-weight: bold !important;
                    }
                    .print-receipt .section-header {
                        font-size: 11px !important;
                        font-weight: bold !important;
                        margin: 4px 0 !important;
                        text-transform: uppercase !important;
                        text-align: center !important;
                    }
                    .print-receipt .dashed-divider {
                        border-top: 1px dashed #000 !important;
                        margin: 6px 0 !important;
                        height: 0 !important;
                    }
                    .print-receipt table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 11px !important;
                        margin: 2px 0 !important;
                        table-layout: fixed !important;
                    }
                    .print-receipt td {
                        padding: 1px 0 !important;
                        vertical-align: top !important;
                    }
                }
            `}</style>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <img src={splashImg} alt="Moi Vibaram Logo" style={{ height: '32px', maxWidth: '100px', objectFit: 'contain', marginBottom: '4px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                <h2 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: '800', letterSpacing: '0.5px' }}>{t('appName')}</h2>
                <div className="sub-title" style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{t('traditionalDigitalLedger')}</div>
                <div className="sub-title" style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Contact : +91 80068 80050 </div>
            </div>

            <div className="dashed-divider" />

            {/* Section 1: Host Details */}
            <div className="section-header">{t('hostDetails')}</div>
            <table>
                <tbody>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('date')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData ? new Date(printData.eventId?.date || printData.date).toLocaleDateString('en-GB') : ''}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('hostEventName')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData ? (printData.eventId?.eventName || printData.eventName || '') : ''}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('partyName')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{ownerDetails?.name || user?.name || ''}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('hostWifeName')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{ownerDetails?.spouseName || '—'}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('venue')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData ? (printData.eventId?.venue || printData.eventId?.location || printData.location || '') : ''}</td>
                    </tr>
                </tbody>
            </table>

            <div className="dashed-divider" />

            {/* Section 2: Donor Details */}
            <div className="section-header">{t('donorDetails')}</div>
            <table>
                <tbody>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('partyName')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData ? `${printData.initial ? printData.initial + ' ' : ''}${printData.partyName}` : ''}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('donorSpouseName')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData?.spouseName || '—'}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('town')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData?.location || '—'}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('occupation')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData?.occupation || '—'}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('donorMobile')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData?.mobile || '—'}</td>
                    </tr>
                </tbody>
            </table>

            <div className="dashed-divider" />

            {/* Section 3: Contribution Details */}
            <div className="section-header">{t('contributionDetails')}</div>
            <table>
                <tbody>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('receiptSerialNo')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{serialNo}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('paymentMethod')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData?.paymentType === 'gpay' ? (i18n.language?.startsWith('ta') ? 'ஜிபே' : 'GPay') : (i18n.language?.startsWith('ta') ? 'பணம்' : 'Cash')}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('paymentTime')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{printData ? new Date(printData.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('contributionAmount')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td style={{ fontWeight: 'bold' }}>{printData ? `${printData.cashAmount}/-` : ''}</td>
                    </tr>
                    <tr>
                        <td colSpan="3" style={{ paddingLeft: '130px', fontSize: '10px', fontStyle: 'italic', wordBreak: 'break-word', paddingTop: '2px', paddingBottom: '4px' }}>
                            {printData ? numberToWords(printData.cashAmount, i18n.language?.startsWith('ta') ? 'ta' : 'en') : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ width: '115px', whiteSpace: 'nowrap' }}>{t('moiClerk')}</td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td>{user?.name || ''}</td>
                    </tr>
                </tbody>
            </table>

            {printData?.seerVarisai && Object.values(printData.seerVarisai).some(v => v && (parseFloat(v.value) > 0 || parseFloat(v.quantity) > 0)) && (
                <>
                    <div className="dashed-divider" />
                    <div className="section-header">{t('giftDetails')}</div>
                    <table>
                        <tbody>
                            {SEER_FIELDS.map(f => {
                                const item = printData.seerVarisai[f.key];
                                const formatted = formatGiftItem(f.key, item, t);
                                if (!formatted) return null;
                                return (
                                    <tr key={f.key}>
                                        <td style={{ width: '25px', textAlign: 'center' }}>{f.icon}</td>
                                        <td>{formatted}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </>
            )}

            <div className="dashed-divider" />

            {/* Section 4: App Summary */}
            <div style={{ padding: '8px 2px', textAlign: 'center' }}>
                <div className="section-header">{t('appSummaryTitle')}</div>
                <div style={{ fontSize: '10px', lineHeight: '1.5' }}>
                    <div>{t('appSummaryBullet1')}</div>
                    <div>{t('appSummaryBullet2')}</div>
                    <div>{t('appSummaryBullet3')}</div>
                    <div>{t('appSummaryBullet4')}</div>
                </div>
            </div>

            <div className="dashed-divider" />

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                {t('thankYou')}
            </div>
            <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '9px', color: '#333' }}>
                Powered by Leela Tech
            </div>
        </div>
    );
});

PrintReceiptLayout.displayName = 'PrintReceiptLayout';

export default PrintReceiptLayout;
