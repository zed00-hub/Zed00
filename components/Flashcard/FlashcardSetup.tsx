import React, { useState } from 'react';
import { BookOpen, Sparkles, FileText, Settings2, ArrowRight } from 'lucide-react';
import { FlashcardConfig } from '../../services/flashcardService';

interface FlashcardSetupProps {
    files: any[];
    onStart: (config: FlashcardConfig) => void;
}

const FlashcardSetup: React.FC<FlashcardSetupProps> = ({ files, onStart }) => {
    const [sourceType, setSourceType] = useState<'subject' | 'file'>('subject');
    const [subject, setSubject] = useState('');
    const [selectedFileId, setSelectedFileId] = useState('');
    const [count, setCount] = useState(10);
    const [customization, setCustomization] = useState('');
    const [theme, setTheme] = useState('classic');

    const handleStart = () => {
        const config: FlashcardConfig = {
            sourceType,
            count,
            customization,
            theme
        };

        if (sourceType === 'subject') {
            config.subject = subject;
        } else {
            const file = files.find(f => f.id === selectedFileId);
            if (file) {
                config.fileContext = {
                    id: file.id,
                    name: file.name,
                    type: file.type,
                    size: file.size
                };
            }
        }

        onStart(config);
    };

    const courseFiles = files.filter(f => !!f.content);

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-dark-surface rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border animate-fadeIn">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                    <Sparkles className="text-amber-600 dark:text-amber-400" size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">FLASHIHA - صانع الفلاش كاردس</h1>
                    <p className="text-gray-500 dark:text-dark-muted">حول دروسك إلى بطاقات مراجعة ذكية</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Source Selection */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 text-right">مصدر المحتوى</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setSourceType('subject')}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${sourceType === 'subject'
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                : 'border-gray-100 dark:border-dark-border hover:border-amber-200'}`}
                        >
                            <BookOpen size={24} />
                            <span className="font-bold text-sm">مادة من المقرر</span>
                        </button>
                        <button
                            onClick={() => setSourceType('file')}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${sourceType === 'file'
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                : 'border-gray-100 dark:border-dark-border hover:border-amber-200'}`}
                        >
                            <FileText size={24} />
                            <span className="font-bold text-sm">ملف مرفوع</span>
                        </button>
                    </div>
                </div>

                {/* Source Input */}
                {sourceType === 'subject' ? (
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right">اختر المادة</label>
                        <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                        >
                            <option value="">-- اختر مادة --</option>
                            <option value="Anatomie">Anatomie</option>
                            <option value="Physiologie">Physiologie</option>
                            <option value="Terminologie">Terminologie</option>
                            <option value="Pharmacologie">Pharmacologie</option>
                            <option value="Microbiologie">Microbiologie</option>
                            {courseFiles.map(f => (
                                <option key={f.id} value={f.name}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right">اختر الملف</label>
                        <select
                            value={selectedFileId}
                            onChange={(e) => setSelectedFileId(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                        >
                            <option value="">-- اختر ملفاً --</option>
                            {files.filter(f => !f.content).map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Settings */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right">عدد البطاقات</label>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value))}
                            className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl outline-none dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right">المظهر</label>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl outline-none dark:text-white"
                        >
                            <option value="classic">كلاسيكي</option>
                            <option value="modern">مودرن</option>
                            <option value="medical">طبي</option>
                            <option value="dark-gold">ذهبي معتم</option>
                        </select>
                    </div>
                </div>

                {/* Customization (The optional small box) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right flex items-center justify-end gap-2">
                        <Settings2 size={16} />
                        تخصيص إضافي (اختياري)
                    </label>
                    <textarea
                        placeholder="مثلاً: ركز على المصطلحات اللاتينية، أو اجعل الأسئلة قصيرة جداً..."
                        value={customization}
                        onChange={(e) => setCustomization(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl outline-none dark:text-white min-h-[100px] text-right"
                    />
                </div>

                <button
                    onClick={handleStart}
                    disabled={sourceType === 'subject' ? !subject : !selectedFileId}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    إنشاء البطاقات الآن
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default FlashcardSetup;
