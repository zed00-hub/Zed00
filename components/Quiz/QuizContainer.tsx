import React, { useState } from 'react';
import { QuizConfig, QuizState, FileContext, QuizQuestion } from '../../types';
import { generateQuiz } from '../../services/geminiService';
import QuizSetup from './QuizSetup';
import QuizActive from './QuizActive';
import QuizResults from './QuizResults';
import { LoadingIcon } from '../Icons';

interface QuizContainerProps {
    files: FileContext[];
}

const QuizContainer: React.FC<QuizContainerProps> = ({ files }) => {
    const [state, setState] = useState<QuizState>({
        isActive: false,
        config: null,
        questions: [],
        currentQuestionIndex: 0,
        userAnswers: {},
        score: 0,
        isFinished: false
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStartQuiz = async (config: QuizConfig) => {
        setIsLoading(true);
        setError(null);
        try {
            const questions = await generateQuiz(config, files);
            setState({
                isActive: true,
                config,
                questions,
                currentQuestionIndex: 0,
                userAnswers: {},
                score: 0,
                isFinished: false
            });
        } catch (err: any) {
            setError(err.message || "Failed to generate quiz");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAnswer = (index: number) => {
        setState(prev => ({
            ...prev,
            userAnswers: {
                ...prev.userAnswers,
                [prev.questions[prev.currentQuestionIndex].id]: index
            }
        }));
    };

    const handleNext = () => {
        setState(prev => ({
            ...prev,
            currentQuestionIndex: prev.currentQuestionIndex + 1
        }));
    };

    const handleFinish = () => {
        // Calculate score
        let score = 0;
        state.questions.forEach(q => {
            if (state.userAnswers[q.id] === q.correctAnswer) {
                score++;
            }
        });

        setState(prev => ({
            ...prev,
            score,
            isFinished: true,
            isActive: false
        }));
    };

    const handleRestart = () => {
        setState({
            isActive: false,
            config: null,
            questions: [],
            currentQuestionIndex: 0,
            userAnswers: {},
            score: 0,
            isFinished: false
        });
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center animate-fadeIn">
                <LoadingIcon />
                <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-300">
                    جاري إعداد الاختبار...
                </p>
                <p className="text-sm text-gray-400">نقوم بتحليل المحتوى وتوليد الأسئلة</p>
            </div>
        );
    }

    if (state.isFinished) {
        return (
            <QuizResults
                questions={state.questions}
                userAnswers={state.userAnswers}
                score={state.score}
                config={state.config}
                onRestart={handleRestart}
            />
        );
    }

    if (state.isActive && state.questions.length > 0) {
        return (
            <QuizActive
                question={state.questions[state.currentQuestionIndex]}
                currentQuestionIndex={state.currentQuestionIndex}
                totalQuestions={state.questions.length}
                selectedAnswer={state.userAnswers[state.questions[state.currentQuestionIndex].id] ?? null}
                onSelectAnswer={handleSelectAnswer}
                onNext={handleNext}
                onFinish={handleFinish}
            />
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            {error && (
                <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-center">
                    {error}
                </div>
            )}
            <QuizSetup
                files={files}
                onStart={handleStartQuiz}
                isLoading={isLoading}
            />
        </div>
    );
};

export default QuizContainer;
