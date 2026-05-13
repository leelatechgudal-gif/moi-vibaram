import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { eventsAPI } from '../api/api'
import { useReactToPrint } from 'react-to-print'
import { useNavigate } from 'react-router-dom'
import PasswordConfirmModal from '../components/PasswordConfirmModal'
import { Tent, Share2, Printer, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const EVENT_NAMES = [
    { en: 'Wedding', ta: 'திருமணம்' },
    { en: 'Engagement', ta: 'நிச்சயதார்த்தம்' },
    { en: 'Seemantham', ta: 'சீமந்தம்' },
    { en: 'Vasantha Vila', ta: 'வசந்த விழா' },
    { en: 'Birthday', ta: 'பிறந்தநாள்' },
    { en: 'Housewarming', ta: 'புதுமனை புகுவிழா' },
    { en: 'Ear Piercing', ta: 'காதணி விழா' },
    { en: 'Puberty Ceremony', ta: 'பூப்புனித நீராட்டு விழா' },
    { en: 'Other', ta: 'மற்றவை' }
]

function EventModal({ event, onClose, onSave }) {
    const { t } = useTranslation()
    const [form, setForm] = useState(event || { eventName: '', customEventName: '', date: '', venue: '', location: '', city: '' })
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const onSubmit = async e => {
        e.preventDefault()
        if (!window.confirm(t('confirmSaveEvent') || 'Confirm saving this event?')) return
        setLoading(true)
        setError('')
        try {
            const fd = new FormData()
            const submitForm = { ...form };
            if (submitForm.eventName === 'Other' && submitForm.customEventName) {
                submitForm.eventName = submitForm.customEventName;
            }
            delete submitForm.customEventName;

            Object.entries(submitForm).forEach(([k, v]) => v && fd.append(k, v))
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
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tent size={20} /> {event?._id ? 'Edit Event' : 'New Event'}
                </div>
                <form onSubmit={onSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('eventName')} *</label>
                        <select className="form-control" name="eventName" value={EVENT_NAMES.find(n => n.en === form.eventName) ? form.eventName : (form.eventName ? 'Other' : '')} onChange={onChange} required>
                            <option value="">Select event type...</option>
                            {EVENT_NAMES.map(n => <option key={n.en} value={n.en}>{n.en} - {n.ta}</option>)}
                        </select>
                    </div>
                    {(form.eventName === 'Other' || (!EVENT_NAMES.find(n => n.en === form.eventName) && form.eventName)) && (
                        <div className="form-group">
                            <label className="form-label">Custom Event Name *</label>
                            <input className="form-control" name="customEventName" value={form.customEventName || (EVENT_NAMES.find(n => n.en === form.eventName) ? '' : form.eventName)} onChange={onChange} required placeholder="Enter event name" />
                        </div>
                    )}
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
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null })
    const printRef = useRef()
    const navigate = useNavigate()
    const [expandedEvent, setExpandedEvent] = useState(null)

    useEffect(() => { fetchEvents(1) }, [])

    const fetchEvents = async (pageNum = 1) => {
        if (pageNum === 1) setLoading(true)
        else setLoadingMore(true)
        try {
            const res = await eventsAPI.getAll({ params: { page: pageNum, limit: 10 } })
            const { data, hasMore: more } = res.data
            
            if (pageNum === 1) {
                setEvents(data)
            } else {
                setEvents(prev => [...prev, ...data])
            }
            setPage(pageNum)
            setHasMore(more)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchEvents(page + 1)
        }
    }

    const handleDeleteClick = (id) => {
        setDeleteModal({ show: true, id })
    }

    const confirmDelete = async (password) => {
        try {
            await eventsAPI.delete(deleteModal.id, password)
            setEvents(e => e.filter(x => x._id !== deleteModal.id))
            setDeleteModal({ show: false, id: null })
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete event')
        }
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
                    <button className="btn btn-secondary btn-sm" onClick={handleShare}><Share2 size={16} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Printer size={16} /></button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowModal(true) }}>
                        <Plus size={16} style={{ marginRight: 4 }} /> {t('addNew')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : events.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Tent size={48} strokeWidth={1} /></div>
                    <div>{t('noData')}</div>
                    <button className="btn btn-primary mt-8" onClick={() => setShowModal(true)}><Plus size={16} style={{ marginRight: 4 }} /> Create First Event</button>
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
                                <React.Fragment key={e._id}>
                                    <tr>
                                        <td className="text-muted" style={{ fontSize: 12 }}>{i + 1}</td>
                                        <td><strong>{e.eventName}</strong></td>
                                        <td>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                                        <td>{e.venue || '—'}</td>
                                        <td>{[e.location, e.city].filter(Boolean).join(', ') || '—'}</td>
                                        <td className="no-print" onClick={(ev) => ev.stopPropagation()}>
                                            <div className="flex gap-8">
                                                <button className="btn btn-secondary btn-sm" onClick={() => setExpandedEvent(expandedEvent === e._id ? null : e._id)}>
                                                    {expandedEvent === e._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(e); setShowModal(true) }}><Edit2 size={14} /></button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClick(e._id)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedEvent === e._id && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: 0 }}>
                                                <div style={{ background: 'var(--glass)', padding: 20, borderBottom: '1px solid var(--border)' }}>
                                                    <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15, color: 'var(--primary)' }}>
                                                        {e.eventName} — Event Details
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                                                        <div>
                                                            <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Date</div>
                                                            <div style={{ fontWeight: 600 }}>{new Date(e.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Venue</div>
                                                            <div style={{ fontWeight: 600 }}>{e.venue || '—'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Location</div>
                                                            <div style={{ fontWeight: 600 }}>{e.location || '—'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>City</div>
                                                            <div style={{ fontWeight: 600 }}>{e.city || '—'}</div>
                                                        </div>
                                                    </div>
                                                    {e.invitation && (
                                                        <div style={{ marginTop: 16 }}>
                                                            <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Invitation Card</div>
                                                            <img src={`/uploads/${e.invitation}`} alt="Invitation" style={{ maxWidth: 300, borderRadius: 8, border: '1px solid var(--border)' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                                {loadingMore ? <span className="spinner" /> : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <EventModal
                    event={editing}
                    onClose={() => { setShowModal(false); setEditing(null) }}
                    onSave={handleSave}
                />
            )}

            <PasswordConfirmModal
                show={deleteModal.show}
                title="Delete Event"
                message="Delete this event and all its transactions? This cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ show: false, id: null })}
            />
        </div>
    )
}
