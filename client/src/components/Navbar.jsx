import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import i18n from '../i18n/i18n'
import {
    LayoutDashboard,
    Tent,
    PlusCircle,
    CalendarClock,
    Scale,
    BookMarked,
    UploadCloud,
    Search,
    UserCircle,
    Users,
    LogOut,
    Phone,
    Mail,
    MessageCircle,
    Globe,
    Sun,
    Moon,
    Menu
} from 'lucide-react'

const navItems = [
    { icon: <LayoutDashboard size={18} />, key: 'dashboard', path: '/' },
    { icon: <Tent size={18} />, key: 'myEvents', path: '/events' },
    { icon: <PlusCircle size={18} />, key: 'createMoi', path: '/transactions/new' },
    { icon: <CalendarClock size={18} />, key: 'upcomingEvents', path: '/upcoming' },
    { icon: <Scale size={18} />, key: 'balanceSheet', path: '/balance-sheet' },
    { icon: <BookMarked size={18} />, key: 'masterSheet', path: '/master-sheet' },
    { icon: <UploadCloud size={18} />, key: 'Bulk Upload', path: '/bulk-upload' },
    { icon: <Search size={18} />, key: 'search', path: '/search' },
    { icon: <UserCircle size={18} />, key: 'profile', path: '/profile' },
]

export default function Navbar() {
    const { t } = useTranslation()
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [lang, setLang] = useState('en')
    const [dark, setDark] = useState(() => localStorage.getItem('mv_theme') === 'dark')

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
        localStorage.setItem('mv_theme', dark ? 'dark' : 'light')
    }, [dark])

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
                        <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                        {t(item.key)}
                    </NavLink>
                ))}
                <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
                    <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} /></span> User Management
                </NavLink>
                {user?.role === 'admin' && (
                    <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
                        <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} /></span> App Users (Admin)
                    </NavLink>
                )}
            </nav>
            <div className="sidebar-footer">
                <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="lang-toggle" onClick={toggleLang}>
                        <Globe size={14} /> {lang === 'en' ? 'தமிழ்' : 'English'}
                    </button>
                    <button className="theme-toggle" onClick={() => setDark(d => !d)}>
                        {dark ? <><Sun size={14} /> Light</> : <><Moon size={14} /> Dark</>}
                    </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                    <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={12} /> <a href="tel:+918006880050" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Contact Us</a>
                    </div>
                    <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={12} /> <a href="mailto:anand@leeletech.co.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Email Feedback</a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MessageCircle size={12} /> <a href="https://wa.me/918754734313" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>WhatsApp Feedback</a>
                    </div>
                </div>
                {user && (
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12, fontWeight: 500 }}>
                        🙏 {user.name}
                    </div>
                )}
                <button className="nav-item btn-danger" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
                    <LogOut size={16} style={{ marginRight: 6 }} /> {t('logout')}
                </button>
            </div>
        </>
    )

    return (
        <>
            {/* Mobile Topbar */}
            <div className="topbar">
                <button className="hamburger" onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center' }}>
                    <Menu size={24} />
                </button>
                <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1, background: 'linear-gradient(135deg, var(--maroon) 0%, var(--primary) 50%, var(--saffron) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {t('appName')}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="theme-toggle" onClick={() => setDark(d => !d)} style={{ padding: '6px' }}>
                        {dark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <button className="lang-toggle" onClick={toggleLang} style={{ padding: '6px 10px', fontSize: 12 }}>
                        {lang === 'en' ? 'தமிழ்' : 'EN'}
                    </button>
                </div>
            </div>

            {/* Sidebar */}
            <div className={`sidebar ${open ? 'open' : ''}`}>
                <SidebarContent />
            </div>

            {/* Overlay for mobile */}
            {open && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(2px)' }}
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    )
}
