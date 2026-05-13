import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { remindersAPI, partiesAPI } from '../api/api'
import PasswordConfirmModal from '../components/PasswordConfirmModal'
import { CalendarClock, Plus, Edit, Trash2, Bell, BellOff, Search, User, Coins } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UpcomingEvents() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [reminders, setReminders] = useState([])
    const [loading, setLoading] = useState(true)

    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [currentId, setCurrentId] = useState(null)
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null })
    const [formData, setFormData] = useState({
        partyId: '',
        name: '',
        location: '',
        eventName: '',
        notes: '',
        date: '',
        notifyOnLogin: true
    })
    const [parties, setParties] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])

    useEffect(() => { 
        fetchReminders()
        fetchParties()
    }, [])

    const fetchParties = async () => {
        try {
            const res = await partiesAPI.getAll()
            setParties(res.data || res) // Handle both pagination and direct array
        } catch (err) {
            console.error('Failed to fetch parties', err)
        }
    }

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([])
            return
        }
        const q = searchQuery.toLowerCase()
        const results = parties.filter(p => 
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.mobile && p.mobile.includes(q)) ||
            (p.location && p.location.toLowerCase().includes(q)) ||
            (p.spouseName && p.spouseName.toLowerCase().includes(q))
        )
        setSearchResults(results)
    }, [searchQuery, parties])

    const fetchReminders = async () => {
        setLoading(true)
        try {
            const res = await remindersAPI.getAll()
            setReminders(res.data)
        } catch (err) {
            console.error(err)
            toast.error('Failed to load reminders')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (reminder = null) => {
        if (reminder) {
            setIsEditing(true)
            setCurrentId(reminder._id)
            setFormData({
                partyId: reminder.partyId || '',
                name: reminder.name,
                location: reminder.location || '',
                eventName: reminder.eventName,
                notes: reminder.notes || '',
                date: reminder.date ? new Date(reminder.date).toISOString().substring(0, 10) : '',
                notifyOnLogin: reminder.notifyOnLogin !== undefined ? reminder.notifyOnLogin : true
            })
            setSearchQuery('')
        } else {
            setIsEditing(false)
            setCurrentId(null)
            setFormData({
                partyId: '',
                name: '',
                location: '',
                eventName: '',
                notes: '',
                date: '',
                notifyOnLogin: true
            })
            setSearchQuery('')
        }
        setShowModal(true)
    }

    const handleCloseModal = () => setShowModal(false)

    const handleSave = async (e) => {
        e.preventDefault()
        if (!window.confirm(t('confirmSaveReminder') || 'Confirm saving this reminder?')) return
        try {
            if (isEditing) {
                await remindersAPI.update(currentId, formData)
                toast.success('Reminder updated')
            } else {
                await remindersAPI.create(formData)
                toast.success('Reminder created')
            }
            setShowModal(false)
            fetchReminders()
        } catch (err) {
            console.error(err)
            toast.error('Failed to save reminder')
        }
    }

    const handleDeleteClick = (id) => {
        setDeleteModal({ show: true, id })
    }

    const confirmDelete = async (password) => {
        try {
            await remindersAPI.delete(deleteModal.id, password)
            toast.success('Reminder deleted')
            setDeleteModal({ show: false, id: null })
            fetchReminders()
        } catch (err) {
            console.error(err)
            toast.error(err.response?.data?.message || 'Failed to delete reminder')
        }
    }

    const toggleNotify = async (reminder) => {
        try {
            await remindersAPI.update(reminder._id, { notifyOnLogin: !reminder.notifyOnLogin })
            toast.success(reminder.notifyOnLogin ? 'Alert disabled' : 'Alert enabled')
            fetchReminders()
        } catch (err) {
            console.error(err)
            toast.error('Failed to update alert preference')
        }
    }

    const handleAddMoi = (reminder) => {
        if (reminder.partyId) {
            // If linked to a party, pass the party object
            navigate('/transactions/new', { 
                state: { 
                    party: {
                        ...reminder.partyId,
                        partyName: reminder.partyId.name // CreateMoi expects partyName
                    }
                } 
            })
        } else {
            // Otherwise just pass the name
            navigate('/transactions/new', { 
                state: { 
                    party: {
                        partyName: reminder.name,
                        location: reminder.location
                    }
                } 
            })
        }
    }

    return (
        <div>
            <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CalendarClock size={28} /> Reminders
                    </h1>
                    <div className="page-subtitle">Manage upcoming event reminders</div>
                </div>
                <div className="flex gap-8 no-print" style={{ marginLeft: 'auto' }}>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={16} style={{ marginRight: 4 }} /> Add Reminder
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : reminders.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                        <CalendarClock size={48} strokeWidth={1} />
                    </div>
                    <div>No reminders found. Create one to get started!</div>
                </div>
            ) : (
                <div className="card table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Event Name</th>
                                <th>Location</th>
                                <th>Date</th>
                                <th>Notes</th>
                                <th style={{ textAlign: 'center' }}>Notify on Login</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reminders.map((r, i) => (
                                <tr key={r._id}>
                                    <td><strong>{r.name}</strong></td>
                                    <td>{r.eventName}</td>
                                    <td>{r.location || '—'}</td>
                                    <td>{new Date(r.date).toLocaleDateString()}</td>
                                    <td>{r.notes || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button 
                                            className="btn btn-secondary btn-sm" 
                                            onClick={() => toggleNotify(r)}
                                            title={r.notifyOnLogin ? 'Disable Alert' : 'Enable Alert'}
                                        >
                                            {r.notifyOnLogin ? <Bell size={16} color="var(--success)" /> : <BellOff size={16} color="var(--text-muted)" />}
                                        </button>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button 
                                            className="btn btn-secondary btn-sm" 
                                            style={{ marginRight: 8 }} 
                                            onClick={() => handleAddMoi(r)}
                                            title="Add Moi Entry"
                                        >
                                            <Coins size={16} color="var(--primary)" />
                                        </button>
                                        <button className="btn btn-secondary btn-sm" style={{ marginRight: 8 }} onClick={() => handleOpenModal(r)}>
                                            <Edit size={16} />
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteClick(r._id)}>
                                            <Trash2 size={16} color="var(--danger)" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{isEditing ? 'Edit Reminder' : 'New Reminder'}</h2>
                            <button className="modal-close" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Search size={14} /> Search Person
                                </label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Search by name, phone or location..."
                                    value={searchQuery} 
                                    onChange={e => setSearchQuery(e.target.value)} 
                                />
                                {searchResults.length > 0 && (
                                    <div className="search-results-dropdown" style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: 8,
                                        marginTop: 4,
                                        maxHeight: 200,
                                        overflowY: 'auto',
                                        background: 'var(--surface)',
                                        position: 'absolute',
                                        width: '100%',
                                        zIndex: 10,
                                        boxShadow: 'var(--shadow-lg)'
                                    }}>
                                        {searchResults.map(p => (
                                            <div 
                                                key={p._id} 
                                                className="search-result-item"
                                                style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                                onClick={() => {
                                                    setFormData({
                                                        ...formData,
                                                        partyId: p._id,
                                                        name: p.name,
                                                        location: p.location || ''
                                                    })
                                                    setSearchQuery('')
                                                    setSearchResults([])
                                                }}
                                            >
                                                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.initial ? `${p.initial} ` : ''}{p.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {p.location || 'No location'} {p.mobile && `• ${p.mobile}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group" style={{ position: 'relative' }}>
                                <label>Person Name</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    required 
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value, partyId: '' })} 
                                />
                                {formData.partyId && (
                                    <span style={{ 
                                        position: 'absolute', 
                                        right: 10, 
                                        top: 38, 
                                        fontSize: 10, 
                                        background: 'var(--primary-light)', 
                                        color: 'var(--primary)', 
                                        padding: '2px 6px', 
                                        borderRadius: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        <User size={10} /> Linked to Address Book
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Event Name</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    required 
                                    value={formData.eventName} 
                                    onChange={e => setFormData({ ...formData, eventName: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={formData.location} 
                                    onChange={e => setFormData({ ...formData, location: e.target.value })} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    required 
                                    value={formData.date || ''} 
                                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                                    onClick={e => {
                                        e.stopPropagation();
                                        if (typeof e.target.showPicker === 'function') {
                                            try { e.target.showPicker(); } catch (err) {}
                                        }
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea 
                                    className="form-control" 
                                    rows="3" 
                                    value={formData.notes} 
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input 
                                    type="checkbox" 
                                    id="notifyCheck"
                                    checked={formData.notifyOnLogin} 
                                    onChange={e => setFormData({ ...formData, notifyOnLogin: e.target.checked })} 
                                />
                                <label htmlFor="notifyCheck" style={{ marginBottom: 0 }}>Notify on login</label>
                            </div>
                            <div className="flex-end gap-12" style={{ marginTop: 32 }}>
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ minWidth: 120 }}>{isEditing ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PasswordConfirmModal
                show={deleteModal.show}
                title="Delete Reminder"
                message="Are you sure you want to delete this reminder?"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ show: false, id: null })}
            />
        </div>
    )
}
