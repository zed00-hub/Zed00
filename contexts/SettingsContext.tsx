import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BotSettings {
    responseLength: 'short' | 'medium' | 'long';
    preferredLanguage: 'ar' | 'fr' | 'mixed';
    includeGlossary: boolean;
    includeExamples: boolean;
    formalTone: boolean;
}

const defaultSettings: BotSettings = {
    responseLength: 'medium',
    preferredLanguage: 'mixed',
    includeGlossary: true,
    includeExamples: true,
    formalTone: true,
};

interface SettingsContextType {
    settings: BotSettings;
    updateSettings: (newSettings: Partial<BotSettings>) => void;
    resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'paramedical_bot_settings';

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<BotSettings>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch {
            return defaultSettings;
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const updateSettings = (newSettings: Partial<BotSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
