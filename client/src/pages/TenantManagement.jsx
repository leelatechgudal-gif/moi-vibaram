import React, { useEffect, useState } from 'react'
import { tenantAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { Building2, UserPlus, UserMinus, LogOut, Crown, Users, Shield, ArrowRightLeft, Edit2, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import PasswordConfirmModal from '../components/PasswordConfirmModal'

export default function TenantManagement() {
    const { user } = useAuth()
    const [members, setMembers] = useState([])
    const [myRole, setMyRole] = useState('owner')
    const [tenantId, setTenantId] = useState('')
    const [loading, setLoading] = useState(true)

    // Invite Modal State
    const [showInvite, setShowInvite] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviting, setInviting] = useState(false)

    // Create / Edit Member Modal State
    const [showCreateEditModal, setShowCreateEditModal] = useState(false)
    const [modalMode, setModalMode] = useState('create')
    const [formData, setFormData] = useState({
        _id: '', name: '', email: '', mobile: '', password: '', role: 'clerk', isActive: true
    })
    const [actionLoading, setActionLoading] = useState(false)
    const [error, setError] = useState('')

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' })

    // Transfer Modal State
    const [transferModal, setTransferModal] = useState({ show: false, id: null, name: '' })

    useEffect(() => { fetchMembers() }, [])

    const fetchMembers = async () => {
        setLoading(true)
        try {
            const res = await tenantAPI.getMembers()
            setMembers(res.data.members)
            setMyRole(res.data.myRole)
            setTenantId(res.data.tenantId)
        } catch (err) {
            console.error(err)
            toast.error('Failed to load tenant info')
        } finally {
            setLoading(false)
        }
    }

    const handleInvite = async (e) => {
        e.preventDefault()
        setInviting(true)
        try {
            const res = await tenantAPI.invite({ email: inviteEmail.trim() })
            toast.success(res.data.message)
            setInviteEmail('')
            setShowInvite(false)
            fetchMembers()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to invite')
        } finally {
            setInviting(false)
        }
    }

    const handleRemove = async (memberId, memberName) => {
        if (!window.confirm(`Remove ${memberName} from your tenant? They will get their own separate workspace.`)) return
        try {
            const res = await tenantAPI.remove(memberId)
            toast.success(res.data.message)
            fetchMembers()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove member')
        }
    }

    const handleLeave = async () => {
        if (!window.confirm('Leave this tenant? You will get your own separate workspace with no shared parties.')) return
        try {
            const res = await tenantAPI.leave()
            toast.success(res.data.message)
            fetchMembers()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to leave tenant')
        }
    }

    const handleTransfer = (memberId, memberName) => {
        setTransferModal({ show: true, id: memberId, name: memberName })
    }

    const confirmTransfer = async (password) => {
        setActionLoading(true)
        try {
            const res = await tenantAPI.transfer(transferModal.id, password)
            toast.success(res.data.message)
            setTransferModal({ show: false, id: null, name: '' })
            fetchMembers()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to transfer ownership')
        } finally {
            setActionLoading(false)
        }
    }

    const handleCreateClick = () => {
        setModalMode('create')
        setFormData({ _id: '', name: '', email: '', mobile: '', password: '', role: 'clerk', isActive: true })
        setError('')
        setShowCreateEditModal(true)
    }

    const handleEditClick = (member) => {
        setModalMode('edit')
        setFormData({
            _id: member._id,
            name: member.name || '',
            email: member.email || '',
            mobile: member.mobile || '',
            password: '',
            role: member.role || 'clerk',
            isActive: member.isActive !== false
        })
        setError('')
        setShowCreateEditModal(true)
    }

    const handleDeleteClick = (member) => {
        setDeleteModal({ show: true, id: member._id, name: member.name })
    }

    const handleCreateEditSubmit = async (e) => {
        e.preventDefault()
        setActionLoading(true)
        setError('')
        try {
            if (modalMode === 'create') {
                await tenantAPI.createUser(formData)
                toast.success('Member created successfully')
            } else {
                await tenantAPI.updateUser(formData._id, formData)
                toast.success('Member updated successfully')
            }
            setShowCreateEditModal(false)
            fetchMembers()
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed')
            toast.error(err.response?.data?.message || 'Operation failed')
        } finally {
            setActionLoading(false)
        }
    }

    const confirmDelete = async (password) => {
        setActionLoading(true)
        try {
            await tenantAPI.deleteUser(deleteModal.id, password)
            toast.success('Member deleted successfully')
            setDeleteModal({ show: false, id: null, name: '' })
            fetchMembers()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete member')
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div>
            <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={28} /> Family Members
                    </h1>
                    <div className="page-subtitle">Manage who shares your party ledger</div>
                </div>
                {myRole === 'owner' && (
                    <div className="flex gap-8 no-print" style={{ marginLeft: 'auto' }}>
                        <button className="btn btn-secondary" onClick={handleCreateClick} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <UserPlus size={16} /> Create Member
                        </button>
                    </div>
                )}
            </div>

            {/* Tenant Info Card */}
            <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={18} color="var(--primary)" />
                        <strong>Tenant ID:</strong>
                        <code style={{
                            fontSize: 12,
                            background: 'var(--glass)',
                            padding: '4px 8px',
                            borderRadius: 6,
                            letterSpacing: 0.5,
                            color: 'var(--text-muted)'
                        }}>
                            {tenantId}
                        </code>
                    </div>
                    <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {myRole === 'owner' ? <><Crown size={12} /> Owner</> : <><Users size={12} /> Member</>}
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : members.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                        <Users size={48} strokeWidth={1} />
                    </div>
                    <div>No members found.</div>
                </div>
            ) : (
                <>
                    <div className="card table-wrap hide-mobile">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Mobile</th>
                                    <th>Tenant Role</th>
                                    <th>App Role</th>
                                    <th>Status</th>
                                    {myRole === 'owner' && <th style={{ textAlign: 'center' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map(m => {
                                    const isMe = m._id === user?._id
                                    return (
                                        <tr key={m._id}>
                                            <td>
                                                <strong>{m.name}</strong>
                                                {isMe && <span style={{ fontSize: 11, color: 'var(--primary)', marginLeft: 6 }}>(You)</span>}
                                            </td>
                                            <td>{m.email}</td>
                                            <td>{m.mobile || '—'}</td>
                                            <td>
                                                <span className={`badge ${m.tenantRole === 'owner' ? 'badge-warning' : 'badge-primary'}`} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                                                    {m.tenantRole === 'owner' ? <><Crown size={12} /> Owner</> : <><Users size={12} /> Member</>}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${m.role === 'admin' ? 'badge-primary' : m.role === 'clerk' ? 'badge-success' : 'badge-warning'}`}>
                                                    {m.role || 'member'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${m.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                                                    {m.isActive !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {myRole === 'owner' && (
                                                <td style={{ textAlign: 'center' }}>
                                                    {!isMe && m.tenantRole !== 'owner' && (
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => handleEditClick(m)}
                                                                title="Edit Member"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => handleTransfer(m._id, m.name)}
                                                                title="Transfer Ownership"
                                                            >
                                                                <ArrowRightLeft size={14} />
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => handleRemove(m._id, m.name)}
                                                                title="Remove Member"
                                                            >
                                                                <UserMinus size={14} color="var(--warning)" />
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => handleDeleteClick(m)}
                                                                title="Delete User completely"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {isMe && <span className="text-muted" style={{ fontSize: 12 }}>—</span>}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="show-mobile">
                        {members.map(m => {
                            const isMe = m._id === user?._id
                            return (
                                <div key={m._id} className="card" style={{ padding: 16, marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div>
                                            <strong style={{ fontSize: 16, color: 'var(--text)' }}>{m.name}</strong>
                                            {isMe && <span style={{ fontSize: 11, color: 'var(--primary)', marginLeft: 6 }}>(You)</span>}
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{m.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                                        <span className={`badge ${m.tenantRole === 'owner' ? 'badge-warning' : 'badge-primary'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {m.tenantRole === 'owner' ? <><Crown size={12} /> Owner</> : <><Users size={12} /> Member</>}
                                        </span>
                                        <span className={`badge ${m.role === 'admin' ? 'badge-primary' : m.role === 'clerk' ? 'badge-success' : 'badge-warning'}`}>
                                            Role: {m.role || 'member'}
                                        </span>
                                        <span className={`badge ${m.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                                            {m.isActive !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    {m.mobile && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>📱 {m.mobile}</div>}
                                    {myRole === 'owner' && !isMe && m.tenantRole !== 'owner' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="btn btn-secondary btn-sm w-full"
                                                    onClick={() => handleEditClick(m)}
                                                    style={{ justifyContent: 'center' }}
                                                >
                                                    <Edit2 size={14} style={{ marginRight: 6 }} /> Edit
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm w-full"
                                                    onClick={() => handleDeleteClick(m)}
                                                    style={{ justifyContent: 'center' }}
                                                >
                                                    <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="btn btn-secondary btn-sm w-full"
                                                    onClick={() => handleTransfer(m._id, m.name)}
                                                    style={{ justifyContent: 'center' }}
                                                >
                                                    <ArrowRightLeft size={14} style={{ marginRight: 6 }} /> Transfer
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm w-full"
                                                    onClick={() => handleRemove(m._id, m.name)}
                                                    style={{ justifyContent: 'center' }}
                                                >
                                                    <UserMinus size={14} style={{ marginRight: 6 }} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Leave button for members */}
            {myRole === 'member' && (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <button className="btn btn-secondary" onClick={handleLeave} style={{ color: 'var(--danger)' }}>
                        <LogOut size={16} style={{ marginRight: 4 }} /> Leave This Tenant
                    </button>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                        You will get your own workspace with no shared parties.
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showInvite && (
                <div className="modal-overlay" onClick={() => setShowInvite(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Invite Member</h2>
                            <button className="modal-close" onClick={() => setShowInvite(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleInvite}>
                            <div className="form-group">
                                <label>Email of registered user</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    required
                                    placeholder="user@example.com"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                />
                                <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                                    The user must already be registered. Their existing parties will be merged into your tenant.
                                </div>
                            </div>
                            <div className="flex gap-16" style={{ marginTop: 24 }}>
                                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowInvite(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1" disabled={inviting}>
                                    {inviting ? <span className="spinner" /> : 'Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create / Edit Modal */}
            {showCreateEditModal && (
                <div className="modal-overlay" onClick={() => setShowCreateEditModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450, width: '100%' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{modalMode === 'create' ? 'Create Tenant User' : 'Edit Tenant User'}</h2>
                            <button className="modal-close" onClick={() => setShowCreateEditModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateEditSubmit} className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Name *</label>
                                <input
                                    className="form-control"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mobile *</label>
                                <input
                                    className="form-control"
                                    required
                                    value={formData.mobile}
                                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    Password {modalMode === 'edit' && '(leave blank to keep current)'} {modalMode === 'create' && '*'}
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    required={modalMode === 'create'}
                                    minLength={8}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select
                                    className="form-control"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="clerk">Clerk (Dashboard & Ledger search only)</option>
                                    <option value="member">Member (Full Access)</option>
                                    <option value="admin">Admin (Full Access + Manage Members)</option>
                                </select>
                            </div>
                            {modalMode === 'edit' && (
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                                    <input
                                        type="checkbox"
                                        id="user-isActive"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="user-isActive" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                                        Active Account
                                    </label>
                                </div>
                            )}

                            {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}

                            <div className="flex gap-16" style={{ marginTop: 24 }}>
                                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCreateEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1" disabled={actionLoading}>
                                    {actionLoading ? <span className="spinner" /> : <><Save size={16} style={{ marginRight: 6 }} /> Save Member</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Confirm Modal for Delete */}
            <PasswordConfirmModal
                show={deleteModal.show}
                title="Confirm Deactivation"
                message={
                    <>
                        <p>Are you sure you want to delete tenant member <strong>{deleteModal.name}</strong>?</p>
                        <p style={{ marginTop: 12, padding: 12, background: 'rgba(231, 76, 60, 0.1)', borderLeft: '4px solid var(--danger)', fontSize: 14 }}>
                            This will completely disable this user account and delete it from your workspace.
                        </p>
                    </>
                }
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ show: false, id: null, name: '' })}
                loading={actionLoading}
            />

            <PasswordConfirmModal
                show={transferModal.show}
                title="Confirm Ownership Transfer"
                message={
                    <>
                        <p>Are you sure you want to transfer ownership to <strong>{transferModal.name}</strong>?</p>
                        <p style={{ marginTop: 12, padding: 12, background: 'rgba(230, 126, 34, 0.1)', borderLeft: '4px solid var(--warning)', fontSize: 14 }}>
                            <strong>Warning:</strong> You will become a regular member and lose owner permissions.
                        </p>
                    </>
                }
                onConfirm={confirmTransfer}
                onCancel={() => setTransferModal({ show: false, id: null, name: '' })}
                loading={actionLoading}
            />
        </div>
    )
}
