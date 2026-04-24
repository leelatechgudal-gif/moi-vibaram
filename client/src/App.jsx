import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import CreateMoi from './pages/CreateMoi'
import EditMoi from './pages/EditMoi'
import UpcomingEvents from './pages/UpcomingEvents'
import BalanceSheet from './pages/BalanceSheet'
import MasterSheet from './pages/MasterSheet'
import Profile from './pages/Profile'
import Search from './pages/Search'
import AdminDashboard from './pages/AdminDashboard'
import BulkUpload from './pages/BulkUpload'
import PersonDetail from './pages/PersonDetail'

function Protected({ children }) {
    const { isAuthenticated } = useAuth()
    return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
    const { isAuthenticated } = useAuth()
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
                <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/*" element={
                    <Protected>
                        <div className="app-layout">
                            <Navbar />
                            <div className="main-content">
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/events" element={<Events />} />
                                    <Route path="/transactions/new" element={<CreateMoi />} />
                                    <Route path="/transactions/edit/:id" element={<EditMoi />} />
                                    <Route path="/upcoming" element={<UpcomingEvents />} />
                                    <Route path="/balance-sheet" element={<BalanceSheet />} />
                                    <Route path="/master-sheet" element={<MasterSheet />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/search" element={<Search />} />
                                    <Route path="/admin" element={<AdminDashboard />} />
                                    <Route path="/bulk-upload" element={<BulkUpload />} />
                                    <Route path="/person-detail" element={<PersonDetail />} />
                                </Routes>
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
