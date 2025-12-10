import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { ChatSession } from '../types';

export const saveSessionToFirestore = async (userId: string, session: ChatSession) => {
    if (!userId) return;
    try {
        const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
        await setDoc(sessionRef, {
            ...session,
            lastUpdated: Timestamp.now()
        }, { merge: true });
    } catch (error) {
        console.error("Error saving session:", error);
    }
};

export const loadSessionsFromFirestore = async (userId: string): Promise<ChatSession[]> => {
    if (!userId) return [];
    try {
        const sessionsRef = collection(db, 'users', userId, 'sessions');
        const q = query(sessionsRef, orderBy('timestamp', 'desc')); // Assuming timestamp is numeric or convertible
        const querySnapshot = await getDocs(q);

        const sessions: ChatSession[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            sessions.push({
                id: data.id,
                title: data.title,
                messages: data.messages || [],
                timestamp: data.timestamp
            } as ChatSession);
        });
        return sessions;
    } catch (error) {
        console.error("Error loading sessions:", error);
        return [];
    }
};

export const deleteSessionFromFirestore = async (userId: string, sessionId: string) => {
    if (!userId) return;
    try {
        await deleteDoc(doc(db, 'users', userId, 'sessions', sessionId));
    } catch (error) {
        console.error("Error deleting session:", error);
    }
};
