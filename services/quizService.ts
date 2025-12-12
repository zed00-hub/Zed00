import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, Timestamp } from 'firebase/firestore';
import { QuizSession } from '../types';

export const saveQuizToFirestore = async (userId: string, quiz: QuizSession) => {
    if (!userId) {
        console.log("saveQuizToFirestore: No userId provided");
        return;
    }
    try {
        console.log("saveQuizToFirestore: Saving quiz", quiz.id, "for user", userId);

        const quizRef = doc(db, 'users', userId, 'quizzes', quiz.id);

        // Optimize quiz data to reduce Firestore document size
        const dataToSave = {
            id: quiz.id,
            title: quiz.title,
            createdAt: quiz.createdAt,
            score: quiz.score,
            isFinished: quiz.isFinished,
            currentQuestionIndex: quiz.currentQuestionIndex,
            userAnswers: quiz.userAnswers,
            lastUpdated: Timestamp.now(),
            // Save minimal config
            config: {
                sourceType: quiz.config.sourceType,
                subject: quiz.config.subject,
                difficulty: quiz.config.difficulty,
                questionCount: quiz.config.questionCount,
                quizType: quiz.config.quizType,
                // Only save file name, not content
                fileContext: quiz.config.fileContext ? {
                    id: quiz.config.fileContext.id,
                    name: quiz.config.fileContext.name,
                    type: quiz.config.fileContext.type,
                    size: quiz.config.fileContext.size
                } : undefined
            },
            // Save minimal question data (remove long explanations)
            questions: quiz.questions.map(q => ({
                id: q.id,
                question: q.question.substring(0, 500), // Limit question length
                options: q.options.map(opt => opt.substring(0, 200)), // Limit option length
                correctAnswers: q.correctAnswers
                // Skip explanation to save space
            }))
        };

        await setDoc(quizRef, dataToSave, { merge: true });
        console.log("saveQuizToFirestore: Quiz saved successfully");
    } catch (error: any) {
        console.error("Error saving quiz:", error);
        console.error("Error details:", error?.message, error?.code);
    }
};

export const loadQuizzesFromFirestore = async (userId: string): Promise<QuizSession[]> => {
    if (!userId) {
        console.log("loadQuizzesFromFirestore: No userId provided");
        return [];
    }
    try {
        console.log("loadQuizzesFromFirestore: Loading quizzes for user:", userId);
        const quizzesRef = collection(db, 'users', userId, 'quizzes');
        const q = query(quizzesRef);
        const querySnapshot = await getDocs(q);

        console.log("loadQuizzesFromFirestore: Found", querySnapshot.size, "quizzes");

        const quizzes: QuizSession[] = [];
        querySnapshot.forEach((docSnapshot) => {
            try {
                const data = docSnapshot.data();
                console.log("loadQuizzesFromFirestore: Processing quiz:", data.id, data.title);

                // Convert Firestore Timestamp to milliseconds if needed
                let lastUpdatedMs = data.lastUpdated;
                if (lastUpdatedMs && typeof lastUpdatedMs.toMillis === 'function') {
                    lastUpdatedMs = lastUpdatedMs.toMillis();
                } else if (lastUpdatedMs && lastUpdatedMs.seconds) {
                    lastUpdatedMs = lastUpdatedMs.seconds * 1000;
                }

                // Build quiz with proper defaults
                const quiz: QuizSession = {
                    id: data.id || docSnapshot.id,
                    title: data.title || 'اختبار',
                    createdAt: data.createdAt || Date.now(),
                    config: data.config || { sourceType: 'subject', difficulty: 'Medium', questionCount: 5, quizType: 'single' },
                    questions: data.questions || [],
                    userAnswers: data.userAnswers || {},
                    score: data.score || 0,
                    isFinished: data.isFinished || false,
                    currentQuestionIndex: data.currentQuestionIndex || 0,
                    lastUpdated: lastUpdatedMs
                };

                quizzes.push(quiz);
            } catch (parseError) {
                console.error("Error parsing quiz document:", docSnapshot.id, parseError);
            }
        });

        // Sort descending by lastUpdated or createdAt
        const sorted = quizzes.sort((a, b) => {
            const timeA = a.lastUpdated || a.createdAt || 0;
            const timeB = b.lastUpdated || b.createdAt || 0;
            return timeB - timeA;
        });

        console.log("loadQuizzesFromFirestore: Returning", sorted.length, "quizzes");
        return sorted;
    } catch (error) {
        console.error("Error loading quizzes:", error);
        return [];
    }
};

export const deleteQuizFromFirestore = async (userId: string, quizId: string) => {
    if (!userId) return;
    try {
        await deleteDoc(doc(db, 'users', userId, 'quizzes', quizId));
    } catch (error) {
        console.error("Error deleting quiz:", error);
    }
};
