import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../api/api';
import { Users, Plus, Edit2, Trash2, Save, ShieldCheck } from 'lucide-react';

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

    const confirmDelete = async () => {
        setActionLoading(true);
        try {
            await usersAPI.adminDelete(deleteModal.id);
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

            <div className="card table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Subscription Expiry</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td><strong>{u.name}</strong></td>
                                <td>{u.mobile}</td>
                                <td>{u.email}</td>
                                <td><span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-warning'}`}>{u.role}</span></td>
                                <td>{u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : '—'}</td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)} style={{ marginRight: 8 }}><Edit2 size={14} /></button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)} disabled={u._id === user._id}><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {hasMore && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? <span className="spinner" /> : 'Load More'}
                        </button>
                    </div>
                )}
            </div>

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

            {deleteModal.show && (
                <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, id: null, name: '' })}>
                    <div className="modal" style={{ maxWidth: 400, width: '90%' }}>
                        <div className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Trash2 size={24} /> Confirm Deletion
                        </div>
                        <div style={{ marginBottom: 24, lineHeight: 1.5 }}>
                            <p>Are you sure you want to delete system user <strong>{deleteModal.name}</strong>?</p>
                            <p style={{ marginTop: 12, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid var(--primary)', fontSize: 14 }}>
                                This will deactivate the user's login access.
                            </p>
                        </div>
                        <div className="flex gap-8">
                            <button className="btn btn-danger" onClick={confirmDelete} disabled={actionLoading} style={{ flex: 1 }}>
                                {actionLoading ? <span className="spinner" /> : 'Confirm Deactivation'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setDeleteModal({ show: false, id: null, name: '' })} style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
