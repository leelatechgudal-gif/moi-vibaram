import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { transactionsAPI } from '../api/api'
import { useReactToPrint } from 'react-to-print'

export default function MasterSheet() {
    const { t } = useTranslation()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const printRef = useRef()

    useEffect(() => {
        transactionsAPI.getMasterSheet()
            .then(res => setData(res.data))
            .finally(() => setLoading(false))
    }, [])

    const handlePrint = useReactToPrint({ content: () => printRef.current })
    const handleShare = () => {
        if (navigator.share && data) {
            navigator.share({
                title: 'Master Sheet - MOI VIBARAM',
                text: `Total Invested: ₹${data.grandTotalPaid} | Total Received: ₹${data.grandTotalReceived} | Balance: ₹${data.closingBalance}`,
            })
        }
    }

    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📋 {t('masterSheet')}</h1>
                    <div className="page-subtitle">Global Moi ledger - all events</div>
                </div>
                <div className="flex gap-8 no-print">
                    <button className="btn btn-secondary btn-sm" onClick={handleShare}>📤</button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️</button>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : !data || data.events.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon">📋</div>
                    <div>{t('noData')}</div>
                </div>
            ) : (
                <div ref={printRef}>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                        <div className="stat-card stat-invested">
                            <div className="stat-label">💰 Total {t('moiInvested')}</div>
                            <div className="stat-value">{fmt(data.grandTotalPaid)}</div>
                        </div>
                        <div className="stat-card stat-received">
                            <div className="stat-label">📥 Total {t('moiReceived')}</div>
                            <div className="stat-value">{fmt(data.grandTotalReceived)}</div>
                        </div>
                        <div className={`stat-card ${data.closingBalance >= 0 ? 'stat-balance-pos' : 'stat-balance-neg'}`}>
                            <div className="stat-label">⚖️ {t('closingBalance')}</div>
                            <div className="stat-value">{fmt(data.closingBalance)}</div>
                        </div>
                    </div>

                    {/* Events Table */}
                    <div className="card table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t('eventName')}</th>
                                    <th>{t('date')}</th>
                                    <th>{t('venue')}</th>
                                    <th>{t('location')}</th>
                                    <th>Paid (Invested)</th>
                                    <th>Received</th>
                                    <th>{t('balance')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.events.map((e, i) => (
                                    <tr key={e._id}>
                                        <td className="text-muted">{i + 1}</td>
                                        <td><strong>{e.eventName}</strong></td>
                                        <td>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                                        <td>{e.venue || '—'}</td>
                                        <td>{e.location || '—'}</td>
                                        <td className="text-success">{fmt(e.totalPaid)}</td>
                                        <td className="text-primary">{fmt(e.totalReceived)}</td>
                                        <td style={{ fontWeight: 700 }}>
                                            <span className={e.balance >= 0 ? 'text-primary' : 'text-danger'}>
                                                {e.balance >= 0 ? '+' : ''}{fmt(e.balance)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--primary)', fontWeight: 700 }}>
                                    <td colSpan={5} style={{ textAlign: 'right', paddingRight: 12, fontSize: 12, color: 'var(--text-muted)' }}>GRAND TOTAL</td>
                                    <td className="text-success">{fmt(data.grandTotalPaid)}</td>
                                    <td className="text-primary">{fmt(data.grandTotalReceived)}</td>
                                    <td>
                                        <span className={data.closingBalance >= 0 ? 'text-primary' : 'text-danger'}>
                                            {data.closingBalance >= 0 ? '+' : ''}{fmt(data.closingBalance)}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
