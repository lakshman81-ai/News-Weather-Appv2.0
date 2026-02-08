import React from 'react';
import { useSettings } from '../context/SettingsContext';

const ThemeToggle = () => {
    const { settings, updateSettings } = useSettings();
    const isLight = settings.theme === 'light';

    const toggleTheme = () => {
        updateSettings({ ...settings, theme: isLight ? 'dark' : 'light' });
    };

    return (
        <button
            onClick={toggleTheme}
            className="header__action-btn"
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0 8px',
                color: 'var(--text-primary)'
            }}
        >
            {isLight ? '🌙' : '☀️'}
        </button>
    );
};

export default ThemeToggle;
