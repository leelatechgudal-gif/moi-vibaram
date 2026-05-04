import React, { useEffect, useState } from 'react'
import { tenantAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { Building2, UserPlus, UserMinus, LogOut, Crown, Users, Shield, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TenantManagement() {
    const { user } = useAuth()
    const [members, setMembers] = useState([])
    const [myRole, setMyRole] = useState('owner')
    const [tenantId, setTenantId] = useState('')
    const [loading, setLoading] = useState(true)

    const [showInvite, setShowInvite] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviting, setInviting] = useState(false)

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
            const res = await tenantAPI.invite({ email: inviteEmail })
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

    const handleTransfer = async (memberId, memberName) => {
        if (!window.confirm(`Transfer ownership to ${memberName}? You will become a regular member.`)) return
        try {
            const res = await tenantAPI.transfer(memberId)
            toast.success(res.data.message)
            fetchMembers()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to transfer ownership')
        }
    }

    return (
        <div>
            <div className="page-header" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={28} /> Family / Tenant
                    </h1>
                    <div className="page-subtitle">Manage who shares your party ledger</div>
                </div>
                {myRole === 'owner' && (
                    <div className="flex gap-8 no-print" style={{ marginLeft: 'auto' }}>
                        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
                            <UserPlus size={16} style={{ marginRight: 4 }} /> Invite Member
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
                <div className="card table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Role</th>
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
                                        {myRole === 'owner' && (
                                            <td style={{ textAlign: 'center' }}>
                                                {!isMe && m.tenantRole !== 'owner' && (
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
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
                                                            <UserMinus size={14} color="var(--danger)" />
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
        </div>
    )
}
