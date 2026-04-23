import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { eventsAPI, transactionsAPI } from '../api/api'
import QrScanner from './QrScanner'
import { numberToWords } from '../utils/numberToWords'

const SEER_FIELDS = [
    { key: 'dress', icon: '👗' },
    { key: 'thattuVarisai', icon: '🍽️' },
    { key: 'jewels', icon: '💍' },
    { key: 'marakkal', icon: '🌾' },
    { key: 'maalai', icon: '💐' },
    { key: 'arisMootai', icon: '🌾' },
    { key: 'paathirangal', icon: '🥘' },
    { key: 'others', icon: '📦' },
]

const defaultSeer = () => Object.fromEntries(SEER_FIELDS.map(f => [f.key, { value: '', quantity: '', remarks: '' }]))

export default function CreateMoi() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const fixedType = location.state?.fixedType || false
    const initialType = location.state?.type || 'received'

    const [events, setEvents] = useState([])
    const [showSeer, setShowSeer] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [form, setForm] = useState({
        eventId: '', initial: '', partyName: '', fatherName: '', motherName: '', spouseName: '', nickname: '',
        occupation: '', location: '', street: '', mobile: '',
        type: initialType, cashAmount: '', date: new Date().toISOString().slice(0, 10),
        thaiMama: false, labels: '', remarks: '', amountWordsLang: 'en'
    })
    const [seerVarisai, setSeerVarisai] = useState(defaultSeer())

    useEffect(() => {
        eventsAPI.getAll().then(res => setEvents(res.data))
    }, [])

    const onChange = e => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm(f => ({ ...f, [e.target.name]: value }))
    }

    const onSeerChange = (field, key, value) => {
        setSeerVarisai(s => ({ ...s, [field]: { ...s[field], [key]: value } }))
    }

    const onQRScan = (data) => {
        try {
            const parsed = JSON.parse(data)
            setForm(f => ({
                ...f,
                partyName: parsed.name || f.partyName,
                mobile: parsed.mobile || f.mobile,
                location: parsed.location || f.location,
                street: parsed.street || f.street,
            }))
            setShowScanner(false)
        } catch {
            setError('Invalid QR code')
        }
    }

    const onSubmit = async e => {
        e.preventDefault()
        if (!form.eventId) { setError('Please select an event'); return }
        setLoading(true)
        setError('')
        try {
            const payload = {
                ...form,
                labels: form.labels ? form.labels.split(',').map(l => l.trim()) : [],
                cashAmount: parseFloat(form.cashAmount) || 0,
                seerVarisai: showSeer ? Object.fromEntries(
                    Object.entries(seerVarisai).map(([k, v]) => [k, {
                        value: parseFloat(v.value) || 0,
                        quantity: parseFloat(v.quantity) || 0,
                        remarks: v.remarks,
                    }])
                ) : undefined,
            }
            await transactionsAPI.create(payload)
            setSuccess('Moi entry saved successfully!')
            setTimeout(() => navigate('/balance-sheet'), 1500)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
                    <div>
                        <h1 className="page-title">➕ {t('createMoi')}</h1>
                        <div className="page-subtitle">Add a new Moi entry</div>
                    </div>
                </div>
                <button className="btn btn-secondary btn-sm no-print" onClick={() => setShowScanner(true)}>
                    📷 Scan QR
                </button>
            </div>

            {showScanner && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowScanner(false)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div className="modal-title">📷 Scan Party QR Code</div>
                        <QrScanner onScan={onQRScan} onClose={() => setShowScanner(false)} />
                    </div>
                </div>
            )}

            <form onSubmit={onSubmit}>
                {/* Event & Type */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📋 Event Details</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">{t('eventName')} *</label>
                            <select className="form-control" name="eventId" value={form.eventId} onChange={onChange} required>
                                <option value="">Select event...</option>
                                {events.map(e => (
                                    <option key={e._id} value={e._id}>{e.eventName} — {new Date(e.date).toLocaleDateString('en-IN')}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('type')} *</label>
                            <select className="form-control" name="type" value={form.type} onChange={onChange} disabled={fixedType}>
                                <option value="received">📥 {t('received')} (They gave me)</option>
                                <option value="paid">💸 {t('paid')} (I gave them)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('date')}</label>
                            <input className="form-control" name="date" type="date" value={form.date} onChange={onChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">💰 Cash {t('amount')} (₹) *</label>
                            <input className="form-control" name="cashAmount" type="number" min="0" value={form.cashAmount} onChange={onChange} placeholder="0" required />
                            {form.cashAmount && (
                                <div style={{ fontSize: 12, marginTop: 4, color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ textTransform: 'capitalize' }}>{numberToWords(form.cashAmount, form.amountWordsLang)}</span>
                                    <select style={{ border: 'none', background: 'transparent', fontSize: 11, color: 'var(--text-muted)' }} name="amountWordsLang" value={form.amountWordsLang} onChange={onChange}>
                                        <option value="en">EN</option>
                                        <option value="ta">TA</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Party Details */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 16 }}>👤 Party Details</h3>
                    <div className="form-grid">
                        <div className="form-group" style={{ display: 'flex', gap: 8 }}>
                            <div style={{ flex: '0 0 80px' }}>
                                <label className="form-label">Initial</label>
                                <input className="form-control" name="initial" value={form.initial} onChange={onChange} placeholder="A." />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">{t('partyName')} *</label>
                                <input className="form-control" name="partyName" value={form.partyName} onChange={onChange} required placeholder="Full name" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Father Name</label>
                            <input className="form-control" name="fatherName" value={form.fatherName} onChange={onChange} placeholder="Father name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mother Name</label>
                            <input className="form-control" name="motherName" value={form.motherName} onChange={onChange} placeholder="Mother name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('spouseName')} *</label>
                            <input className="form-control" name="spouseName" value={form.spouseName} onChange={onChange} required placeholder="Spouse name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('nickname')}</label>
                            <input className="form-control" name="nickname" value={form.nickname} onChange={onChange} placeholder="Nickname" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('occupation')}</label>
                            <input className="form-control" name="occupation" value={form.occupation} onChange={onChange} placeholder="Occupation" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('mobile')}</label>
                            <input className="form-control" name="mobile" value={form.mobile} onChange={onChange} placeholder="Mobile number" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('location')} *</label>
                            <input className="form-control" name="location" value={form.location} onChange={onChange} required placeholder="Town/Village" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('street')}</label>
                            <input className="form-control" name="street" value={form.street} onChange={onChange} placeholder="Street" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('remarks')}</label>
                            <input className="form-control" name="remarks" value={form.remarks} onChange={onChange} placeholder="Any notes" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Labels (comma separated)</label>
                            <input className="form-control" name="labels" value={form.labels} onChange={onChange} placeholder="e.g. VIP, Family" />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 24 }}>
                                <input type="checkbox" name="thaiMama" checked={form.thaiMama} onChange={onChange} />
                                <span style={{ fontWeight: 600 }}>Thai Mama (தாய் மாமன்)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Seer Varisai */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="flex-between">
                        <h3 style={{ fontWeight: 700 }}>🎁 {t('seerVarisai')}</h3>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input type="checkbox" checked={showSeer} onChange={e => setShowSeer(e.target.checked)} />
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Include gifts in kind</span>
                        </label>
                    </div>
                    {showSeer && (
                        <div className="seer-grid" style={{ marginTop: 16 }}>
                            {SEER_FIELDS.map(f => (
                                <div key={f.key} style={{ background: 'var(--glass)', padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{f.icon} {t(f.key)}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        <div>
                                            <label className="seer-item" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Value (₹)</label>
                                            <input className="form-control" style={{ fontSize: 12, padding: '6px 8px' }} type="number" min="0" value={seerVarisai[f.key].value} onChange={e => onSeerChange(f.key, 'value', e.target.value)} placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="seer-item" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Qty</label>
                                            <input className="form-control" style={{ fontSize: 12, padding: '6px 8px' }} type="number" min="0" value={seerVarisai[f.key].quantity} onChange={e => onSeerChange(f.key, 'quantity', e.target.value)} placeholder="0" />
                                        </div>
                                    </div>
                                    <input className="form-control" style={{ fontSize: 12, padding: '6px 8px', marginTop: 6 }} value={seerVarisai[f.key].remarks} onChange={e => onSeerChange(f.key, 'remarks', e.target.value)} placeholder="Remarks..." />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && <div className="error-msg">{error}</div>}
                {success && <div className="success-msg">{success}</div>}

                <div className="flex gap-8">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner" /> : `💾 ${t('save')} Moi`}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>{t('cancel')}</button>
                </div>
            </form>
        </div>
    )
}
