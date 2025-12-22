import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { Flashcard } from '../../services/flashcardService';

interface FlashcardActiveProps {
    cards: Flashcard[];
    theme?: string;
    onReset: () => void;
}

const FlashcardActive: React.FC<FlashcardActiveProps> = ({ cards, theme = 'classic', onReset }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [viewedCount, setViewedCount] = useState<Set<number>>(new Set([0]));

    const currentCard = cards[currentIndex];

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
            setViewedCount(prev => new Set(prev).add(currentIndex + 1));
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
        }
    };

    const getThemeClasses = () => {
        switch (theme) {
            case 'modern':
                return 'bg-indigo-600 text-white';
            case 'medical':
                return 'bg-sky-500 text-white';
            case 'dark-gold':
                return 'bg-gray-900 border-2 border-amber-500/30 text-amber-100';
            default:
                return 'bg-white dark:bg-dark-surface text-gray-800 dark:text-white border-2 border-gray-100 dark:border-dark-border';
        }
    };

    const progress = ((viewedCount.size) / cards.length) * 100;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            {/* Header info */}
            <div className="flex justify-between items-center">
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-500 transition-colors"
                >
                    <RotateCcw size={16} />
                    إعادة الضبط
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500">{currentIndex + 1} من {cards.length}</span>
                    <div className="w-32 h-2 bg-gray-200 dark:bg-dark-bg rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${(currentIndex + 1) / cards.length * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* The Flashcard */}
            <div
                className="perspective-1000 w-full min-h-[400px] cursor-pointer group"
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ willChange: 'transform' }}
            >
                <div className={`relative w-full h-[400px] transition-transform duration-400 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front */}
                    <div className={`absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 rounded-[1.5rem] shadow-xl ${getThemeClasses()} text-center`}>
                        <div className="absolute top-6 right-8 opacity-20"><Sparkles size={40} /></div>
                        <h2 className="text-xl md:text-2xl font-bold leading-relaxed">
                            {currentCard.front}
                        </h2>
                        <p className="absolute bottom-10 text-xs opacity-50 font-medium tracking-wide">
                            انقر للقلب
                        </p>
                    </div>

                    {/* Back */}
                    <div className={`absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 rounded-[1.5rem] shadow-xl ${theme === 'classic' ? 'bg-amber-50 dark:bg-amber-900/20' : getThemeClasses()} text-center overflow-y-auto`}>
                        <div className="absolute top-6 left-8 opacity-20"><CheckCircle2 size={40} /></div>
                        <h2 className={`text-xl md:text-2xl font-bold mb-6 ${theme === 'classic' ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                            {currentCard.back}
                        </h2>
                        {currentCard.explanation && (
                            <div className={`p-4 rounded-xl text-sm max-w-md ${theme === 'classic' ? 'bg-white/80 dark:bg-dark-bg/80 text-gray-600 dark:text-gray-300' : 'bg-black/10 text-white/90'}`}>
                                <div className="flex items-center gap-2 mb-2 font-bold opacity-80 justify-center">
                                    <Info size={14} />
                                    توضيح إضافي
                                </div>
                                {currentCard.explanation}
                            </div>
                        )}
                        <p className="absolute bottom-10 text-sm opacity-50 font-medium">
                            انقر للعودة
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8">
                <button
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    disabled={currentIndex === 0}
                    className="p-4 rounded-full bg-white dark:bg-dark-surface shadow-md hover:shadow-lg disabled:opacity-30 transition-all active:scale-90 border border-gray-100 dark:border-dark-border"
                >
                    <ChevronRight size={24} className="text-gray-700 dark:text-white" />
                </button>

                <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-widest font-bold">التقدم الإجمالي</p>
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                        {Math.round(progress)}%
                    </div>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    disabled={currentIndex === cards.length - 1}
                    className="p-4 rounded-full bg-white dark:bg-dark-surface shadow-md hover:shadow-lg disabled:opacity-30 transition-all active:scale-90 border border-gray-100 dark:border-dark-border"
                >
                    <ChevronLeft size={24} className="text-gray-700 dark:text-white" />
                </button>
            </div>

            {/* Result / Finish CTA */}
            {currentIndex === cards.length - 1 && (
                <div className="text-center pt-4 animate-bounce">
                    <button
                        onClick={onReset}
                        className="px-8 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg"
                    >
                        إنهاء المراجعة
                    </button>
                </div>
            )}

            <style>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
};

export default FlashcardActive;
