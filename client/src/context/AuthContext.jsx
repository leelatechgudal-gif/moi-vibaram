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
            const refreshToken = localStorage.getItem('mv_refresh_token');
            import('../api/api').then(({ authAPI }) => {
                authAPI.logout({ refreshToken }).catch(() => {});
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
        
        // Respect the theme that is currently selected/active on the login screen
        const activeTheme = localStorage.getItem('mv_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', activeTheme);
        
        // If the server-side preference is different from the active theme, sync it to the server
        if (userData.themePreference && userData.themePreference !== activeTheme) {
            import('../api/api').then(({ usersAPI }) => {
                usersAPI.updateThemePreference({ themePreference: activeTheme }).then(() => {
                    const updatedUser = { ...userData, themePreference: activeTheme };
                    localStorage.setItem('mv_user', JSON.stringify(updatedUser));
                    setUser(updatedUser);
                }).catch(err => console.error('Failed to sync theme preference on login', err));
            });
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
