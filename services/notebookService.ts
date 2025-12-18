import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from './firebase';

export interface MindMapSession {
    id: string;
    title: string;
    markdown: string;
    timestamp: number;
    topic?: string;
    userId: string;
}

export const saveMindMapToFirestore = async (userId: string, session: MindMapSession) => {
    try {
        const userRef = doc(db, 'users', userId);
        const sessionRef = doc(collection(userRef, 'mindmaps'), session.id);
        await setDoc(sessionRef, session);
    } catch (error) {
        console.error('Error saving mind map:', error);
        throw error;
    }
};

export const loadMindMapsFromFirestore = async (userId: string): Promise<MindMapSession[]> => {
    try {
        const userRef = doc(db, 'users', userId);
        const q = query(collection(userRef, 'mindmaps'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => doc.data() as MindMapSession);
    } catch (error) {
        console.error('Error loading mind maps:', error);
        return [];
    }
};

export const deleteMindMapFromFirestore = async (userId: string, sessionId: string) => {
    try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(doc(collection(userRef, 'mindmaps'), sessionId));
    } catch (error) {
        console.error('Error deleting mind map:', error);
        throw error;
    }
};
