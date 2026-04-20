import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { eventsAPI } from '../api/api'
import { useReactToPrint } from 'react-to-print'

export default function UpcomingEvents() {
    const { t } = useTranslation()
    const [upcoming, setUpcoming] = useState([])
    const [loading, setLoading] = useState(true)
    const printRef = useRef()

    useEffect(() => {
        eventsAPI.getUpcoming()
            .then(res => setUpcoming(res.data))
            .finally(() => setLoading(false))
    }, [])

    const handlePrint = useReactToPrint({ content: () => printRef.current })
    const handleShare = () => navigator.share?.({ title: 'Upcoming Moi - MOI VIBARAM', text: `${upcoming.length} pending Moi payments` })
    const fmt = n => `₹${(n || 0).toLocaleString('en-IN')}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📅 {t('upcomingEvents')}</h1>
                    <div className="page-subtitle">People who gave you Moi but haven't received it back yet</div>
                </div>
                <div className="flex gap-8 no-print">
                    <button className="btn btn-secondary btn-sm" onClick={handleShare}>📤</button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️</button>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : upcoming.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon">🎊</div>
                    <div>All caught up! No pending Moi payments.</div>
                </div>
            ) : (
                <div ref={printRef}>
                    <div className="card" style={{ marginBottom: 12, padding: '12px 20px' }}>
                        <span className="badge badge-warning">⚠️ {upcoming.length} pending payment(s)</span>
                    </div>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t('partyName')}</th>
                                    <th>{t('mobile')}</th>
                                    <th>{t('location')}</th>
                                    <th>Event</th>
                                    <th>Amount Received</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {upcoming.map((u, i) => (
                                    <tr key={i}>
                                        <td className="text-muted">{i + 1}</td>
                                        <td><strong>{u.partyName}</strong></td>
                                        <td>{u.mobile || '—'}</td>
                                        <td>{u.location || '—'}</td>
                                        <td>{u.event?.eventName || '—'}</td>
                                        <td style={{ fontWeight: 600 }}>{fmt(u.cashAmount)}</td>
                                        <td><span className="badge badge-warning">⏳ Pending</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
