import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, Timestamp } from 'firebase/firestore';
import { ChatSession } from '../types';

export const saveSessionToFirestore = async (userId: string, session: ChatSession) => {
    if (!userId) {
        console.log("saveSessionToFirestore: No userId provided");
        return;
    }
    try {
        console.log("saveSessionToFirestore: Saving session", session.id, "for user", userId);
        const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
        await setDoc(sessionRef, {
            id: session.id,
            title: session.title,
            messages: session.messages,
            timestamp: session.timestamp,
            lastUpdated: Timestamp.now()
        }, { merge: true });
        console.log("saveSessionToFirestore: Session saved successfully");
    } catch (error) {
        console.error("Error saving session:", error);
    }
};

export const loadSessionsFromFirestore = async (userId: string): Promise<ChatSession[]> => {
    if (!userId) {
        console.log("loadSessionsFromFirestore: No userId provided");
        return [];
    }
    try {
        console.log("loadSessionsFromFirestore: Loading sessions for user:", userId);
        const sessionsRef = collection(db, 'users', userId, 'sessions');
        const q = query(sessionsRef);
        const querySnapshot = await getDocs(q);

        console.log("loadSessionsFromFirestore: Found", querySnapshot.size, "sessions");

        const sessions: ChatSession[] = [];
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            console.log("loadSessionsFromFirestore: Session data:", data.id, data.title);
            sessions.push({
                id: data.id || docSnapshot.id,
                title: data.title || 'محادثة',
                messages: data.messages || [],
                timestamp: data.timestamp || Date.now()
            } as ChatSession);
        });

        // Sort descending by timestamp
        const sorted = sessions.sort((a, b) => b.timestamp - a.timestamp);
        console.log("loadSessionsFromFirestore: Returning", sorted.length, "sessions");
        return sorted;
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
