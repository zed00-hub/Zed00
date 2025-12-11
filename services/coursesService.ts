import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy
} from 'firebase/firestore';
import { FileContext } from '../types';

const COURSES_COLLECTION = 'shared_courses';

// Admin emails - only these users can add/edit courses
export const ADMIN_EMAILS = [
    'ziadgaid.ergo@gmail.com',
];

export const isAdmin = (email: string | undefined): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
};

// Save a course to shared database
export const saveCourseToFirestore = async (course: FileContext): Promise<void> => {
    try {
        const docRef = doc(db, COURSES_COLLECTION, course.id);
        await setDoc(docRef, {
            id: course.id,
            name: course.name,
            type: course.type,
            content: course.content || '',
            size: course.size,
            createdAt: Date.now()
        });
        console.log('Course saved:', course.name);
    } catch (error) {
        console.error('Error saving course:', error);
        throw error;
    }
};

// Load all shared courses
export const loadCoursesFromFirestore = async (): Promise<FileContext[]> => {
    try {
        const q = query(collection(db, COURSES_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const courses: FileContext[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            courses.push({
                id: data.id,
                name: data.name,
                type: data.type || 'text/plain',
                content: data.content,
                size: data.size || 0
            });
        });

        console.log('Loaded courses from Firestore:', courses.length);
        return courses;
    } catch (error) {
        console.error('Error loading courses:', error);
        return [];
    }
};

// Delete a course
export const deleteCourseFromFirestore = async (courseId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COURSES_COLLECTION, courseId));
        console.log('Course deleted:', courseId);
    } catch (error) {
        console.error('Error deleting course:', error);
        throw error;
    }
};

// Update a course
export const updateCourseInFirestore = async (course: FileContext): Promise<void> => {
    return saveCourseToFirestore(course);
};
