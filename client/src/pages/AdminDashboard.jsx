import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../api/api';
import PasswordConfirmModal from '../components/PasswordConfirmModal';
import { Users, Plus, Edit2, Trash2, Save, ShieldCheck, Search } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [formData, setFormData] = useState({
        _id: '', name: '', mobile: '', email: '', password: '', role: 'user', location: '', subscriptionExpiry: ''
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user?.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchUsers(1);
    }, [user, navigate]);

    const fetchUsers = (pageNum = 1) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        usersAPI.getAdminAll({ page: pageNum, limit: 10 })
            .then(res => {
                const { data, hasMore: more } = res.data;
                if (pageNum === 1) {
                    setUsers(data);
                } else {
                    setUsers(prev => [...prev, ...data]);
                }
                setPage(pageNum);
                setHasMore(more);
            })
            .catch(console.error)
            .finally(() => {
                setLoading(false);
                setLoadingMore(false);
            });
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchUsers(page + 1);
        }
    };

    const handleCreate = () => {
        setModalMode('create');
        setFormData({ _id: '', name: '', mobile: '', email: '', password: '', role: 'user', location: '', subscriptionExpiry: '' });
        setError('');
        setShowModal(true);
    };

    const handleEdit = (u) => {
        setModalMode('edit');
        setFormData({
            _id: u._id,
            name: u.name || '',
            mobile: u.mobile || '',
            email: u.email || '',
            password: '',
            role: u.role || 'user',
            location: u.location || '',
            subscriptionExpiry: u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toISOString().split('T')[0] : ''
        });
        setError('');
        setShowModal(true);
    };

    const handleDelete = (u) => {
        setDeleteModal({ show: true, id: u._id, name: u.name });
    };

    const confirmDelete = async (password) => {
        setActionLoading(true);
        try {
            await usersAPI.adminDelete(deleteModal.id, password);
            setUsers(users.filter(u => u._id !== deleteModal.id));
            setDeleteModal({ show: false, id: null, name: '' });
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!window.confirm('Confirm saving system user details?')) return;
        setActionLoading(true);
        setError('');
        try {
            if (modalMode === 'create') {
                const res = await usersAPI.adminCreate(formData);
                setUsers([res.data.user, ...users]);
            } else {
                const res = await usersAPI.adminUpdate(formData._id, formData);
                setUsers(users.map(u => u._id === formData._id ? res.data.user : u));
                fetchUsers(1); // Refetch to ensure data is updated completely
            }
            setShowModal(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [expandedUser, setExpandedUser] = useState(null);
    const [userParties, setUserParties] = useState({});
    const [loadingParties, setLoadingParties] = useState(false);

    const toggleParties = async (userId) => {
        if (expandedUser === userId) {
            setExpandedUser(null);
            return;
        }
        setExpandedUser(userId);
        if (!userParties[userId]) {
            setLoadingParties(true);
            try {
                const res = await usersAPI.adminGetUserParties(userId);
                setUserParties(prev => ({ ...prev, [userId]: res.data }));
            } catch (err) {
                console.error('Failed to fetch parties', err);
            } finally {
                setLoadingParties(false);
            }
        }
    };

    if (user?.role !== 'admin') return null;

    if (loading && page === 1) return <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={28} /> System User Management</h1>
                    <div className="page-subtitle">Manage system users and subscriptions</div>
                </div>
                <button className="btn btn-primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={16} /> Add User</button>
            </div>

            <div className="mb-16">
                <input
                    type="search"
                    className="form-control"
                    placeholder="Search by name, email, or mobile..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {(() => {
                const filteredUsers = users.filter(u => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                        u.name?.toLowerCase().includes(q) ||
                        u.email?.toLowerCase().includes(q) ||
                        u.mobile?.includes(q)
                    );
                });

                return (
            <>
            <div className="card table-wrap hide-mobile">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'center' }}>Txns</th>
                            <th style={{ textAlign: 'center' }}>Parties</th>
                            <th>Expiry</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u => (
                            <React.Fragment key={u._id}>
                                <tr>
                                    <td><strong>{u.name}</strong></td>
                                    <td>{u.mobile}</td>
                                    <td>{u.email}</td>
                                    <td><span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'clerk' ? 'badge-success' : 'badge-warning'}`}>{u.role}</span></td>
                                    <td style={{ fontWeight: 600, textAlign: 'center' }}>{u.transactionCount || 0}</td>
                                    <td style={{ fontWeight: 600, textAlign: 'center' }}>{u.partyCount || 0}</td>
                                    <td>{u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : '—'}</td>
                                    <td>
                                        <div className="flex gap-8">
                                            <button className="btn btn-secondary btn-sm" title="View Parties" onClick={() => toggleParties(u._id)}>
                                                <Users size={14} />
                                            </button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)}><Edit2 size={14} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)} disabled={u._id === user._id}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedUser === u._id && (
                                    <tr>
                                        <td colSpan={7} style={{ padding: 0 }}>
                                            <div style={{ background: 'var(--glass)', padding: 16, borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Parties Created by {u.name}</div>
                                                {loadingParties ? (
                                                    <div className="flex-center" style={{ height: 60 }}><span className="spinner" /></div>
                                                ) : !userParties[u._id] || userParties[u._id].length === 0 ? (
                                                    <div className="text-muted" style={{ fontSize: 12, textAlign: 'center', padding: 10 }}>No parties created by this user.</div>
                                                ) : (
                                                    <div className="table-wrap">
                                                        <table className="table" style={{ fontSize: 12 }}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Name</th>
                                                                    <th>Spouse Name</th>
                                                                    <th>Mobile</th>
                                                                    <th>Location</th>
                                                                    <th>Created</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {userParties[u._id].map(p => (
                                                                    <tr key={p._id}>
                                                                        <td>{p.initial ? `${p.initial}. ` : ''}{p.name}</td>
                                                                        <td>{p.spouseName || '—'}</td>
                                                                        <td>{p.mobile || '—'}</td>
                                                                        <td>{p.location || '—'}</td>
                                                                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="show-mobile">
                {filteredUsers.map(u => (
                    <div key={u._id} className="card" style={{ padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                                <strong style={{ fontSize: 16, color: 'var(--text)' }}>{u.name}</strong>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{u.email}</div>
                            </div>
                            <span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'clerk' ? 'badge-success' : 'badge-warning'}`}>{u.role}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                            {u.mobile && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📱 {u.mobile}</div>}
                            {u.subscriptionExpiry && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Expiry: {new Date(u.subscriptionExpiry).toLocaleDateString()}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, background: 'var(--glass)', padding: '8px 12px', borderRadius: 8 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transactions</div>
                                <div style={{ fontWeight: 600 }}>{u.transactionCount || 0}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Parties</div>
                                <div style={{ fontWeight: 600 }}>{u.partyCount || 0}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                            <button className="btn btn-primary btn-sm w-full" onClick={() => toggleParties(u._id)} style={{ justifyContent: 'center' }}>
                                <Users size={14} style={{ marginRight: 6 }} /> Parties
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)} style={{ flex: '0 0 auto' }}><Edit2 size={14} /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)} disabled={u._id === user._id} style={{ flex: '0 0 auto' }}><Trash2 size={14} /></button>
                        </div>
                        {expandedUser === u._id && (
                            <div style={{ marginTop: 16, background: 'var(--bg)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Parties Created by {u.name}</div>
                                {loadingParties ? (
                                    <div className="flex-center" style={{ height: 60 }}><span className="spinner" /></div>
                                ) : !userParties[u._id] || userParties[u._id].length === 0 ? (
                                    <div className="text-muted" style={{ fontSize: 12, textAlign: 'center', padding: 10 }}>No parties created.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {userParties[u._id].map(p => (
                                            <div key={p._id} style={{ background: 'var(--glass)', padding: 12, borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <strong style={{ fontSize: 14 }}>{p.initial ? `${p.initial}. ` : ''}{p.name}</strong>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {p.mobile || '—'} • {p.location || '—'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {hasMore && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? <span className="spinner" /> : 'Load More'}
                    </button>
                </div>
            )}
            </>
                );
            })()}

            {showModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 500, width: '100%' }}>
                        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {modalMode === 'create' ? <><Plus size={20} /> Add User</> : <><Edit2 size={20} /> Edit User</>}
                        </div>
                        <form onSubmit={handleSubmit} className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Name *</label>
                                <input className="form-control" name="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mobile *</label>
                                <input className="form-control" name="mobile" value={formData.mobile} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input className="form-control" type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Password {modalMode === 'edit' && '(leave blank to keep current)'} {modalMode === 'create' && '*'}</label>
                                <input className="form-control" type="password" name="password" value={formData.password} onChange={handleInputChange} required={modalMode === 'create'} minLength={8} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select className="form-control" name="role" value={formData.role} onChange={handleInputChange}>
                                    <option value="user">User</option>
                                    <option value="clerk">Clerk</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input className="form-control" name="location" value={formData.location} onChange={handleInputChange} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Subscription Expiry</label>
                                <input className="form-control" type="date" name="subscriptionExpiry" value={formData.subscriptionExpiry} onChange={handleInputChange} />
                            </div>

                            {error && <div className="error-msg" style={{ gridColumn: '1 / -1', marginTop: 10 }}>{error}</div>}

                            <div className="flex gap-8" style={{ gridColumn: '1 / -1', marginTop: 16 }}>
                                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                    {actionLoading ? <span className="spinner" /> : <><Save size={16} style={{ marginRight: 6 }} /> Save User</>}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PasswordConfirmModal
                show={deleteModal.show}
                title="Confirm Deactivation"
                message={
                    <>
                        <p>Are you sure you want to delete system user <strong>{deleteModal.name}</strong>?</p>
                        <p style={{ marginTop: 12, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid var(--primary)', fontSize: 14 }}>
                            This will deactivate the user's login access.
                        </p>
                    </>
                }
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ show: false, id: null, name: '' })}
                loading={actionLoading}
            />
        </div>
    );
}
