
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';

export interface AdminMessage {
  id: string;
  type: 'admin_message';
  content: string;
  createdAt: number;
  read: boolean;
  sender: 'admin';
}

/**
 * Send a message from admin to a specific user
 */
export const sendAdminMessage = async (userId: string, content: string) => {
  try {
    // We store messages in a 'notifications' subcollection for the user
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const newDocRef = doc(notificationsRef);
    
    const message: AdminMessage = {
      id: newDocRef.id,
      type: 'admin_message',
      content,
      createdAt: Date.now(),
      read: false,
      sender: 'admin'
    };
    
    await setDoc(newDocRef, message);
    return newDocRef.id;
  } catch (error) {
    console.error('Error sending admin message:', error);
    throw error;
  }
};

/**
 * Get unread messages for a user
 */
export const getUnreadAdminMessages = async (userId: string): Promise<AdminMessage[]> => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(
      notificationsRef,
      where('read', '==', false),
      where('type', '==', 'admin_message'),
      orderBy('createdAt', 'desc')
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AdminMessage);
  } catch (error) {
    console.error('Error getting unread messages:', error);
    return [];
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
