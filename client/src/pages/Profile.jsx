import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usersAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { QRCodeCanvas } from 'qrcode.react'
import { useReactToPrint } from 'react-to-print'

export default function Profile() {
    const { t } = useTranslation()
    const { user, updateUser } = useAuth()
    const [form, setForm] = useState({
        name: '', fatherName: '', motherName: '', nickname: '',
        spouseName: '', occupation: '', location: '', street: '', mobile: '',
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [photo, setPhoto] = useState(null)
    const [profileData, setProfileData] = useState(null)
    const printRef = useRef()
    const fileRef = useRef()

    useEffect(() => {
        usersAPI.getProfile().then(res => {
            const p = res.data
            setProfileData(p)
            setForm({
                name: p.name || '', fatherName: p.fatherName || '', motherName: p.motherName || '',
                nickname: p.nickname || '', spouseName: p.spouseName || '', occupation: p.occupation || '',
                location: p.location || '', street: p.street || '', mobile: p.mobile || '',
            })
        }).finally(() => setLoading(false))
    }, [])

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const onSave = async e => {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
            const res = await usersAPI.updateProfile(form)
            setProfileData(res.data.user)
            updateUser({ ...user, name: form.name })
            setSuccess('Profile updated successfully!')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.response?.data?.message || 'Update failed')
        } finally {
            setSaving(false)
        }
    }

    const onPhotoUpload = async e => {
        const file = e.target.files[0]
        if (!file) return
        const fd = new FormData()
        fd.append('photo', file)
        try {
            const res = await usersAPI.uploadPhoto(fd)
            setProfileData(p => ({ ...p, profilePhoto: res.data.profilePhoto }))
        } catch (err) {
            setError('Photo upload failed')
        }
    }

    const handlePrint = useReactToPrint({ content: () => printRef.current })

    const qrValue = profileData
        ? JSON.stringify({ name: profileData.name, mobile: profileData.mobile, location: profileData.location, street: profileData.street })
        : ''

    if (loading) return <div className="flex-center" style={{ height: 300 }}><span className="spinner" /></div>

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">👤 {t('profile')}</h1>
                    <div className="page-subtitle">Manage your profile and QR code</div>
                </div>
                <button className="btn btn-secondary btn-sm no-print" onClick={handlePrint}>🖨️ Print QR</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
                {/* Profile Form */}
                <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Personal Information</h3>
                    <form onSubmit={onSave}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', background: 'var(--glass)',
                                border: '2px solid var(--glass-border)', overflow: 'hidden',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                            }}>
                                {profileData?.profilePhoto
                                    ? <img src={profileData.profilePhoto} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : '👤'}
                            </div>
                            <div>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
                                    📷 Change Photo
                                </button>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhotoUpload} />
                                <div className="text-muted mt-8" style={{ fontSize: 11 }}>Max 5MB</div>
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">{t('name')} *</label>
                                <input className="form-control" name="name" value={form.name} onChange={onChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('mobile')}</label>
                                <input className="form-control" name="mobile" value={form.mobile} onChange={onChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Father Name</label>
                                <input className="form-control" name="fatherName" value={form.fatherName} onChange={onChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mother Name</label>
                                <input className="form-control" name="motherName" value={form.motherName} onChange={onChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('spouseName')}</label>
                                <input className="form-control" name="spouseName" value={form.spouseName} onChange={onChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('nickname')}</label>
                                <input className="form-control" name="nickname" value={form.nickname} onChange={onChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('occupation')}</label>
                                <input className="form-control" name="occupation" value={form.occupation} onChange={onChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('location')}</label>
                                <input className="form-control" name="location" value={form.location} onChange={onChange} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">{t('street')}</label>
                                <input className="form-control" name="street" value={form.street} onChange={onChange} />
                            </div>
                        </div>

                        {error && <div className="error-msg">{error}</div>}
                        {success && <div className="success-msg">{success}</div>}

                        <button type="submit" className="btn btn-primary mt-8" disabled={saving}>
                            {saving ? <span className="spinner" /> : `💾 ${t('save')} Profile`}
                        </button>
                    </form>
                </div>

                {/* QR Code */}
                <div className="card" style={{ textAlign: 'center' }} ref={printRef}>
                    <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📱 My QR Code</h3>
                    <div className="qr-section">
                        {qrValue ? (
                            <QRCodeCanvas
                                value={qrValue}
                                size={200}
                                bgColor="#ffffff"
                                fgColor="#1a1a2e"
                                level="H"
                                includeMargin
                            />
                        ) : <div className="text-muted">No QR data</div>}
                        <div style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
                            {profileData?.name}
                        </div>
                        <div style={{ color: '#555', fontSize: 12 }}>{profileData?.mobile} · {profileData?.location}</div>
                    </div>
                    <div className="text-muted mt-8" style={{ fontSize: 12 }}>
                        Others can scan this to auto-fill your details when adding a Moi entry
                    </div>
                    <button className="btn btn-primary btn-sm mt-8 no-print" onClick={handlePrint}>
                        🖨️ Download / Print QR
                    </button>
                </div>
            </div>
        </div>
    )
}
