import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { App as CapApp } from '@capacitor/app'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import CreateMoi from './pages/CreateMoi'
import EditMoi from './pages/EditMoi'
import UpcomingEvents from './pages/UpcomingEvents'
import BalanceSheet from './pages/BalanceSheet'
import Profile from './pages/Profile'
import Search from './pages/Search'
import AdminDashboard from './pages/AdminDashboard'
import BulkUpload from './pages/BulkUpload'
import PersonDetail from './pages/PersonDetail'
import PartiesManagement from './pages/PartiesManagement'
import TenantManagement from './pages/TenantManagement'
import ContactUs from './pages/ContactUs'
import Ledger from './pages/Ledger'

function Protected({ children }) {
    const { isAuthenticated } = useAuth()
    return isAuthenticated ? children : <Navigate to="/login" replace />
}

function ClerkRouteRestriction({ children, allowedRoles }) {
    const { user } = useAuth()
    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />
    }
    return children
}

function AppRoutes() {
    const { isAuthenticated, user } = useAuth()
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
        return localStorage.getItem('mv_sidebar_collapsed') === 'true';
    });

    React.useEffect(() => {
        const backHandler = CapApp.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
                window.history.back();
            } else {
                CapApp.exitApp();
            }
        });

        return () => {
            backHandler.then(h => h.remove());
        };
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
                <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/*" element={
                    <Protected>
                         <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                            <Navbar sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
                            <div className="main-content">
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/ledger" element={<Ledger sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />} />
                                     <Route path="/events" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><Events /></ClerkRouteRestriction>} />
                                    <Route path="/transactions/new" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><CreateMoi /></ClerkRouteRestriction>} />
                                    <Route path="/transactions/edit/:id" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><EditMoi /></ClerkRouteRestriction>} />
                                    <Route path="/upcoming" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><UpcomingEvents /></ClerkRouteRestriction>} />
                                    <Route path="/balance-sheet" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><BalanceSheet /></ClerkRouteRestriction>} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/search" element={<Search />} />
                                    {user?.role === 'admin' && user?.isSuperAdmin && (
                                        <Route path="/admin" element={<AdminDashboard />} />
                                    )}
                                    <Route path="/parties" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><PartiesManagement /></ClerkRouteRestriction>} />
                                    <Route path="/bulk-upload" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><BulkUpload /></ClerkRouteRestriction>} />
                                    <Route path="/person-detail" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><PersonDetail /></ClerkRouteRestriction>} />
                                    <Route path="/contact-us" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><ContactUs /></ClerkRouteRestriction>} />
                                    <Route path="/tenant" element={<ClerkRouteRestriction allowedRoles={['admin', 'member']}><TenantManagement /></ClerkRouteRestriction>} />
                                </Routes>
                                <Footer />
                            </div>
                        </div>

                    </Protected>
                } />
            </Routes>
        </BrowserRouter>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}
