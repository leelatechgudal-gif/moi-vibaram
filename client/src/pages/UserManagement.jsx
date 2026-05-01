import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usersAPI } from '../api/api';
import { Users, Plus, Edit2, Trash2, Save, Search } from 'lucide-react';

export default function UserManagement() {
    const { t } = useTranslation();
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [formData, setFormData] = useState({
        _id: '', name: '', initial: '', fatherName: '', motherName: '', spouseName: '', nickname: '', occupation: '', location: '', street: '', mobile: '', remarks: ''
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPersons(1, true);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPersons(1, true);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchPersons = (pageNum = 1, reset = false) => {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        usersAPI.getAll({ page: pageNum, limit: 15, search: searchQuery })
            .then(res => {
                const { data, hasMore: more } = res.data;
                if (reset) {
                    setPersons(data);
                } else {
                    setPersons(prev => [...prev, ...data]);
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
            fetchPersons(page + 1);
        }
    };

    const handleCreate = () => {
        setModalMode('create');
        setFormData({ _id: '', name: '', initial: '', fatherName: '', motherName: '', spouseName: '', nickname: '', occupation: '', location: '', street: '', mobile: '', remarks: '' });
        setError('');
        setShowModal(true);
    };

    const handleEdit = (p) => {
        setModalMode('edit');
        setFormData({ ...p });
        setError('');
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await usersAPI.delete(id);
            setPersons(persons.filter(p => p._id !== id));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');
        try {
            if (modalMode === 'create') {
                const res = await usersAPI.create(formData);
                setPersons([res.data, ...persons]);
            } else {
                const res = await usersAPI.update(formData._id, formData);
                setPersons(persons.map(p => p._id === formData._id ? res.data : p));
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

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={28} /> User Management</h1>
                    <div className="page-subtitle">Manage your contacts and parties</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="search-bar" style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: 36, width: 250 }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={16} /> Add User</button>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>
            ) : persons.length === 0 ? (
                <div className="card empty-state">
                    <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Users size={48} strokeWidth={1} /></div>
                    <div>No users found.</div>
                </div>
            ) : (
                <div className="card table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Mobile</th>
                                <th>Spouse</th>
                                <th>Location</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {persons.map(p => (
                                <tr key={p._id}>
                                    <td><strong>{p.initial ? `${p.initial}. ` : ''}{p.name}</strong></td>
                                    <td>{p.mobile || '—'}</td>
                                    <td>{p.spouseName || '—'}</td>
                                    <td>{p.location || '—'}</td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(p)} style={{ marginRight: 8 }}><Edit2 size={14} /></button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><Trash2 size={14} /></button>
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
            )}

            {showModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 500, width: '100%' }}>
                        <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {modalMode === 'create' ? <><Plus size={20} /> Add User</> : <><Edit2 size={20} /> Edit User</>}
                        </div>
                        <form onSubmit={handleSubmit} className="form-grid">
                            <div className="form-group" style={{ display: 'flex', gap: 8, gridColumn: '1 / -1' }}>
                                <div style={{ flex: '0 0 80px' }}>
                                    <label className="form-label">Initial</label>
                                    <input className="form-control" name="initial" value={formData.initial || ''} onChange={handleInputChange} placeholder="A." />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Name *</label>
                                    <input className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Full Name" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mobile</label>
                                <input className="form-control" name="mobile" value={formData.mobile || ''} onChange={handleInputChange} placeholder="Phone Number" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Spouse Name</label>
                                <input className="form-control" name="spouseName" value={formData.spouseName || ''} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input className="form-control" name="location" value={formData.location || ''} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Street</label>
                                <input className="form-control" name="street" value={formData.street || ''} onChange={handleInputChange} />
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
        </div>
    );
}
