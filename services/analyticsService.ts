import { db } from './firebase';
import {
    doc,
    setDoc,
    updateDoc,
    increment,
    serverTimestamp,
    collection,
    getDocs,
    getDoc,
    query,
    orderBy
} from 'firebase/firestore';
import { User } from '../types';

export interface UserStats extends User {
    totalTimeSpent: number; // in minutes
    conversationsCount: number;
    quizzesCount: number;
    lastActive: any; // Timestamp
    createdAt: any; // Timestamp
}

/**
 * Sync user profile to Firestore for analytics
 */
export const syncUserProfile = async (user: User) => {
    try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // New user
            await setDoc(userRef, {
                ...user,
                totalTimeSpent: 0,
                conversationsCount: 0,
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp()
            });
        } else {
            // Existing user - just update basic info and last active
            await updateDoc(userRef, {
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                lastActive: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error syncing user profile:', error);
    }
};

/**
 * Increment time spent by 1 minute
 */
export const trackTimeSpent = async (userId: string) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            totalTimeSpent: increment(1),
            lastActive: serverTimestamp()
        });
    } catch (error) {
        // Silent fail to not disturb UX
        console.warn('Failed to track time:', error);
    }
};

/**
 * Increment conversation count
 */
export const trackNewConversation = async (userId: string) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            conversationsCount: increment(1)
        });
    } catch (error) {
        console.warn('Failed to track conversation:', error);
    }
};

/**
 * Increment quiz count
 */
export const trackNewQuiz = async (userId: string) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            quizzesCount: increment(1)
        });
    } catch (error) {
        console.warn('Failed to track quiz:', error);
    }
};

/**
 * Calculate level based on time spent
 */
export const getUserLevel = (minutes: number) => {
    if (minutes < 60) return { label: 'طالب جديد', color: 'bg-gray-100 text-gray-600' };
    if (minutes < 300) return { label: 'طالب مجتهد', color: 'bg-blue-100 text-blue-600' };
    if (minutes < 1000) return { label: 'خبير بارابوت', color: 'bg-amber-100 text-amber-600' };
    return { label: 'أسطورة طبية', color: 'bg-purple-100 text-purple-600' };
};

/**
 * Fetch all users for admin analytics
 */
export const getAllUsersStats = async (): Promise<UserStats[]> => {
    try {
        const usersRef = collection(db, 'users');
        // Fetch all documents directly without complex queries to avoid index issues
        const snapshot = await getDocs(usersRef);

        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as UserStats));

        // Sort client-side
        return users.sort((a, b) => (b.totalTimeSpent || 0) - (a.totalTimeSpent || 0));

    } catch (error) {
        console.error('Error fetching user stats:', error);
        return [];
    }
};
