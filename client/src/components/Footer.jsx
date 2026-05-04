import React from 'react';

const Footer = ({ style }) => {
    const isLogin = style?.position === 'absolute';
    
    return (
        <footer style={{ 
            textAlign: 'center', 
            padding: '24px 0', 
            marginTop: 'auto', 
            fontSize: '13px', 
            color: 'var(--text-muted)',
            borderTop: isLogin ? 'none' : '1px solid var(--border)',
            zIndex: 10,
            ...style 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span>&copy; {new Date().getFullYear()} Leela Tech. All rights reserved.</span>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor', opacity: 0.3 }}></span>
                <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', opacity: 0.8 }}>v{__APP_VERSION__}</span>
            </div>
        </footer>
    );
};

export default Footer;
