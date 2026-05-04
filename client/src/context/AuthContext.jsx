import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const AUTO_LOGOUT_MS = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('mv_user')); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('mv_token'));

    const logout = useCallback(() => {
        if (token) {
            import('../api/api').then(({ authAPI }) => {
                authAPI.logout().catch(() => {});
            });
        }
        localStorage.removeItem('mv_token');
        localStorage.removeItem('mv_refresh_token');
        localStorage.removeItem('mv_user');
        setUser(null);
        setToken(null);
    }, [token]);

    // Auto-logout feature has been disabled to prevent session timeouts
    // during active application usage.
    useEffect(() => {
        // No-op
    }, []);

    const login = (userData, authToken, refreshToken = null) => {
        localStorage.setItem('mv_token', authToken);
        if (refreshToken) {
            localStorage.setItem('mv_refresh_token', refreshToken);
        }
        localStorage.setItem('mv_user', JSON.stringify(userData));
        setToken(authToken);
        setUser(userData);
        
        // Load theme from user preference
        if (userData.themePreference) {
            let isDark = false;
            if (userData.themePreference === 'dark') isDark = true;
            else if (userData.themePreference === 'light') isDark = false;
            else if (userData.themePreference === 'system') {
                isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            localStorage.setItem('mv_theme', isDark ? 'dark' : 'light');
        }
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
