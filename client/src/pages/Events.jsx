import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { eventsAPI } from '../api/api'
import { useReactToPrint } from 'react-to-print'

const EVENT_NAMES = ['Wedding', 'Engagement', 'Seemantham', 'Birthday', 'Housewarming', 'Thread Ceremony', 'Ear Piercing', 'Other']

function EventModal({ event, onClose, onSave }) {
    const { t } = useTranslation()
    const [form, setForm] = useState(event || { eventName: '', date: '', venue: '', location: '', city: '' })
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const onSubmit = async e => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const fd = new FormData()
            Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
            if (file) fd.append('invitation', file)
            const res = event?._id ? await eventsAPI.update(event._id, fd) : await eventsAPI.create(fd)
            onSave(res.data)
        } catch (err) {
            setError(err.response?.data?.message || 'Save failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-title">
                    🎉 {event?._id ? 'Edit Event' : 'New Event'}
                </div>
                <form onSubmit={onSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('eventName')} *</label>
                        <select className="form-control" name="eventName" value={form.eventName} onChange={onChange} required>
                            <option value="">Select event type...</option>
                            {EVENT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">{t('date')} *</label>
                            <input className="form-control" name="date" type="date" value={form.date?.slice(0, 10) || ''} onChange={onChange} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('venue')}</label>
                            <input className="form-control" name="venue" value={form.venue} onChange={onChange} placeholder="Marriage Hall, etc." />
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">{t('location')}</label>
                            <input className="form-control" name="location" value={form.location} onChange={onChange} placeholder="Town/Area" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('city')}</label>
                            <input className="form-control" name="city" value={form.city} onChange={onChange} placeholder="City" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Invitation Card (optional)</label>
                        <input type="file" accept="image/*,.pdf" className="form-control" onChange={e => setFile(e.target.files[0])} />
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <div className="flex gap-8 mt-8">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="spinner" /> : t('save')}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function Events() {
    const { t } = useTranslation()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const printRef = useRef()

    useEffect(() => { fetchEvents() }, [])

    const fetchEvents = async () => {
        setLoading(true)
        try {
            const res = await eventsAPI.getAll()
            setEvents(res.data)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this event and all its transactions?')) return
        await eventsAPI.delete(id)
        setEvents(e => e.filter(x => x._id !== id))
    }

    const handleSave = (evt) => {
        if (editing?._id) {
            setEvents(e => e.map(x => x._id === evt._id ? evt : x))
        } else {
            setEvents(e => [evt, ...e])
        }
        setShowModal(false)
        setEditing(null)
    }

    const handlePrint = useReactToPrint({ content: () => printRef.current })
    const handleShare = () => navigator.share?.({ title: 'My Events - MOI VIBARAM', text: `I have ${events.length} events` })

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('myEvents')}</h1>
                    <div className="page-subtitle">{events.length} event(s) total</div>
                </div>
                <div className="flex gap-8 no-print">
                    <button className="btn btn-secondary btn-sm" onClick={handleShare}>📤</button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowModal(true) }}>
                        ➕ {t('addNew')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : events.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon">🎉</div>
                    <div>{t('noData')}</div>
                    <button className="btn btn-primary mt-8" onClick={() => setShowModal(true)}>Create First Event</button>
                </div>
            ) : (
                <div ref={printRef} className="table-wrap card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t('eventName')}</th>
                                <th>{t('date')}</th>
                                <th>{t('venue')}</th>
                                <th>{t('location')}</th>
                                <th className="no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((e, i) => (
                                <tr key={e._id}>
                                    <td className="text-muted" style={{ fontSize: 12 }}>{i + 1}</td>
                                    <td><strong>{e.eventName}</strong></td>
                                    <td>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                                    <td>{e.venue || '—'}</td>
                                    <td>{[e.location, e.city].filter(Boolean).join(', ') || '—'}</td>
                                    <td className="no-print">
                                        <div className="flex gap-8">
                                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(e); setShowModal(true) }}>✏️</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e._id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <EventModal
                    event={editing}
                    onClose={() => { setShowModal(false); setEditing(null) }}
                    onSave={handleSave}
                />
            )}
        </div>
    )
}
