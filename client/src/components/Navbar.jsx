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
    Menu,
    Download,
    ShieldCheck,
    Building2,
    ArrowLeft
} from 'lucide-react'

const navItems = [
    { icon: <LayoutDashboard size={18} />, key: 'dashboard', path: '/' },
    { icon: <BookMarked size={18} />, key: 'ledger', path: '/ledger' },
    { icon: <Tent size={18} />, key: 'myEvents', path: '/events' },
    // { icon: <PlusCircle size={18} />, key: 'createMoi', path: '/transactions/new' },
    { icon: <CalendarClock size={18} />, key: 'upcomingEvents', path: '/upcoming' },
    { icon: <Scale size={18} />, key: 'balanceSheet', path: '/balance-sheet' },
    { icon: <UploadCloud size={18} />, key: 'bulkUpload', path: '/bulk-upload' },
    // { icon: <Search size={18} />, key: 'search', path: '/search' },
    { icon: <UserCircle size={18} />, key: 'profile', path: '/profile' },
    { icon: <Phone size={18} />, key: 'contactUs', path: '/contact-us' },
]

export default function Navbar({ sidebarCollapsed, setSidebarCollapsed }) {
    const { t } = useTranslation()
    const { user, logout, updateUser } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [lang, setLang] = useState(() => {
        const current = i18n.language || localStorage.getItem('i18nextLng') || 'ta';
        return current.startsWith('en') ? 'en' : 'ta';
    })
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem('mv_theme')
        if (saved) return saved === 'dark'
        return true // Default to dark always
    })
    const [deferredPrompt, setDeferredPrompt] = useState(null)

    useEffect(() => {
        const newTheme = dark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme)
        localStorage.setItem('mv_theme', newTheme)

        if (user && user.themePreference !== newTheme) {
            import('../api/api').then(({ usersAPI }) => {
                usersAPI.updateThemePreference({ themePreference: newTheme }).then(() => {
                    updateUser({ ...user, themePreference: newTheme });
                }).catch(err => console.error('Failed to update theme preference', err));
            });
        }
    }, [dark])

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
        }
    }

    const toggleLang = () => {
        const next = lang === 'en' ? 'ta' : 'en'
        i18n.changeLanguage(next)
        localStorage.setItem('i18nextLng', next)
        setLang(next)
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const SidebarContent = () => (
        <>
            <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '15px' }}>
                <div style={{ flex: 1, textAlign: 'left', paddingLeft: '10px' }}>
                    <div className="brand-name" style={{ fontSize: '18px' }}>{t('appName')}</div>
                    <div className="brand-tag">{t('tagline')}</div>
                </div>
                {setSidebarCollapsed && (
                    <button
                        onClick={() => {
                            const next = !sidebarCollapsed;
                            setSidebarCollapsed(next);
                            localStorage.setItem('mv_sidebar_collapsed', String(next));
                        }}
                        className="ledger-btn-icon hide-mobile"
                        title="Collapse Sidebar"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                )}
            </div>
            <nav className="sidebar-nav">
                {navItems.filter(item => {
                    if (item.key === 'ledger') {
                        return user?.role === 'clerk' || user?.isSuperAdmin;
                    }
                    if (user?.role === 'clerk') {
                        return item.key === 'ledger' || item.key === 'profile';
                    }
                    return true;
                }).map(item => (
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
                {user?.role !== 'clerk' && (
                    <>
                        <NavLink to="/parties" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
                            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} /></span> {t('partyManagement')}
                        </NavLink>
                        <NavLink to="/tenant" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
                            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={18} /></span> {t('applicationUsers')}
                        </NavLink>
                    </>
                )}
                {user?.role === 'admin' && user?.isSuperAdmin && (
                    <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setOpen(false)}>
                        <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={18} /></span> {t('adminUsers')}
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
                    {deferredPrompt && (
                        <button className="theme-toggle" onClick={handleInstall} style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}>
                            <Download size={14} /> {t('installApp')}
                        </button>
                    )}
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
                    {deferredPrompt && (
                        <button className="theme-toggle" onClick={handleInstall} style={{ padding: '6px', background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}>
                            <Download size={16} />
                        </button>
                    )}
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

            {/* Global Expand Button on Desktop when collapsed */}
            {sidebarCollapsed && setSidebarCollapsed && (
                <button
                    onClick={() => {
                        setSidebarCollapsed(false);
                        localStorage.setItem('mv_sidebar_collapsed', 'false');
                    }}
                    className="hide-mobile"
                    style={{
                        position: 'fixed',
                        top: '15px',
                        left: '15px',
                        zIndex: 150,
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow)',
                        transition: 'all 0.2s'
                    }}
                    title="Expand Sidebar"
                >
                    <Menu size={18} />
                </button>
            )}

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
