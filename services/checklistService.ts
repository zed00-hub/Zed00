import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ChecklistSession } from '../types';

export const saveChecklistToFirestore = async (userId: string, session: ChecklistSession): Promise<void> => {
    if (!userId) return;
    try {
        const docRef = doc(db, 'users', userId, 'checklists', session.id);
        await setDoc(docRef, {
            ...session,
            lastUpdated: Date.now()
        }, { merge: true });
        console.log('Checklist session saved:', session.id);
    } catch (error) {
        console.error('Error saving checklist session:', error);
    }
};

export const loadChecklistsFromFirestore = async (userId: string): Promise<ChecklistSession[]> => {
    if (!userId) return [];
    try {
        const checklistsRef = collection(db, 'users', userId, 'checklists');
        const q = query(checklistsRef); // Ordering usually handled client-side or add orderBy here if index exists
        const snapshot = await getDocs(q);

        const checklists: ChecklistSession[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data() as ChecklistSession;
            checklists.push({
                ...data,
                id: doc.id
            });
        });

        // Sort descending by lastUpdated or createdAt
        return checklists.sort((a, b) => {
            const timeA = a.lastUpdated || a.createdAt || 0;
            const timeB = b.lastUpdated || b.createdAt || 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error('Error loading checklists:', error);
        return [];
    }
};

export const deleteChecklistFromFirestore = async (userId: string, sessionId: string): Promise<void> => {
    if (!userId) return;
    try {
        await deleteDoc(doc(db, 'users', userId, 'checklists', sessionId));
        console.log('Checklist deleted:', sessionId);
    } catch (error) {
        console.error('Error deleting checklist:', error);
        throw error;
    }
};
