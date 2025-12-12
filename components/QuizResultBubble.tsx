import React, { useState } from 'react';
import { QuizResultData } from '../types';
import { Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface QuizResultBubbleProps {
    data: QuizResultData;
}

const QuizResultBubble: React.FC<QuizResultBubbleProps> = ({ data }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const getGradeColor = () => {
        if (data.percentage >= 80) return 'text-green-500';
        if (data.percentage >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getGradeBg = () => {
        if (data.percentage >= 80) return 'from-green-500/10 to-emerald-500/5 border-green-200 dark:border-green-800/50';
        if (data.percentage >= 50) return 'from-yellow-500/10 to-amber-500/5 border-yellow-200 dark:border-yellow-800/50';
        return 'from-red-500/10 to-rose-500/5 border-red-200 dark:border-red-800/50';
    };

    const getGradeMessage = () => {
        if (data.percentage >= 80) return 'ممتاز! 🎉';
        if (data.percentage >= 50) return 'جيد 👍';
        return 'تحتاج مراجعة 📚';
    };

    const handleCopy = async () => {
        const lines = [
            `📊 نتيجة الاختبار: ${data.subjectName}`,
            `النقاط: ${data.score}/${data.totalQuestions} (${data.percentage}%)`,
            ''
        ];

        data.questions.forEach((q, i) => {
            lines.push(`س${i + 1}: ${q.questionText}`);
            lines.push(`إجابتك: ${q.userAnswer} ${q.isCorrect ? '✅' : '❌'}`);
            if (!q.isCorrect) {
                lines.push(`الإجابة الصحيحة: ${q.correctAnswer}`);
            }
            lines.push('');
        });

        await navigator.clipboard.writeText(lines.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`rounded-2xl overflow-hidden border-2 bg-gradient-to-br ${getGradeBg()} backdrop-blur-sm shadow-lg`}>
            {/* Header */}
            <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm ${getGradeColor()}`}>
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">نتيجة الاختبار</p>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm sm:text-base">
                                {data.subjectName}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors text-gray-500 dark:text-gray-400"
                        title="نسخ النتيجة"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>

                {/* Score Display */}
                <div className="flex items-center justify-center gap-6 py-4 px-4 bg-white/60 dark:bg-gray-800/60 rounded-xl mb-4">
                    <div className="text-center">
                        <span className={`text-3xl sm:text-4xl font-bold ${getGradeColor()}`}>
                            {data.score}/{data.totalQuestions}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">النقاط</p>
                    </div>
                    <div className="w-px h-12 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="text-center">
                        <span className={`text-3xl sm:text-4xl font-bold ${getGradeColor()}`}>
                            {data.percentage}%
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">النسبة</p>
                    </div>
                    <div className="w-px h-12 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="text-center">
                        <span className={`text-lg sm:text-xl font-bold ${getGradeColor()}`}>
                            {getGradeMessage()}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">التقييم</p>
                    </div>
                </div>

                {/* Expand/Collapse Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-800 transition-all text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-4 h-4" />
                            <span>إخفاء التفاصيل</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4" />
                            <span>عرض تفاصيل الأسئلة ({data.questions.length})</span>
                        </>
                    )}
                </button>
            </div>

            {/* Questions Detail (Expandable) */}
            {isExpanded && (
                <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-5 space-y-3 bg-white/30 dark:bg-gray-900/30">
                    {data.questions.map((q, index) => (
                        <div
                            key={index}
                            className={`p-3 sm:p-4 rounded-xl border ${q.isCorrect
                                ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
                                : 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${q.isCorrect
                                    ? 'bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-400'
                                    : 'bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-400'
                                    }`}>
                                    {q.isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0 text-right">
                                    <p className="font-medium text-gray-800 dark:text-gray-200 text-sm mb-2">
                                        <span className="text-gray-400 dark:text-gray-500 ml-1">س{index + 1}:</span>
                                        {q.questionText}
                                    </p>
                                    <div className="space-y-1 text-sm">
                                        <p className={q.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                            <span className="text-gray-500 dark:text-gray-400">إجابتك:</span>{' '}
                                            <span className="font-medium">{q.userAnswer}</span>
                                            {q.isCorrect ? ' ✅' : ' ❌'}
                                        </p>
                                        {!q.isCorrect && (
                                            <p className="text-green-700 dark:text-green-400">
                                                <span className="text-gray-500 dark:text-gray-400">الإجابة الصحيحة:</span>{' '}
                                                <span className="font-medium">{q.correctAnswer}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizResultBubble;
