import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import FlashcardSetup from './FlashcardSetup';
import FlashcardActive from './FlashcardActive';
import { Flashcard, FlashcardConfig, FlashcardSession } from '../../services/flashcardService';
import { generateFlashcards } from '../../services/geminiService';

interface FlashcardContainerProps {
    files: any[];
    activeSession?: FlashcardSession | null;
    onSessionUpdate?: (session: FlashcardSession | null) => void;
}

const FlashcardContainer: React.FC<FlashcardContainerProps> = ({ files, activeSession, onSessionUpdate }) => {
    const [status, setStatus] = useState<'setup' | 'loading' | 'active'>('setup');
    const [currentCards, setCurrentCards] = useState<Flashcard[]>([]);
    const [config, setConfig] = useState<FlashcardConfig | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Sync with activeSession
    useEffect(() => {
        if (activeSession) {
            setCurrentCards(activeSession.cards);
            setConfig(activeSession.config);
            setStatus('active');
        } else {
            setStatus('setup');
            setCurrentCards([]);
            setConfig(null);
        }
    }, [activeSession]);

    const handleStart = async (newConfig: FlashcardConfig) => {
        setStatus('loading');
        setError(null);
        try {
            const cards = await generateFlashcards(newConfig, files);

            const newSession: FlashcardSession = {
                id: Date.now().toString(),
                title: newConfig.sourceType === 'subject' ? newConfig.subject! : (newConfig.fileContext?.name || 'فلاش كاردس'),
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                cards,
                config: newConfig
            };

            setCurrentCards(cards);
            setConfig(newConfig);
            setStatus('active');

            if (onSessionUpdate) {
                onSessionUpdate(newSession);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'حدث خطأ أثناء إنشاء البطاقات');
            setStatus('setup');
        }
    };

    const handleReset = () => {
        if (onSessionUpdate) {
            onSessionUpdate(null);
        }
        setStatus('setup');
        setCurrentCards([]);
        setConfig(null);
    };

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="text-amber-500 animate-pulse" size={32} />
                    </div>
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">جاري إنشاء البطاقات...</h2>
                    <p className="text-gray-500 dark:text-gray-400">نقوم بتحليل المحتوى وتحويله لمراجعة ذكية</p>
                </div>
            </div>
        );
    }

    if (status === 'active' && currentCards.length > 0) {
        return (
            <FlashcardActive
                cards={currentCards}
                theme={config?.theme}
                onReset={handleReset}
            />
        );
    }

    return (
        <div>
            {error && (
                <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-center font-bold">
                    {error}
                </div>
            )}
            <FlashcardSetup files={files} onStart={handleStart} />
        </div>
    );
};

export default FlashcardContainer;
