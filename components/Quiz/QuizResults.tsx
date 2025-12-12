import React, { useState } from 'react';
import { QuizQuestion, QuizConfig } from '../../types';
import { Trophy, XCircle, CheckCircle, RotateCcw, BookOpen, AlertCircle } from 'lucide-react';

interface QuizResultsProps {
    questions: QuizQuestion[];
    userAnswers: { [key: number]: number[] };
    score: number;
    config: QuizConfig | null;
    onRestart: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ questions, userAnswers, score, config, onRestart }) => {
    const [showReview, setShowReview] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const percentage = Math.round((score / questions.length) * 100);

    const handleCopyReport = () => {
        const lines = [`📊 نتيجة الاختبار: ${config?.subject || 'معلومات عامة'}`, `النقاط: ${score}/${questions.length} (${percentage}%)`, ''];

        questions.forEach((q, i) => {
            const userAns = userAnswers[q.id] || [];
            const correctAns = q.correctAnswers || [];
            const sortedUser = [...userAns].sort();
            const sortedCorrect = [...correctAns].sort();
            const isCorrect = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);

            lines.push(`س${i + 1}: ${q.question}`);
            lines.push(`إجابتك: ${userAns.map(idx => q.options[idx]).join(', ')} ${isCorrect ? '✅' : '❌'}`);
            if (!isCorrect) {
                lines.push(`الإجابة الصحيحة: ${correctAns.map(idx => q.options[idx]).join(', ')}`);
            }
            lines.push('');
        });

        const text = lines.join('\n');
        navigator.clipboard.writeText(text);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    };

    const scoreOutOf20 = Math.round((score / questions.length) * 20);

    const getGradeColor = () => {
        if (percentage >= 80) return 'text-green-500';
        if (percentage >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getGradeMessage = () => {
        if (percentage >= 80) return 'ممتاز! نتيجة رائعة';
        if (percentage >= 50) return 'جيد، لكن يمكنك التحسن';
        return 'تحتاج إلى مزيد من المراجعة';
    };

    return (
        <div className="max-w-4xl mx-auto p-6 animate-fadeIn">
            {/* Summary Card */}
            <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-xl overflow-hidden mb-8 text-center relative">
                <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-medical-400 via-medical-600 to-medical-400" />
                <div className="p-8 sm:p-12">
                    <div className="mb-6 inline-block p-4 rounded-full bg-medical-50 dark:bg-medical-900/20">
                        <Trophy className={`w-16 h-16 ${getGradeColor()}`} />
                    </div>

                    <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">{scoreOutOf20}/20</h2>
                    <p className={`text-xl font-medium ${getGradeColor()} mb-6`}>{getGradeMessage()}</p>

                    <div className="flex justify-center gap-8 text-gray-600 dark:text-gray-400 mb-8 border-t border-b border-gray-100 dark:border-dark-border py-6">
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-gray-900 dark:text-white">{questions.length}</span>
                            <span className="text-sm">الأسئلة</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-green-500">{score}</span>
                            <span className="text-sm">صحيحة</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-red-500">{questions.length - score}</span>
                            <span className="text-sm">خاطئة</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 mt-6">
                        <button
                            onClick={handleCopyReport}
                            className="px-6 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2"
                        >
                            {copyFeedback ? <CheckCircle className="w-4 h-4 text-green-500" /> : <BookOpen className="w-4 h-4" />}
                            {copyFeedback ? 'تم النسخ' : 'نسخ التقرير النصي'}
                        </button>

                        <div className="flex justify-center gap-4 w-full">
                            <button
                                onClick={() => setShowReview(!showReview)}
                                className="flex-1 sm:flex-none px-6 py-3 rounded-xl border-2 border-medical-500 text-medical-600 dark:text-medical-400 font-bold hover:bg-medical-50 dark:hover:bg-medical-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <BookOpen className="w-5 h-5" />
                                {showReview ? 'إخفاء المراجعة' : 'مراجعة الأجوبة'}
                            </button>
                            <button
                                onClick={onRestart}
                                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-medical-600 text-white font-bold hover:bg-medical-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-5 h-5" />
                                اختبار جديد
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Review Section */}
            {
                showReview && (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-right mb-4">مراجعة تفصيلية</h3>
                        {questions.map((q, index) => {
                            const userAns = userAnswers[q.id] || [];
                            const correctAns = q.correctAnswers || [];

                            const sortedUser = [...userAns].sort();
                            const sortedCorrect = [...correctAns].sort();
                            const isCorrect = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);

                            return (
                                <div key={q.id} className={`bg-white dark:bg-dark-surface rounded-2xl shadow-sm border p-6 ${isCorrect ? 'border-green-100 dark:border-green-900/30' : 'border-red-100 dark:border-red-900/30'
                                    }`}>
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className={`p-2 rounded-full shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {isCorrect ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                        </div>
                                        <h4 className="flex-1 text-lg font-bold text-gray-900 dark:text-white text-right">{q.question}</h4>
                                        <span className="text-sm text-gray-400">#{index + 1}</span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {q.options.map((opt, optIndex) => {
                                            const isSelected = userAns.includes(optIndex);
                                            const isTheCorrectAnswer = correctAns.includes(optIndex);

                                            let style = "bg-gray-50 dark:bg-dark-bg/50 border-transparent";
                                            if (isTheCorrectAnswer) style = "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300";
                                            else if (isSelected && !isTheCorrectAnswer) style = "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300";

                                            return (
                                                <div key={optIndex} className={`p-3 rounded-lg border flex justify-between items-center ${style}`}>
                                                    <span>{opt}</span>
                                                    {isTheCorrectAnswer && <CheckCircle className="w-4 h-4 text-green-600" />}
                                                    {isSelected && !isTheCorrectAnswer && <XCircle className="w-4 h-4 text-red-600" />}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl flex gap-3 text-blue-800 dark:text-blue-300">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold block text-sm mb-1">الشرح:</span>
                                            <p className="text-sm leading-relaxed">{q.explanation}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }
        </div >
    );
};

export default QuizResults;
