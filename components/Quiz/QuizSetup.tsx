import React, { useState } from 'react';
import { QuizConfig, FileContext } from '../../types';
import { BookOpen, Upload, FileText, Check } from 'lucide-react';

interface QuizSetupProps {
    files: FileContext[];
    onStart: (config: QuizConfig) => void;
    isLoading: boolean;
}

const QuizSetup: React.FC<QuizSetupProps> = ({ files, onStart, isLoading }) => {
    const [sourceType, setSourceType] = useState<'subject' | 'file'>('subject');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [uploadedFile, setUploadedFile] = useState<FileContext | null>(null);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [questionCount, setQuestionCount] = useState<number>(5);
    const [quizType, setQuizType] = useState<'single' | 'multiple'>('single');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                setUploadedFile({
                    id: 'temp-quiz-file',
                    name: file.name,
                    type: file.type,
                    data: base64,
                    size: file.size
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const subjects = [
        "Anatomie", "Physiologie", "Sémiologie", "Pharmacologie",
        "Pathologie", "Soins Infirmiers", "Pédiatrie", "Cardiologie",
        "Pneumologie", "Traumatologie"
    ];

    const handleStart = () => {
        onStart({
            sourceType,
            subject: sourceType === 'subject' ? selectedSubject : undefined,
            fileContext: sourceType === 'file' ? uploadedFile! : undefined,
            difficulty,
            questionCount,
            quizType
        });
    };

    const canStart = (sourceType === 'subject' && selectedSubject) || (sourceType === 'file' && uploadedFile);

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-dark-surface rounded-2xl shadow-xl mt-10 transition-all duration-300">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-medical-600 to-medical-400 font-sans mb-2">
                    Générateur de Quiz
                </h2>
                <p className="text-gray-500 dark:text-gray-400">Testez vos connaissances en quelques clics</p>
            </div>

            <div className="space-y-8">
                {/* Source Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-right">مصدر الأسئلة</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setSourceType('subject')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${sourceType === 'subject'
                                ? 'border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-600 dark:text-medical-400'
                                : 'border-gray-200 dark:border-dark-border text-gray-500 hover:border-medical-200'
                                }`}
                        >
                            <BookOpen className="w-6 h-6" />
                            <span>مادة دراسية</span>
                        </button>
                        <button
                            onClick={() => setSourceType('file')}
                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${sourceType === 'file'
                                ? 'border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-600 dark:text-medical-400'
                                : 'border-gray-200 dark:border-dark-border text-gray-500 hover:border-medical-200'
                                }`}
                        >
                            <Upload className="w-6 h-6" />
                            <span>تحميل ملف</span>
                        </button>
                    </div>
                </div>

                {/* Source Details */}
                <div className="min-h-[100px]">
                    {sourceType === 'subject' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {subjects.map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setSelectedSubject(sub)}
                                    className={`px-3 py-2 rounded-lg text-sm border transition-all ${selectedSubject === sub
                                        ? 'bg-medical-500 text-white border-medical-500'
                                        : 'bg-gray-50 dark:bg-dark-bg text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-100'
                                        }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept=".pdf,image/*,.txt"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {uploadedFile ? (
                                <>
                                    <FileText className="w-10 h-10 text-medical-500 mb-2" />
                                    <p className="font-medium text-gray-900 dark:text-white">{uploadedFile.name}</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                    <p className="text-gray-500">اضغط لرفع ملف (PDF, صورة, نص)</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Quiz Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-right">نوع الاختبار</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setQuizType('single')}
                            className={`p-3 rounded-xl border-2 transition-all ${quizType === 'single'
                                ? 'border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-600 dark:text-medical-400'
                                : 'border-gray-200 dark:border-dark-border text-gray-500 hover:border-medical-200'
                                }`}
                        >
                            <span className="font-bold block">Quiz (QCS)</span>
                            <span className="text-xs opacity-75">إجابة واحدة صحيحة</span>
                        </button>
                        <button
                            onClick={() => setQuizType('multiple')}
                            className={`p-3 rounded-xl border-2 transition-all ${quizType === 'multiple'
                                ? 'border-medical-500 bg-medical-50 dark:bg-medical-900/20 text-medical-600 dark:text-medical-400'
                                : 'border-gray-200 dark:border-dark-border text-gray-500 hover:border-medical-200'
                                }`}
                        >
                            <span className="font-bold block">QCM (Tout ou Rien)</span>
                            <span className="text-xs opacity-75">عدة إجابات ممكنة</span>
                        </button>
                    </div>
                </div>

                {/* Configuration */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">الصعوبة</label>
                        <div className="flex rounded-lg bg-gray-100 dark:bg-dark-bg p-1">
                            {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setDifficulty(level)}
                                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${difficulty === level
                                        ? 'bg-white dark:bg-dark-surface shadow text-medical-600'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                        }`}
                                >
                                    {level === 'Easy' ? 'سهل' : level === 'Medium' ? 'متوسط' : 'صعب'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">عدد الأسئلة</label>
                        <select
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            className="w-full rounded-lg border-gray-200 dark:border-dark-border bg-gray-100 dark:bg-dark-bg py-2 px-3 text-right focus:ring-2 focus:ring-medical-500 outline-none"
                        >
                            <option value={5}>5 أسئلة</option>
                            <option value={10}>10 أسئلة</option>
                            <option value={15}>15 سؤال</option>
                            <option value={20}>20 سؤال</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleStart}
                    disabled={!canStart || isLoading}
                    className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-medical-500/30 transition-all flex items-center justify-center gap-2 ${!canStart || isLoading
                        ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-70'
                        : 'bg-gradient-to-r from-medical-600 to-medical-500 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                >
                    {isLoading ? (
                        <>Thinking...</>
                    ) : (
                        <>ابدأ الاختبار <Check className="w-5 h-5" /></>
                    )}

                </button>
            </div>
        </div>
    );
};

export default QuizSetup;
