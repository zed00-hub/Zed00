import React, { useState } from 'react';
import { useSettings, BotSettings } from '../contexts/SettingsContext';
import { X, Settings, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings, resetSettings } = useSettings();
    const [view, setView] = useState<'settings' | 'privacy'>('settings');

    if (!isOpen) return null;

    const handleChange = <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => {
        updateSettings({ [key]: value });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-dark-surface rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-medical-50 to-white dark:from-medical-900/20 dark:to-dark-surface">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-medical-100 dark:bg-medical-900/30 rounded-xl">
                            {view === 'settings' ? (
                                <Settings className="w-5 h-5 text-medical-600 dark:text-medical-400" />
                            ) : (
                                <button onClick={() => setView('settings')} className="hover:text-medical-600">
                                    <RotateCcw className="w-5 h-5 text-gray-500 rotate-90" />
                                </button>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {view === 'settings' ? 'إعدادات المساعد' : 'سياسة الخصوصية'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">

                    {view === 'privacy' ? (
                        <div className="space-y-4 text-right">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2 text-sm">🔒 حماية بياناتك</h3>
                                <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-200/80">
                                    نحن نولي أهمية قصوى لخصوصيتك. البيانات التي يتم جمعها تُستخدم حصرياً لتحسين تجربتك التعليمية.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">📊 إحصائيات الاستخدام</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    يتم تسجيل ملخص لنشاطك الدراسي (ساعات التعلم، عدد الاختبارات المنجزة، والمحادثات) وعرضها في لوحة التحكم الخاصة بك ولدى المشرفين، وذلك لغرض متابعة تقدمك الدراسي وتقديم الدعم اللازم.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm">🤖 تحسين الخدمة</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    قد يتم تحليل المحادثات والأسئلة بشكل آلي ومجهول لتحسين دقة إجابات المساعد الذكي وتطوير محتوى التطبيق ليكون أكثر فائدة للطلاب في المستقبل.
                                </p>
                            </div>

                            <div className="pt-4 mt-6 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => setView('settings')}
                                    className="w-full py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 rounded-xl transition-colors"
                                >
                                    العودة للإعدادات
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Response Length */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    📏 طول الردود المفضل
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'short', label: 'مختصر', desc: 'للمراجعة السريعة' },
                                        { value: 'medium', label: 'متوسط', desc: 'متوازن' },
                                        { value: 'long', label: 'مفصّل', desc: 'شرح كامل' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleChange('responseLength', opt.value as BotSettings['responseLength'])}
                                            className={`p-3 rounded-xl border-2 transition-all text-center ${settings.responseLength === opt.value
                                                ? 'border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-700 dark:text-medical-300'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-medical-300 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            <div className="font-bold text-sm">{opt.label}</div>
                                            <div className="text-[10px] mt-1 opacity-70">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preferred Language */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    🌐 لغة الحوار المفضلة
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'ar', label: 'العربية', icon: '🇩🇿' },
                                        { value: 'fr', label: 'Français', icon: '🇫🇷' },
                                        { value: 'mixed', label: 'مختلط', icon: '🔄' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleChange('preferredLanguage', opt.value as BotSettings['preferredLanguage'])}
                                            className={`p-3 rounded-xl border-2 transition-all text-center ${settings.preferredLanguage === opt.value
                                                ? 'border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-700 dark:text-medical-300'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-medical-300 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            <div className="text-xl mb-1">{opt.icon}</div>
                                            <div className="font-bold text-xs">{opt.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Toggle Options */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    ⚙️ خيارات إضافية
                                </label>

                                {/* Glossary Toggle */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <div>
                                        <div className="font-medium text-sm text-gray-700 dark:text-gray-300">📚 شرح المصطلحات</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">إضافة قسم الشرح بالعربية</div>
                                    </div>
                                    <button
                                        onClick={() => handleChange('includeGlossary', !settings.includeGlossary)}
                                        className={`w-12 h-7 rounded-full transition-all relative ${settings.includeGlossary ? 'bg-medical-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.includeGlossary ? 'right-1' : 'left-1'
                                            }`} />
                                    </button>
                                </div>

                                {/* Examples Toggle */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <div>
                                        <div className="font-medium text-sm text-gray-700 dark:text-gray-300">💡 أمثلة توضيحية</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">إضافة أمثلة عملية</div>
                                    </div>
                                    <button
                                        onClick={() => handleChange('includeExamples', !settings.includeExamples)}
                                        className={`w-12 h-7 rounded-full transition-all relative ${settings.includeExamples ? 'bg-medical-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.includeExamples ? 'right-1' : 'left-1'
                                            }`} />
                                    </button>
                                </div>

                                {/* Formal Tone Toggle */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                    <div>
                                        <div className="font-medium text-sm text-gray-700 dark:text-gray-300">🎓 أسلوب أكاديمي</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">لغة رسمية وعلمية</div>
                                    </div>
                                    <button
                                        onClick={() => handleChange('formalTone', !settings.formalTone)}
                                        className={`w-12 h-7 rounded-full transition-all relative ${settings.formalTone ? 'bg-medical-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${settings.formalTone ? 'right-1' : 'left-1'
                                            }`} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {view === 'settings' && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={resetSettings}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            >
                                <RotateCcw size={16} />
                                <span>إعادة تعيين</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-medical-600 hover:bg-medical-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-medical-500/20"
                            >
                                حفظ وإغلاق
                            </button>
                        </div>
                        <button
                            onClick={() => setView('privacy')}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center w-full"
                        >
                            سياسة الخصوصية والاستخدام
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default SettingsModal;
