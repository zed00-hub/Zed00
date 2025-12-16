
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, query, where, orderBy, addDoc, Timestamp } from 'firebase/firestore';

export interface MessageReply {
    id: string;
    content: string;
    createdAt: number;
    sender: 'student' | 'admin';
    senderName?: string;
}

export interface AdminMessage {
    id: string;
    type: 'admin_message';
    content: string;
    createdAt: number;
    read: boolean;
    sender: 'admin';
    replies?: MessageReply[];
    studentId?: string;
    studentName?: string;
}

/**
 * Send a message from admin to a specific user
 */
export const sendAdminMessage = async (userId: string, content: string, studentName?: string) => {
    try {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const newDocRef = doc(notificationsRef);

        const message: AdminMessage = {
            id: newDocRef.id,
            type: 'admin_message',
            content,
            createdAt: Date.now(),
            read: false,
            sender: 'admin',
            replies: [],
            studentId: userId,
            studentName: studentName || null
        };

        await setDoc(newDocRef, message);
        return newDocRef.id;
    } catch (error) {
        console.error('Error sending admin message:', error);
        throw error;
    }
};

/**
 * Get ALL messages for a user (not just unread)
 */
export const getAllAdminMessages = async (userId: string): Promise<AdminMessage[]> => {
    try {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const q = query(
            notificationsRef,
            where('type', '==', 'admin_message'),
            orderBy('createdAt', 'desc')
        );

        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as AdminMessage);
    } catch (error) {
        console.error('Error getting messages:', error);
        return [];
    }
};

/**
 * Get unread messages count for a user
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
    try {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const q = query(
            notificationsRef,
            where('read', '==', false),
            where('type', '==', 'admin_message')
        );

        const snap = await getDocs(q);
        return snap.docs.length;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = async (userId: string, messageId: string) => {
    try {
        const docRef = doc(db, 'users', userId, 'notifications', messageId);
        await updateDoc(docRef, { read: true });
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
};

/**
 * Reply to an admin message (from student)
 */
export const replyToMessage = async (userId: string, messageId: string, content: string, senderName?: string) => {
    try {
        const docRef = doc(db, 'users', userId, 'notifications', messageId);

        // Get current message to append reply
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const q = query(notificationsRef, where('id', '==', messageId));
        const snap = await getDocs(q);

        if (snap.empty) {
            throw new Error('Message not found');
        }

        const currentMessage = snap.docs[0].data() as AdminMessage;
        const currentReplies = currentMessage.replies || [];

        const newReply: MessageReply = {
            id: Date.now().toString(),
            content,
            createdAt: Date.now(),
            sender: 'student',
            senderName: senderName
        };

        await updateDoc(docRef, {
            replies: [...currentReplies, newReply],
            read: true // Mark as read when student replies
        });

        return newReply.id;
    } catch (error) {
        console.error('Error replying to message:', error);
        throw error;
    }
};

/**
 * Get all messages with replies for admin view (across all users)
 */
export const getAllMessagesForAdmin = async (): Promise<AdminMessage[]> => {
    try {
        // This requires a collection group query on 'notifications'
        // First, let's get all users who have notifications
        // This is a simplified approach - in production you'd use collectionGroup
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);

        const allMessages: AdminMessage[] = [];

        for (const userDoc of usersSnap.docs) {
            const notificationsRef = collection(db, 'users', userDoc.id, 'notifications');
            const q = query(
                notificationsRef,
                where('type', '==', 'admin_message'),
                orderBy('createdAt', 'desc')
            );

            try {
                const notifSnap = await getDocs(q);
                for (const notifDoc of notifSnap.docs) {
                    const msg = notifDoc.data() as AdminMessage;
                    // Only include messages that have replies
                    if (msg.replies && msg.replies.length > 0) {
                        allMessages.push({
                            ...msg,
                            studentId: userDoc.id,
                            studentName: (userDoc.data() as any).displayName || userDoc.id
                        });
                    }
                }
            } catch (e) {
                // Skip users with permission issues
            }
        }

        // Sort by latest reply or message creation
        allMessages.sort((a, b) => {
            const aLatest = a.replies?.length ? a.replies[a.replies.length - 1].createdAt : a.createdAt;
            const bLatest = b.replies?.length ? b.replies[b.replies.length - 1].createdAt : b.createdAt;
            return bLatest - aLatest;
        });

        return allMessages;
    } catch (error) {
        console.error('Error getting all messages for admin:', error);
        return [];
    }
};
