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

        // Remove file content from config to save space if it's large (optional, but good practice)
        // For now, we keep it simple. If data becomes an issue, we can strip data URI.
        const dataToSave = {
            ...quiz,
            lastUpdated: Timestamp.now()
        };

        if (dataToSave.config.fileContext && dataToSave.config.fileContext.data) {
            // Don't save large base64 data to Firestore
            // Instead, we might want to just save the metadata
            dataToSave.config.fileContext = {
                ...dataToSave.config.fileContext,
                data: undefined
            };
        }

        await setDoc(quizRef, dataToSave, { merge: true });
        console.log("saveQuizToFirestore: Quiz saved successfully");
    } catch (error: any) {
        console.error("Error saving quiz:", error);
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
            const data = docSnapshot.data();
            quizzes.push({
                ...data,
                id: data.id || docSnapshot.id,
            } as QuizSession);
        });

        // Sort descending by createdAt
        const sorted = quizzes.sort((a, b) => b.createdAt - a.createdAt);
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
