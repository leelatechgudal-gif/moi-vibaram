import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'

export default function Register() {
    const { t } = useTranslation()
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '', location: '', street: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const onSubmit = async e => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await authAPI.register(form)
            login(res.data.user, res.data.token)
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-bg">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="brand">{t('appName')}</div>
                    <div className="tagline">{t('tagline')}</div>
                </div>
                <h2 className="auth-title">{t('register')}</h2>
                <form onSubmit={onSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">{t('name')} *</label>
                            <input className="form-control" name="name" value={form.name} onChange={onChange} required placeholder="Full Name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('mobile')} *</label>
                            <input className="form-control" name="mobile" value={form.mobile} onChange={onChange} required placeholder="9999999999" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('email')} *</label>
                        <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} required placeholder="your@email.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('password')} *</label>
                        <input className="form-control" name="password" type="password" value={form.password} onChange={onChange} required placeholder="Min 6 characters" minLength={6} />
                    </div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">{t('location')} *</label>
                            <input className="form-control" name="location" value={form.location} onChange={onChange} required placeholder="Town/City" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('street')}</label>
                            <input className="form-control" name="street" value={form.street} onChange={onChange} placeholder="Street Name" />
                        </div>
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <button type="submit" className="btn btn-primary w-full mt-8" disabled={loading} style={{ justifyContent: 'center' }}>
                        {loading ? <span className="spinner" /> : t('register')}
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                    Already have an account? <Link to="/login" className="auth-link">{t('login')}</Link>
                </div>
            </div>
        </div>
    )
}
