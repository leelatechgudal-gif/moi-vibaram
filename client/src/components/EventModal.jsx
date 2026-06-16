import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tent } from 'lucide-react';
import { eventsAPI } from '../api/api';

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
];

export default function EventModal({ event, onClose, onSave }) {
    const { t } = useTranslation();
    const [form, setForm] = useState(event ? { isLiveLedger: false, ...event } : { eventName: '', customEventName: '', date: '', venue: '', location: '', city: '', isLiveLedger: false });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const onSubmit = async e => {
        e.preventDefault();
        if (!window.confirm(t('confirmSaveEvent') || 'Confirm saving this event?')) return;
        setLoading(true);
        setError('');
        try {
            const fd = new FormData();
            const trimmedForm = Object.fromEntries(
                Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
            );
            const submitForm = { ...trimmedForm };
            if (submitForm.eventName === 'Other' && submitForm.customEventName) {
                submitForm.eventName = submitForm.customEventName;
            }
            delete submitForm.customEventName;

            Object.entries(submitForm).forEach(([k, v]) => {
                if (k === 'isLiveLedger') {
                    fd.append(k, !!v);
                } else if (v !== undefined && v !== null && v !== '') {
                    fd.append(k, v);
                }
            });
            if (file) fd.append('invitation', file);
            const res = event?._id ? await eventsAPI.update(event._id, fd) : await eventsAPI.create(fd);
            onSave(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Save failed');
        } finally {
            setLoading(false);
        }
    };

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
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                        <input 
                            type="checkbox" 
                            id="isLiveLedger"
                            name="isLiveLedger"
                            checked={!!form.isLiveLedger}
                            onChange={e => setForm(f => ({ ...f, isLiveLedger: e.target.checked }))}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <label htmlFor="isLiveLedger" style={{ cursor: 'pointer', fontWeight: 500, fontSize: 14, margin: 0 }}>
                            Available for Live Ledger
                        </label>
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
    );
}
