import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const AUTO_LOGOUT_MS = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mv_user')); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('mv_token'));

    const logout = useCallback(() => {
        localStorage.removeItem('mv_token');
        localStorage.removeItem('mv_user');
        setUser(null);
        setToken(null);
    }, []);

    // Auto-logout after 15 min inactivity
    useEffect(() => {
        if (!token) return;
        let timer = setTimeout(logout, AUTO_LOGOUT_MS);

        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(logout, AUTO_LOGOUT_MS);
        };
        ['click', 'keydown', 'mousemove', 'touchstart'].forEach(e =>
            window.addEventListener(e, resetTimer)
        );
        return () => {
            clearTimeout(timer);
            ['click', 'keydown', 'mousemove', 'touchstart'].forEach(e =>
                window.removeEventListener(e, resetTimer)
            );
        };
    }, [token, logout]);

    const login = (userData, authToken) => {
        localStorage.setItem('mv_token', authToken);
        localStorage.setItem('mv_user', JSON.stringify(userData));
        setToken(authToken);
        setUser(userData);
    };

    const updateUser = (userData) => {
        localStorage.setItem('mv_user', JSON.stringify(userData));
        setUser(userData);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
