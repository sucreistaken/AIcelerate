// src/components/ui/ThemeToggle.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore';

export function ThemeToggle() {
    const { theme, setTheme } = useUiStore();

    const isDark = theme === 'dark' || theme === 'system';
    const toggle = () => setTheme(isDark ? 'light' : 'dark');

    const getIcon = () => {
        const svgStyle = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
        if (isDark) {
            return <svg {...svgStyle}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
        }
        return <svg {...svgStyle}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
    };

    const label = isDark ? 'Koyu tema' : 'Açık tema';

    return (
        <motion.button
            className="theme-toggle"
            onClick={toggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Tema değiştir: ${label}`}
            title={label}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'background 0.2s, border-color 0.2s',
            }}
        >
            <motion.span
                key={isDark ? 'dark' : 'light'}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 180, opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                {getIcon()}
            </motion.span>
        </motion.button>
    );
}

export default ThemeToggle;
