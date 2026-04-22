import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

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

        api.get(`/users/admin/all?page=${pageNum}&limit=10`)
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

    if (user?.role !== 'admin') return null;

    if (loading) return <div className="flex-center" style={{ height: 200 }}><span className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">🛡️ Admin Dashboard</h1>
                    <div className="page-subtitle">Manage system users and subscriptions</div>
                </div>
            </div>

            <div className="card table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Location</th>
                            <th>Role</th>
                            <th>Subscription Expiry</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td><strong>{u.name}</strong></td>
                                <td>{u.mobile}</td>
                                <td>{u.location}</td>
                                <td><span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-warning'}`}>{u.role}</span></td>
                                <td>{u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : '—'}</td>
                                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
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
        </div>
    );
}
