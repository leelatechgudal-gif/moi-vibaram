import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { startAuthentication } from '@simplewebauthn/browser'
import api from '../api/api'

export default function Login() {
    const { t } = useTranslation()
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const onSubmit = async e => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await authAPI.login(form)
            login(res.data.user, res.data.token)
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    const onFingerprintLogin = async () => {
        if (!form.email) {
            setError('Enter your email first to use fingerprint login');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const optsRes = await api.post('/webauthn/auth-options', { email: form.email });
            const authResp = await startAuthentication(optsRes.data);
            const verifyRes = await api.post('/webauthn/auth-verify', { email: form.email, response: authResp });
            if (verifyRes.data.verified) {
                login(verifyRes.data.user, verifyRes.data.token);
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Fingerprint login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-bg">
            <div className="auth-card">
                <div className="auth-logo">
                    <div className="brand">{t('appName')}</div>
                    <div className="tagline">{t('tagline')}</div>
                </div>
                <h2 className="auth-title">{t('login')}</h2>
                <form onSubmit={onSubmit}>
                    <div className="form-group">
                        <label className="form-label">{t('email')}</label>
                        <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} required placeholder="your@email.com" />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">{t('password')}</label>
                        <input className="form-control" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={onChange} required placeholder="••••••••" />
                        <span 
                            onClick={() => setShowPassword(!showPassword)} 
                            style={{ position: 'absolute', right: 12, top: 38, cursor: 'pointer', opacity: 0.6 }}>
                            {showPassword ? '👁️‍🗨️' : '👁️'}
                        </span>
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <button type="submit" className="btn btn-primary w-full mt-8" disabled={loading} style={{ justifyContent: 'center' }}>
                        {loading ? <span className="spinner" /> : t('login')}
                    </button>
                    <button type="button" className="btn btn-secondary w-full" onClick={onFingerprintLogin} disabled={loading} style={{ justifyContent: 'center', marginTop: 12 }}>
                        👆 Login with Fingerprint
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
                    <Link to="/forgot-password" className="auth-link">{t('forgotPassword')}</Link>
                    <span style={{ margin: '0 10px' }}>·</span>
                    <Link to="/register" className="auth-link">{t('register')}</Link>
                </div>
            </div>
        </div>
    )
}
