import React from 'react';
import { QuizQuestion } from '../../types';
import { CheckCircle, XCircle, ArrowLeft, RotateCcw, ArrowRight, X } from 'lucide-react';

interface QuizActiveProps {
    question: QuizQuestion;
    currentQuestionIndex: number;
    totalQuestions: number;
    selectedAnswers: number[];
    quizType: 'single' | 'multiple';
    onSelectAnswer: (index: number) => void;
    onNext: () => void;
    onPrevious: () => void;
    onCancel: () => void;
    onFinish: () => void;
}

const QuizActive: React.FC<QuizActiveProps> = ({
    question,
    currentQuestionIndex,
    totalQuestions,
    selectedAnswers,
    quizType,
    onSelectAnswer,
    onNext,
    onPrevious,
    onCancel,
    onFinish
}) => {
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 mt-4">
            {/* Progress Bar & Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg"
                    >
                        <X size={18} />
                        <span className="text-sm font-bold">إلغاء الاختبار</span>
                    </button>
                </div>
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">
                    <span>سؤال {currentQuestionIndex + 1} من {totalQuestions}</span>
                    <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-medical-500 to-medical-400 transition-all duration-500 ease-out"
                        style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-lg border border-gray-100 dark:border-dark-border overflow-hidden">
                <div className="p-6 sm:p-8">
                    <div className="flex justify-between items-start mb-6">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${quizType === 'multiple'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                            {quizType === 'multiple' ? 'Plusieurs choix (Tout ou Rien)' : 'Choix Unique'}
                        </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white leading-relaxed mb-8 text-right bg-clip-text">
                        {question.question}
                    </h3>

                    <div className="space-y-4">
                        {question.options.map((option, index) => {
                            const isSelected = selectedAnswers.includes(index);
                            return (
                                <button
                                    key={index}
                                    onClick={() => onSelectAnswer(index)}
                                    className={`w-full p-4 rounded-xl text-right transition-all transform duration-200 flex items-center justify-between group ${isSelected
                                        ? 'bg-medical-50 dark:bg-medical-900/30 border-2 border-medical-500 text-medical-700 dark:text-medical-300 shadow-md scale-[1.01]'
                                        : 'bg-gray-50 dark:bg-dark-bg border-2 border-transparent hover:bg-gray-100 dark:hover:bg-dark-bg/80 text-gray-700 dark:text-gray-300 hover:scale-[1.01]'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${isSelected
                                            ? 'bg-medical-500 text-white border-medical-500'
                                            : 'bg-white dark:bg-dark-surface text-gray-400 border-gray-300 dark:border-gray-600'
                                            }`}>
                                            {quizType === 'multiple'
                                                ? (isSelected ? '✓' : '') // Checkbox style
                                                : ['A', 'B', 'C', 'D'][index] // Radio style
                                            }
                                        </span>
                                        <span className="font-medium text-lg">{option}</span>
                                    </div>
                                    {isSelected && (
                                        <CheckCircle className="w-6 h-6 text-medical-500 animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-dark-bg/50 border-t border-gray-100 dark:border-dark-border flex justify-between items-center">
                    <div>
                        {currentQuestionIndex > 0 ? (
                            <button
                                onClick={onPrevious}
                                className="px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
                            >
                                <ArrowRight className="w-5 h-5" />
                                السابق
                            </button>
                        ) : (
                            <div className="text-sm text-gray-400 px-2">
                                اختر إجابة للمتابعة
                            </div>
                        )}
                    </div>
                    <button
                        onClick={isLastQuestion ? onFinish : onNext}
                        disabled={selectedAnswers.length === 0}
                        className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${selectedAnswers.length === 0
                            ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                            : 'bg-gradient-to-l from-medical-600 to-medical-500 hover:from-medical-500 hover:to-medical-400 hover:-translate-x-1'
                            }`}
                    >
                        {isLastQuestion ? 'إنهاء الاختبار' : 'التالي'}
                        {!isLastQuestion && <ArrowLeft className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizActive;
