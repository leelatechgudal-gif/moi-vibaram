import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { transactionsAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { useReactToPrint } from 'react-to-print'

export default function Dashboard() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const [data, setData] = useState(null)
    const [recent, setRecent] = useState([])
    const [loading, setLoading] = useState(true)
    const printRef = useRef()

    useEffect(() => {
        Promise.all([transactionsAPI.getMasterSheet(), transactionsAPI.getAll({})])
            .then(([ms, tx]) => {
                setData(ms.data)
                setRecent(tx.data.slice(0, 5))
            })
            .finally(() => setLoading(false))
    }, [])

    const handlePrint = useReactToPrint({ content: () => printRef.current })
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: 'MOI VIBARAM', text: `Invested: ₹${data?.grandTotalPaid || 0} | Received: ₹${data?.grandTotalReceived || 0}` })
        }
    }

    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`

    return (
        <div ref={printRef}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">👋 Welcome, {user?.name}</h1>
                    <div className="page-subtitle">Your Moi Ledger at a glance</div>
                </div>
                <div className="flex gap-8 no-print">
                    <button className="btn btn-secondary btn-sm" onClick={handleShare}>📤 {t('share')}</button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️ {t('print')}</button>
                    <Link to="/transactions/new" className="btn btn-primary btn-sm">➕ {t('createMoi')}</Link>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
                        <div className="stat-card stat-invested">
                            <div className="stat-label">💰 {t('moiInvested')}</div>
                            <div className="stat-value">{fmt(data?.grandTotalPaid)}</div>
                            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Total paid out</div>
                        </div>
                        <div className="stat-card stat-received">
                            <div className="stat-label">📥 {t('moiReceived')}</div>
                            <div className="stat-value">{fmt(data?.grandTotalReceived)}</div>
                            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Total received</div>
                        </div>
                        <div className={`stat-card ${(data?.closingBalance || 0) >= 0 ? 'stat-balance-pos' : 'stat-balance-neg'}`}>
                            <div className="stat-label">⚖️ {t('closingBalance')}</div>
                            <div className="stat-value">{fmt(data?.closingBalance)}</div>
                            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>Net balance</div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex-between mb-16">
                            <h3 style={{ fontWeight: 700 }}>Recent Transactions</h3>
                            <Link to="/master-sheet" className="auth-link" style={{ fontSize: 13 }}>View All →</Link>
                        </div>
                        {recent.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <div>No transactions yet. <Link to="/transactions/new" className="auth-link">Create your first Moi</Link></div>
                            </div>
                        ) : (
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>{t('partyName')}</th>
                                            <th>{t('eventName')}</th>
                                            <th>{t('type')}</th>
                                            <th>{t('amount')}</th>
                                            <th>{t('date')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recent.map(tx => (
                                            <tr key={tx._id}>
                                                <td><strong>{tx.partyName}</strong><br /><span className="text-muted">{tx.location}</span></td>
                                                <td>{tx.eventId?.eventName}</td>
                                                <td><span className={`badge ${tx.type === 'received' ? 'badge-primary' : 'badge-success'}`}>{t(tx.type)}</span></td>
                                                <td style={{ fontWeight: 600 }}>{fmt(tx.cashAmount)}</td>
                                                <td className="text-muted">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
