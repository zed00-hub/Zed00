import React, { useState, useRef } from 'react';
import { BookOpen, Sparkles, FileText, Settings2, ArrowRight, UploadCloud, X, FileCheck, Image as ImageIcon } from 'lucide-react';
import { FlashcardConfig } from '../../services/flashcardService';
import { fileToBase64, formatFileSize } from '../../utils/fileHelpers';
import { extractTextFromDocx } from '../../utils/docxUtils';
import { FileContext } from '../../types';

interface FlashcardSetupProps {
    files: FileContext[];
    onStart: (config: FlashcardConfig) => void;
}

const FlashcardSetup: React.FC<FlashcardSetupProps> = ({ files, onStart }) => {
    const [sourceType, setSourceType] = useState<'subject' | 'file'>('subject');
    const [subject, setSubject] = useState('');
    const [uploadedFile, setUploadedFile] = useState<FileContext | null>(null);
    const [count, setCount] = useState(10);
    const [customization, setCustomization] = useState('');
    const [theme, setTheme] = useState('classic');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleStart = () => {
        const config: FlashcardConfig = {
            sourceType,
            count,
            customization,
            theme
        };

        if (sourceType === 'subject') {
            config.subject = subject;
        } else if (uploadedFile) {
            config.fileContext = uploadedFile;
        }

        onStart(config);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const isDocx = file.name.toLowerCase().endsWith('.docx') ||
                file.name.toLowerCase().endsWith('.doc') ||
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            if (isDocx) {
                const text = await extractTextFromDocx(file);
                setUploadedFile({
                    id: Math.random().toString(36).substring(7),
                    name: file.name,
                    type: 'text/plain',
                    content: text,
                    size: file.size
                });
            } else {
                const base64 = await fileToBase64(file);
                setUploadedFile({
                    id: Math.random().toString(36).substring(7),
                    name: file.name,
                    type: file.type,
                    data: base64,
                    size: file.size
                });
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("حدث خطأ أثناء تحميل الملف");
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = () => {
        setUploadedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                    <p className="text-gray-500 dark:text-dark-muted text-sm md:text-base">حول دروسك إلى بطاقات مراجعة ذكية</p>
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
                                : 'border-gray-100 dark:border-dark-border hover:border-amber-200 shadow-sm'}`}
                        >
                            <BookOpen size={24} />
                            <span className="font-bold text-sm">مادة من المقرر</span>
                        </button>
                        <button
                            onClick={() => setSourceType('file')}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${sourceType === 'file'
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                : 'border-gray-100 dark:border-dark-border hover:border-amber-200 shadow-sm'}`}
                        >
                            <FileText size={24} />
                            <span className="font-bold text-sm">رفع ملف خارجي</span>
                        </button>
                    </div>
                </div>

                {/* Source Input */}
                {sourceType === 'subject' ? (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right">اختر المادة التعليمية</label>
                        <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none dark:text-white transition-all"
                        >
                            <option value="">-- اختر مادة --</option>
                            <option value="Anatomie">Anatomie (التشريح)</option>
                            <option value="Physiologie">Physiologie (علم وظائف الأعضاء)</option>
                            <option value="Terminologie">Terminologie (المصطلحات)</option>
                            <option value="Pharmacologie">Pharmacologie (علم الأدوية)</option>
                            <option value="Microbiologie">Microbiologie (علم الأحياء الدقيقة)</option>
                            {courseFiles.map(f => (
                                <option key={f.id} value={f.name}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-left-4 duration-300">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right">أدرج الملف (PDF, PPTX, Docx, صور)</label>

                        {!uploadedFile ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 border-gray-200 dark:border-gray-700'}`}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".pdf,.pptx,.docx,.doc,image/*"
                                    onChange={handleFileChange}
                                />
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600">
                                    <UploadCloud size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-gray-700 dark:text-gray-200">انقر أو اسحب الملف هنا</p>
                                    <p className="text-xs text-gray-400 mt-1">يدعم PDF و PowerPoint و Word والصور</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                                        {uploadedFile.type.startsWith('image/') ? <ImageIcon size={20} /> : <FileCheck size={20} />}
                                    </div>
                                    <div className="min-w-0 text-right">
                                        <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{uploadedFile.name}</p>
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{formatFileSize(uploadedFile.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={removeFile}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Settings */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right">عدد البطاقات</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="40"
                                value={count}
                                onChange={(e) => setCount(parseInt(e.target.value))}
                                className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl outline-none dark:text-white focus:ring-2 focus:ring-amber-500 transition-all font-bold text-center"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right">تنسيق المظهر</label>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl outline-none dark:text-white focus:ring-2 focus:ring-amber-500 transition-all"
                        >
                            <option value="classic">كلاسيكي (Classic)</option>
                            <option value="modern">مودرن (Modern)</option>
                            <option value="medical">طبي (Medical)</option>
                            <option value="dark-gold">ذهبي معتم (Dark Gold)</option>
                        </select>
                    </div>
                </div>

                {/* Customization (The optional small box) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-right flex items-center justify-end gap-2">
                        <Settings2 size={16} />
                        تخصيص الخوارزمية (اختياري)
                    </label>
                    <textarea
                        placeholder="مثلاً: ركز على المصطلحات اللاتينية، أو اجعل الأسئلة قصيرة جداً..."
                        value={customization}
                        onChange={(e) => setCustomization(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl outline-none dark:text-white min-h-[100px] text-right focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                    />
                </div>

                <button
                    onClick={handleStart}
                    disabled={sourceType === 'subject' ? !subject : !uploadedFile || isUploading}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-90 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {isUploading ? 'جاري معالجة الملف...' : 'إنشاء البطاقات الآن'}
                    {!isUploading && <ArrowRight size={20} />}
                </button>
            </div>
        </div>
    );
};

export default FlashcardSetup;
