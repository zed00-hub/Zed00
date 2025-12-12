import React, { useState, useEffect } from 'react';
import { QuizConfig, QuizState, FileContext, QuizQuestion, QuizSession } from '../../types';
import { generateQuiz } from '../../services/geminiService';
import QuizSetup from './QuizSetup';
import QuizActive from './QuizActive';
import QuizResults from './QuizResults';
import { LoadingIcon } from '../Icons';

interface QuizContainerProps {
    files: FileContext[];
    activeQuizSession?: QuizSession | null;
    onQuizUpdate?: (session: QuizSession | null) => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({ files, activeQuizSession, onQuizUpdate }) => {
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

    // Sync state with activeQuizSession
    useEffect(() => {
        if (activeQuizSession) {
            console.log("QuizContainer: Loading session", activeQuizSession.id);
            setState({
                isActive: !activeQuizSession.isFinished,
                config: activeQuizSession.config,
                questions: activeQuizSession.questions,
                currentQuestionIndex: activeQuizSession.currentQuestionIndex || 0,
                userAnswers: activeQuizSession.userAnswers,
                score: activeQuizSession.score,
                isFinished: activeQuizSession.isFinished
            });
        } else {
            // Reset state if no active session (New Quiz mode)
            // But only if we are not currently loading or in a valid state
            // to prevent flickering when switching.
            // Actually, if activeQuizSession is null, we should show Setup.
            if (!isLoading) {
                setState({
                    isActive: false,
                    config: null,
                    questions: [],
                    currentQuestionIndex: 0,
                    userAnswers: {},
                    score: 0,
                    isFinished: false
                });
            }
        }
    }, [activeQuizSession]);

    const handleStartQuiz = async (config: QuizConfig) => {
        setIsLoading(true);
        setError(null);
        try {
            const questions = await generateQuiz(config, files);
            const newState = {
                isActive: true,
                config,
                questions,
                currentQuestionIndex: 0,
                userAnswers: {},
                score: 0,
                isFinished: false
            };
            setState(newState);

            // Create new session
            if (onQuizUpdate) {
                const newSession: QuizSession = {
                    id: Date.now().toString(),
                    title: `${config.subject || config.fileContext?.name || 'اختبار'} - ${config.difficulty} (${questions.length})`,
                    createdAt: Date.now(),
                    config: config,
                    questions: questions,
                    userAnswers: {},
                    score: 0,
                    isFinished: false,
                    currentQuestionIndex: 0,
                    lastUpdated: Date.now()
                };
                onQuizUpdate(newSession);
            }

        } catch (err: any) {
            setError(err.message || "Failed to generate quiz");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAnswer = (index: number) => {
        setState(prev => {
            const currentQ = prev.questions[prev.currentQuestionIndex];
            const currentAnswers = prev.userAnswers[currentQ.id] || [];

            let newAnswers: number[];

            if (prev.config?.quizType === 'multiple') {
                if (currentAnswers.includes(index)) {
                    newAnswers = currentAnswers.filter(a => a !== index);
                } else {
                    newAnswers = [...currentAnswers, index].sort();
                }
            } else {
                newAnswers = [index];
            }

            const updatedUserAnswers = {
                ...prev.userAnswers,
                [currentQ.id]: newAnswers
            };

            // Update parent session
            if (onQuizUpdate && activeQuizSession) {
                onQuizUpdate({
                    ...activeQuizSession,
                    userAnswers: updatedUserAnswers,
                    currentQuestionIndex: prev.currentQuestionIndex, // Ensure we keep current index
                    score: prev.score,
                    isFinished: false,
                    lastUpdated: Date.now()
                });
            }

            return {
                ...prev,
                userAnswers: updatedUserAnswers
            };
        });
    };

    const handleNext = () => {
        setState(prev => {
            const nextIndex = prev.currentQuestionIndex + 1;

            if (onQuizUpdate && activeQuizSession) {
                onQuizUpdate({
                    ...activeQuizSession,
                    userAnswers: prev.userAnswers, // Important: pass latest answers explicitly
                    currentQuestionIndex: nextIndex,
                    score: prev.score,
                    isFinished: false,
                    lastUpdated: Date.now()
                });
            }

            return {
                ...prev,
                currentQuestionIndex: nextIndex
            };
        });
    };

    const handleFinish = () => {
        // Calculate score
        let score = 0;
        state.questions.forEach(q => {
            const userAns = state.userAnswers[q.id] || [];
            const correctAns = q.correctAnswers || [];

            // Sort both to ensure order doesn't matter
            const sortedUser = [...userAns].sort();
            const sortedCorrect = [...correctAns].sort();

            if (JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect)) {
                score++;
            }
        });

        const newState = {
            ...state,
            score,
            isFinished: true,
            isActive: false
        };

        setState(newState);

        if (onQuizUpdate && activeQuizSession) {
            // Update title with score
            const newTitle = activeQuizSession.title.split(' | ')[0] + ` | النتيجة: ${score}/${state.questions.length}`;

            onQuizUpdate({
                ...activeQuizSession,
                title: newTitle, // Save score in title for history visibility
                score,
                isFinished: true,
                userAnswers: state.userAnswers, // Ensure latest answers
                currentQuestionIndex: state.currentQuestionIndex,
                lastUpdated: Date.now()
            });
        }
    };

    const handleRestart = () => {
        // Clear active session to allow creating a new one
        if (onQuizUpdate) {
            onQuizUpdate(null);
        }
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

    return (
        <div className="h-full overflow-y-auto custom-scrollbar overscroll-y-contain p-2 sm:p-4">
            {error && (
                <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-center">
                    {error}
                </div>
            )}

            {!state.isActive && !state.isFinished && (
                <QuizSetup
                    files={files}
                    onStart={handleStartQuiz}
                    isLoading={isLoading}
                />
            )}

            {state.isFinished && (
                <QuizResults
                    questions={state.questions}
                    userAnswers={state.userAnswers}
                    score={state.score}
                    config={state.config}
                    onRestart={handleRestart}
                />
            )}

            {state.isActive && state.questions.length > 0 && (
                <QuizActive
                    question={state.questions[state.currentQuestionIndex]}
                    currentQuestionIndex={state.currentQuestionIndex}
                    totalQuestions={state.questions.length}
                    selectedAnswers={state.userAnswers[state.questions[state.currentQuestionIndex].id] || []}
                    quizType={state.config?.quizType || 'single'}
                    onSelectAnswer={handleSelectAnswer}
                    onNext={handleNext}
                    onFinish={handleFinish}
                />
            )}
        </div>
    );
};

export default QuizContainer;
