import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import i18n from '../i18n/i18n'

const navItems = [
    { icon: '🏠', key: 'dashboard', path: '/' },
    { icon: '🎉', key: 'myEvents', path: '/events' },
    { icon: '➕', key: 'createMoi', path: '/transactions/new' },
    { icon: '📅', key: 'upcomingEvents', path: '/upcoming' },
    { icon: '📊', key: 'balanceSheet', path: '/balance-sheet' },
    { icon: '📋', key: 'masterSheet', path: '/master-sheet' },
    { icon: '📂', key: 'Bulk Upload', path: '/bulk-upload' },
    { icon: '🔍', key: 'search', path: '/search' },
    { icon: '👤', key: 'profile', path: '/profile' },
]

export default function Navbar() {
    const { t } = useTranslation()
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [lang, setLang] = useState('en')

    const toggleLang = () => {
        const next = lang === 'en' ? 'ta' : 'en'
        i18n.changeLanguage(next)
        setLang(next)
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const SidebarContent = () => (
        <>
            <div className="sidebar-brand">
                <div className="brand-name">{t('appName')}</div>
                <div className="brand-tag">{t('tagline')}</div>
            </div>
            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.key}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setOpen(false)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {t(item.key)}
                    </NavLink>
                ))}
                {user?.role === 'admin' && (
                    <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
                        <span className="nav-icon">🛡️</span> Admin Dashboard
                    </NavLink>
                )}
            </nav>
            <div className="sidebar-footer">
                <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
                    <button className="lang-toggle" onClick={toggleLang}>
                        🌐 {lang === 'en' ? 'தமிழ்' : 'English'}
                    </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                    <div>📞 Customer Care: +91 98765 43210</div>
                    <div><a href="mailto:feedback@moivibaram.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>✉️ Send Feedback</a></div>
                </div>
                {user && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        👋 {user.name}
                    </div>
                )}
                <button className="nav-item btn-danger" onClick={handleLogout} style={{ width: '100%' }}>
                    <span className="nav-icon">🚪</span> {t('logout')}
                </button>
            </div>
        </>
    )

    return (
        <>
            {/* Mobile Topbar */}
            <div className="topbar">
                <button className="hamburger" onClick={() => setOpen(!open)}>☰</button>
                <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>{t('appName')}</span>
                <button className="lang-toggle" onClick={toggleLang}>{lang === 'en' ? 'தமிழ்' : 'EN'}</button>
            </div>

            {/* Sidebar */}
            <div className={`sidebar ${open ? 'open' : ''}`}>
                <SidebarContent />
            </div>

            {/* Overlay for mobile */}
            {open && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    )
}
