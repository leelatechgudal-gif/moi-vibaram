import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../api/api'

export default function ForgotPassword() {
    const { t } = useTranslation()
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({ email: '', otp: '', newPassword: '' })
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const sendOTP = async e => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await authAPI.forgotPassword({ email: form.email })
            setMessage(res.data.message)
            setStep(2)
        } catch (err) {
            setError(err.response?.data?.message || 'Error sending OTP')
        } finally {
            setLoading(false)
        }
    }

    const verifyOTP = async e => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await authAPI.verifyOTP(form)
            setMessage(res.data.message)
            setStep(3)
        } catch (err) {
            setError(err.response?.data?.message || 'OTP verification failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-bg">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="brand">MOI VIBARAM</div>
                    <div className="tagline">Trust Begins</div>
                </div>
                <h2 className="auth-title">{t('forgotPassword')}</h2>

                {step === 1 && (
                    <form onSubmit={sendOTP}>
                        <div className="form-group">
                            <label className="form-label">{t('email')}</label>
                            <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} required placeholder="your@email.com" />
                        </div>
                        <div className="text-muted mt-8" style={{ fontSize: 12, marginBottom: 14 }}>
                            💡 In dev mode, the OTP is printed to the server console.
                        </div>
                        {error && <div className="error-msg">{error}</div>}
                        <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
                            {loading ? <span className="spinner" /> : t('sendOTP')}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={verifyOTP}>
                        {message && <div className="success-msg mb-16">{message}</div>}
                        <div className="form-group">
                            <label className="form-label">OTP Code</label>
                            <input className="form-control" name="otp" value={form.otp} onChange={onChange} required placeholder="Enter 6-digit OTP" maxLength={6} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('newPassword')}</label>
                            <input className="form-control" name="newPassword" type="password" value={form.newPassword} onChange={onChange} required placeholder="New password" minLength={6} />
                        </div>
                        {error && <div className="error-msg">{error}</div>}
                        <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
                            {loading ? <span className="spinner" /> : t('verifyOTP')}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <div style={{ textAlign: 'center' }}>
                        <div className="success-msg mb-16" style={{ fontSize: 16 }}>✅ {message}</div>
                        <Link to="/login" className="btn btn-primary">Back to Login</Link>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
                    <Link to="/login" className="auth-link">← Back to Login</Link>
                </div>
            </div>
        </div>
    )
}
