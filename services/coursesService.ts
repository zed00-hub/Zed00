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

// Admin emails - full access
export const ADMIN_EMAILS = [
    'ziadgaid.ergo@gmail.com',
];

// Supervisor emails - limited access (Courses + Knowledge only)
export const SUPERVISOR_EMAILS = [
    'abdderrahim7676@gmail.com',
];

export const isAdmin = (email: string | undefined): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
};

export const isSupervisor = (email: string | undefined): boolean => {
    if (!email) return false;
    return SUPERVISOR_EMAILS.includes(email.toLowerCase());
};

export const hasAdminPanelAccess = (email: string | undefined): boolean => {
    return isAdmin(email) || isSupervisor(email);
};

// Course categories for organization
export const COURSE_CATEGORIES = [
    { id: 'general_info', label: 'Informations Générales', labelAr: 'معلومات عامة' },
    { id: 'specialties', label: 'Spécialités Paramédicales', labelAr: 'التخصصات شبه الطبية' },
    { id: 'laws', label: 'Lois et Règlements', labelAr: 'القوانين والأنظمة' },
    { id: 'anatomy', label: 'Anatomie-Physiologie', labelAr: 'التشريح والفيزيولوجيا' },
    { id: 'terminology', label: 'Terminologie Médicale', labelAr: 'المصطلحات الطبية' },
    { id: 'legislation', label: 'Législation / Textes Juridiques', labelAr: 'التشريع والنصوص القانونية' },
    { id: 'psychology', label: 'Psychologie', labelAr: 'علم النفس' },
    { id: 'public_health', label: 'Santé Publique', labelAr: 'الصحة العامة' },
    { id: 'nutrition', label: 'Nutrition', labelAr: 'التغذية' },
    { id: 'other', label: 'Autre', labelAr: 'أخرى' },
];

// Extended FileContext with category
export interface CourseFile {
    id: string;
    name: string;
    type: string;
    content: string;
    size: number;
    category?: string;
    createdAt?: number;
}

// Save a course to shared database
export const saveCourseToFirestore = async (course: CourseFile): Promise<void> => {
    try {
        const docRef = doc(db, COURSES_COLLECTION, course.id);
        await setDoc(docRef, {
            id: course.id,
            name: course.name,
            type: course.type,
            content: course.content || '',
            size: course.size,
            category: course.category || 'other',
            createdAt: course.createdAt || Date.now()
        });
        console.log('Course saved:', course.name);
    } catch (error) {
        console.error('Error saving course:', error);
        throw error;
    }
};

// Load all shared courses
export const loadCoursesFromFirestore = async (): Promise<CourseFile[]> => {
    try {
        const q = query(collection(db, COURSES_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const courses: CourseFile[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            courses.push({
                id: data.id,
                name: data.name,
                type: data.type || 'text/plain',
                content: data.content || '',
                size: data.size || 0,
                category: data.category || 'other',
                createdAt: data.createdAt
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
export const updateCourseInFirestore = async (course: CourseFile): Promise<void> => {
    return saveCourseToFirestore(course);
};
