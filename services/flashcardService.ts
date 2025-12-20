import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, Timestamp } from 'firebase/firestore';

export interface Flashcard {
    id: string;
    front: string;
    back: string;
    explanation?: string;
}

export interface FlashcardConfig {
    sourceType: 'subject' | 'file';
    subject?: string;
    fileContext?: {
        id: string;
        name: string;
        type: string;
        size: number;
    };
    count: number;
    customization?: string;
    theme?: string;
}

export interface FlashcardSession {
    id: string;
    title: string;
    createdAt: number;
    lastUpdated: number;
    cards: Flashcard[];
    config: FlashcardConfig;
    userId?: string;
}

const sanitizeData = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    } else if (data !== null && typeof data === 'object') {
        const newObj: any = {};
        for (const key in data) {
            const value = data[key];
            if (value !== undefined) {
                newObj[key] = sanitizeData(value);
            }
        }
        return newObj;
    }
    return data;
};

export const saveFlashcardToFirestore = async (userId: string, session: FlashcardSession) => {
    if (!userId) return;
    try {
        const docRef = doc(db, 'users', userId, 'flashcards', session.id);
        const dataToSave = sanitizeData({
            ...session,
            lastUpdated: Date.now()
        });
        await setDoc(docRef, dataToSave, { merge: true });
        console.log("Flashcard session saved:", session.id);
    } catch (error) {
        console.error("Error saving flashcard session:", error);
    }
};

export const loadFlashcardsFromFirestore = async (userId: string): Promise<FlashcardSession[]> => {
    if (!userId) return [];
    try {
        const flashcardsRef = collection(db, 'users', userId, 'flashcards');
        const q = query(flashcardsRef);
        const snapshot = await getDocs(q);

        const sessions: FlashcardSession[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            sessions.push({
                ...data,
                id: docSnap.id
            } as FlashcardSession);
        });

        return sessions.sort((a, b) => (b.lastUpdated || b.createdAt) - (a.lastUpdated || a.createdAt));
    } catch (error) {
        console.error("Error loading flashcard sessions:", error);
        return [];
    }
};

export const deleteFlashcardFromFirestore = async (userId: string, sessionId: string) => {
    if (!userId) return;
    try {
        await deleteDoc(doc(db, 'users', userId, 'flashcards', sessionId));
    } catch (error) {
        console.error("Error deleting flashcard session:", error);
    }
};
