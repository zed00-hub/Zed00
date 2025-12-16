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
    orderBy,
    collectionGroup,
    where
} from 'firebase/firestore';
import { User } from '../types';

export interface UserStats extends User {
    totalTimeSpent: number; // in minutes
    conversationsCount: number;
    quizzesCount: number;
    checklistsCount?: number;
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
 * Increment checklist count
 */
export const trackNewChecklist = async (userId: string) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            checklistsCount: increment(1)
        });
    } catch (error) {
        console.warn('Failed to track checklist:', error);
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

// Admins list - should match what is in coursesService but for now hardcoded or passed in
const ADMIN_EMAILS = ['admin@parabot.dz', 'admin@zed00.web.app', 'boudiaf.bilal@etu.univ-batna2.dz']; // Keep in sync

/**
 * Fetch all users for admin analytics, excluding admins
 */
export const getAllUsersStats = async (): Promise<UserStats[]> => {
    try {
        const usersRef = collection(db, 'users');
        // Fetch all documents directly without complex queries to avoid index issues
        const snapshot = await getDocs(usersRef);

        const users = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            } as UserStats))
            .filter(u => !ADMIN_EMAILS.includes(u.email)); // Exclude admins

        // Sort client-side default (but can be re-sorted by UI)
        return users.sort((a, b) => (b.totalTimeSpent || 0) - (a.totalTimeSpent || 0));

    } catch (error) {
        console.error('Error fetching user stats:', error);
        return [];
    }
};

/**
 * Get stats for a specific date range using Collection Group Queries
 * Requires Firestore Indices on 'sessions' and 'quizzes' collection groups for 'timestamp' and 'createdAt' fields
 */
export const getStatsForDateRange = async (startDate: Date, endDate: Date): Promise<Record<string, { conversations: number, quizzes: number, checklists: number }>> => {
    try {
        // Convert dates to timestamps (milliseconds) as that's how we store them
        const startMs = startDate.getTime();
        const endMs = endDate.getTime();

        console.log(`Getting stats from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // 1. Query Chat Sessions (collection group 'sessions')
        // Note: Field is 'timestamp' in chatService
        // We use db.collectionGroup to query across all users
        // This requires an index in Firestore: Collection ID 'sessions', Field 'timestamp' Asc/Desc
        const sessionsQuery = query(
            collectionGroup(db, 'sessions'),
            where('timestamp', '>=', startMs),
            where('timestamp', '<=', endMs)
        );

        // 2. Query Quizzes (collection group 'quizzes')
        // Note: Field is 'createdAt' in quizService
        // This requires an index in Firestore: Collection ID 'quizzes', Field 'createdAt' Asc/Desc
        const quizzesQuery = query(
            collectionGroup(db, 'quizzes'),
            where('createdAt', '>=', startMs),
            where('createdAt', '<=', endMs)
        );

        // 3. Query Checklists (collection group 'checklists')
        const checklistsQuery = query(
            collectionGroup(db, 'checklists'),
            where('createdAt', '>=', startMs),
            where('createdAt', '<=', endMs)
        );

        const [sessionsSnap, quizzesSnap, checklistsSnap] = await Promise.all([
            getDocs(sessionsQuery),
            getDocs(quizzesQuery),
            getDocs(checklistsQuery)
        ]);

        const statsMap: Record<string, { conversations: number, quizzes: number, checklists: number }> = {};

        // Process Sessions
        sessionsSnap.forEach(doc => {
            // parent is 'sessions', parent.parent is 'users/{userId}'
            // ref.parent.parent.id gives userId
            const userId = doc.ref.parent.parent?.id;
            if (userId) {
                if (!statsMap[userId]) statsMap[userId] = { conversations: 0, quizzes: 0, checklists: 0 };
                statsMap[userId].conversations++;
            }
        });

        // Process Quizzes
        quizzesSnap.forEach(doc => {
            const userId = doc.ref.parent.parent?.id;
            if (userId) {
                if (!statsMap[userId]) statsMap[userId] = { conversations: 0, quizzes: 0, checklists: 0 };
                statsMap[userId].quizzes++;
            }
        });

        // Process Checklists
        checklistsSnap.forEach(doc => {
            const userId = doc.ref.parent.parent?.id;
            if (userId) {
                if (!statsMap[userId]) statsMap[userId] = { conversations: 0, quizzes: 0, checklists: 0 };
                statsMap[userId].checklists++;
            }
        });

        console.log(`Found ${sessionsSnap.size} sessions, ${quizzesSnap.size} quizzes, and ${checklistsSnap.size} checklists in range.`);
        return statsMap;

    } catch (error) {
        console.error("Error fetching stats for date range:", error);
        // Fallback: return empty stats so UI doesn't crash
        // Warning: This usually fails if indexes are missing.
        return {};
    }
};
