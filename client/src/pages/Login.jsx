import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { startAuthentication } from '@simplewebauthn/browser'
import api from '../api/api'
import { Download } from 'lucide-react'
import Footer from '../components/Footer'


export default function Login() {
    const { t } = useTranslation()
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [showForceLogout, setShowForceLogout] = useState(false)

    // PWA Install Prompt
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [showIOSGuide, setShowIOSGuide] = useState(false)

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    useEffect(() => {
        // Check if already installed as PWA
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstalled(true)
        }

        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }
        window.addEventListener('beforeinstallprompt', handler)

        const installedHandler = () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
        }
        window.addEventListener('appinstalled', installedHandler)

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
            window.removeEventListener('appinstalled', installedHandler)
        }
    }, [])

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setDeferredPrompt(null)
            }
        } else if (isIOS) {
            setShowIOSGuide(prev => !prev)
        }
    }

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const onSubmit = async (e, forceLogout = false) => {
        if (e) e.preventDefault()
        setError('')
        setLoading(true)
        setShowForceLogout(false)
        try {
            const res = await authAPI.login({ ...form, forceLogout })
            login(res.data.user, res.data.token, res.data.refreshToken)
            navigate('/')
        } catch (err) {
            if (err.response?.data?.code === 'SESSION_LIMIT_REACHED') {
                setShowForceLogout(true)
            } else {
                setError(err.response?.data?.message || 'Login failed')
            }
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
                login(verifyRes.data.user, verifyRes.data.token, verifyRes.data.refreshToken);
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
                    
                    {showForceLogout && (
                        <div className="warning-box" style={{ 
                            background: 'rgba(255, 193, 7, 0.1)', 
                            border: '1px solid #ffc107', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            marginTop: '16px',
                            fontSize: '13px',
                            color: 'var(--text)'
                        }}>
                            <p style={{ margin: 0, marginBottom: '8px', fontWeight: 600 }}>⚠️ Maximum active sessions reached.</p>
                            <p style={{ margin: 0, marginBottom: '12px', opacity: 0.8 }}>You are already logged in on 3 other devices. Do you want to logout from all other devices and login here?</p>
                            <button 
                                type="button" 
                                className="btn btn-primary" 
                                style={{ width: '100%', background: '#ffc107', color: '#000', border: 'none', justifyContent: 'center' }}
                                onClick={() => onSubmit(null, true)}
                                disabled={loading}
                            >
                                {loading ? <span className="spinner" style={{ borderColor: '#000', borderTopColor: 'transparent' }} /> : 'Yes, Force Logout & Login'}
                            </button>
                        </div>
                    )}

                    {!showForceLogout && (
                        <>
                            <button type="submit" className="btn btn-primary w-full mt-8" disabled={loading} style={{ justifyContent: 'center' }}>
                                {loading ? <span className="spinner" /> : t('login')}
                            </button>
                            <button type="button" className="btn btn-secondary w-full" onClick={onFingerprintLogin} disabled={loading} style={{ justifyContent: 'center', marginTop: 12 }}>
                                👆 Login with Fingerprint
                            </button>
                        </>
                    )}
                </form>
                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
                    <Link to="/forgot-password" className="auth-link">{t('forgotPassword')}</Link>
                    <span style={{ margin: '0 10px' }}>·</span>
                    <Link to="/register" className="auth-link">{t('register')}</Link>
                </div>

                {/* PWA Install Button — always visible unless already installed */}
                {!isInstalled && (
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <button
                            type="button"
                            className="btn w-full"
                            onClick={handleInstallClick}
                            style={{
                                justifyContent: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: 'linear-gradient(135deg, var(--primary), var(--saffron))',
                                color: 'white',
                                border: 'none',
                                padding: '12px 20px',
                                fontSize: 14,
                                fontWeight: 600,
                                boxShadow: '0 4px 15px rgba(184,134,11,0.3)',
                            }}
                        >
                            <Download size={18} /> Install Moi Vibaram App
                        </button>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Install for quick access &amp; offline support
                        </div>

                        {/* iOS Safari guide */}
                        {showIOSGuide && isIOS && (
                            <div style={{
                                marginTop: 12,
                                padding: '14px 16px',
                                background: 'var(--glass)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 12,
                                fontSize: 13,
                                lineHeight: 1.6,
                                textAlign: 'left',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--primary)' }}>📱 Install on iPhone / iPad</div>
                                <ol style={{ margin: 0, paddingLeft: 20 }}>
                                    <li>Tap the <strong>Share</strong> button <span style={{ fontSize: 16 }}>⬆️</span> at the bottom of Safari</li>
                                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                                    <li>Tap <strong>"Add"</strong> to confirm</li>
                                </ol>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <Footer style={{ position: 'absolute', bottom: 20, width: '100%', padding: 0 }} />
        </div>

    )
}
