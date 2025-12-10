import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, Timestamp } from 'firebase/firestore';
import { ChatSession } from '../types';

export const saveSessionToFirestore = async (userId: string, session: ChatSession) => {
    if (!userId) {
        console.log("saveSessionToFirestore: No userId provided");
        return;
    }
    try {
        console.log("saveSessionToFirestore: Saving session", session.id, "for user", userId, "with", session.messages.length, "messages");

        // Sanitize messages - remove large base64 attachments that may exceed Firestore limits
        const sanitizedMessages = session.messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            isError: msg.isError || false,
            // Don't save large base64 image data - only save that it had attachments
            hasAttachments: msg.attachments && msg.attachments.length > 0 ? true : false
        }));

        const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
        const dataToSave = {
            id: session.id,
            title: session.title,
            messages: sanitizedMessages,
            timestamp: session.timestamp,
            lastUpdated: Timestamp.now()
        };

        console.log("saveSessionToFirestore: Data to save:", JSON.stringify(dataToSave).substring(0, 200) + "...");

        await setDoc(sessionRef, dataToSave, { merge: true });
        console.log("saveSessionToFirestore: Session saved successfully");
    } catch (error: any) {
        console.error("Error saving session:", error);
        console.error("Error details:", error?.message, error?.code);
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
