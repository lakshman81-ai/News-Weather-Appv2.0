import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getSettings, saveSettings } from '../utils/storage';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    const [settings, setSettingsState] = useState(() => getSettings());
    const [settingsVersion, setSettingsVersion] = useState(0);

    // Global settings update function — bumps version so consumers can react
    const updateSettings = useCallback((newSettings) => {
        saveSettings(newSettings);
        setSettingsState(newSettings);
        setSettingsVersion(v => v + 1);
    }, []);

    // Reload settings from storage
    const reloadSettings = useCallback(() => {
        const freshSettings = getSettings();
        setSettingsState(freshSettings);
        setSettingsVersion(v => v + 1);
    }, []);

    // Listen for storage changes from other tabs
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'dailyEventAI_settings') {
                console.log('[SettingsContext] Storage changed in another tab, reloading');
                reloadSettings();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [reloadSettings]);

    // Apply font size globally
    useEffect(() => {
        if (settings.fontSize) {
            document.documentElement.style.fontSize = settings.fontSize + 'px';
        }
    }, [settings.fontSize]);

    // Apply Theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
    }, [settings.theme]);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, reloadSettings, settingsVersion }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
}
