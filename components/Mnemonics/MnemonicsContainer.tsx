import React, { useState } from 'react';
import { MnemonicResponse } from '../../types';
import { generateMnemonic } from '../../services/geminiService';
import { LoadingIcon, BookOpen } from '../Icons';
import { Lightbulb, Zap, Sparkles } from 'lucide-react';

const MnemonicsContainer: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [context, setContext] = useState('');
    const [language, setLanguage] = useState<'ar' | 'fr'>('fr');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<MnemonicResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await generateMnemonic(topic, language, context);
            setResult(data);
        } catch (err: any) {
            setError(err.message || "حدث خطأ أثناء التوليد");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="text-center mb-8 animate-fadeIn">
                <div className="inline-flex p-4 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full mb-4 shadow-sm border border-amber-200 dark:border-amber-700/50">
                    <Sparkles className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 mb-2">
                    صانع الحيل الحفظية
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
                    حول القوائم الطويلة والمعلومات المعقدة إلى جمل سحرية لا تُنسى! استخدم قوة الذاكرة البصرية واللفظية.
                </p>
            </div>

            {/* Input Section */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-dark-border mb-8 animate-slideUp">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            الموضوع أو القائمة المراد حفظها (بالفرنسية)
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Ex: Os du carpe, Nerfs crâniens..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-bg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all dark:text-white"
                            dir="ltr"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            سياق إضافي (اختياري)
                        </label>
                        <textarea
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="Ex: Scaphoïde, Lunatum, Triquetrum..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-bg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all dark:text-white h-24 resize-none"
                            dir="ltr"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                اللغة المفضلة للحيلة
                            </label>
                            <div className="flex bg-gray-100 dark:bg-dark-bg p-1 rounded-xl">
                                <button
                                    onClick={() => setLanguage('fr')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${language === 'fr'
                                        ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                        }`}
                                >
                                    Français (مصطلحات طبية)
                                </button>
                                <button
                                    onClick={() => setLanguage('ar')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${language === 'ar'
                                        ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                        }`}
                                >
                                    العربية (مع الحفاظ على المصطلحات فرنسية)
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !topic.trim()}
                        className="w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <LoadingIcon />
                                <span>جاري ابتكار السحر...</span>
                            </>
                        ) : (
                            <>
                                <Zap className="w-5 h-5 fill-current" />
                                <span>بتكر حيلة حفظية!</span>
                            </>
                        )}
                    </button>
                    {error && <p className="text-red-500 text-center text-sm mt-2">{error}</p>}
                </div>
            </div>

            {/* Results Section */}
            {result && (
                <div className="animate-slideUp delay-100 space-y-6">

                    {/* The Mnemonic Card */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-1 rounded-2xl shadow-xl transform transition-all hover:scale-[1.01]">
                        <div className="bg-white dark:bg-dark-surface h-full rounded-xl p-8 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Sparkles size={100} />
                            </div>

                            <h3 className="text-sm font-bold text-amber-600 tracking-wider uppercase mb-4">✨ جملتك السحرية ✨</h3>
                            <p className="text-2xl md:text-4xl font-black text-gray-800 dark:text-white leading-tight mb-6" dir="ltr">
                                {result.mnemonic}
                            </p>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-md border border-gray-200 dark:border-dark-border overflow-hidden">
                        <div className="bg-gray-50 dark:bg-dark-bg/50 px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                شرح الرموز
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {result.breakdown.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-bg/30 border border-gray-100 dark:border-gray-800">
                                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl font-bold text-amber-700 dark:text-amber-400 shrink-0">
                                            {item.char}
                                        </div>
                                        <div className="text-lg font-medium text-gray-700 dark:text-gray-200">
                                            {item.meaning}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Interpretation & Fun Fact */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-dark-border">
                            <h4 className="font-bold text-gray-800 dark:text-white mb-2">الشرح العام</h4>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {result.explanation}
                            </p>
                        </div>

                        {result.funFact && (
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-6 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
                                <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    هل تعلم؟
                                </h4>
                                <p className="text-indigo-700 dark:text-indigo-200 text-sm">
                                    {result.funFact}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MnemonicsContainer;
