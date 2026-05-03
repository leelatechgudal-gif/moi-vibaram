import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { remindersAPI } from '../api/api'
import { CalendarClock, Plus, Edit, Trash2, Bell, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UpcomingEvents() {
    const { t } = useTranslation()
    const [reminders, setReminders] = useState([])
    const [loading, setLoading] = useState(true)

    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [currentId, setCurrentId] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        eventName: '',
        notes: '',
        date: '',
        notifyOnLogin: true
    })

    useEffect(() => { fetchReminders() }, [])

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
                name: reminder.name,
                location: reminder.location || '',
                eventName: reminder.eventName,
                notes: reminder.notes || '',
                date: reminder.date ? new Date(reminder.date).toISOString().substring(0, 10) : '',
                notifyOnLogin: reminder.notifyOnLogin !== undefined ? reminder.notifyOnLogin : true
            })
        } else {
            setIsEditing(false)
            setCurrentId(null)
            setFormData({
                name: '',
                location: '',
                eventName: '',
                notes: '',
                date: '',
                notifyOnLogin: true
            })
        }
        setShowModal(true)
    }

    const handleCloseModal = () => setShowModal(false)

    const handleSave = async (e) => {
        e.preventDefault()
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

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this reminder?')) return
        try {
            await remindersAPI.delete(id)
            toast.success('Reminder deleted')
            fetchReminders()
        } catch (err) {
            console.error(err)
            toast.error('Failed to delete reminder')
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
                                        <button className="btn btn-secondary btn-sm" style={{ marginRight: 8 }} onClick={() => handleOpenModal(r)}>
                                            <Edit size={16} />
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(r._id)}>
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
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{isEditing ? 'Edit Reminder' : 'New Reminder'}</h2>
                            <button className="modal-close" onClick={handleCloseModal}>&times;</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Person Name</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    required 
                                    value={formData.name} 
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                />
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
                                    value={formData.date} 
                                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
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
                            <div className="flex gap-16" style={{ marginTop: 24 }}>
                                <button type="button" className="btn btn-secondary flex-1" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1">{isEditing ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
