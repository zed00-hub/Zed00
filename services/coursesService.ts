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
    // Main Subjects
    { id: 'anatomie_general', label: 'Anatomie-Physiologie (Général)', labelAr: 'التشريح (عام)' },
    { id: 'terminologie', label: 'Terminologie Médicale', labelAr: 'المصطلحات الطبية' },
    { id: 'hygiene', label: 'Hygiène Hospitalière', labelAr: 'النظافة الاستشفائية' },
    { id: 'sante_publique', label: 'Santé Publique', labelAr: 'الصحة العامة' },
    { id: 'secourisme', label: 'Secourisme', labelAr: 'الإسعافات الأولية' },
    { id: 'psychologie', label: 'Psychologie/Anthropologie', labelAr: 'علم النفس / الأنثروبولوجيا' },
    { id: 'legislation', label: 'Législation/Éthique', labelAr: 'التشريع / الأخلاقيات' },
    { id: 'fondements', label: 'Fondements Profession', labelAr: 'أسس المهنة' },
    { id: 'expression', label: 'Expression Écrite/Orale', labelAr: 'التعبير الكتابي / الشفهي' },

    // Anatomy Sections
    { id: 'cyto_physio', label: 'Cytologie (Anatomie et physiologie)', labelAr: 'علم الخلية' },
    { id: 'embryologie', label: 'Embryologie', labelAr: 'علم الأجنة' },
    { id: 'genetique', label: 'Conseil génétique', labelAr: 'الاستشارة الوراثية' },
    { id: 'tissus', label: 'Les principaux tissus', labelAr: 'الأنسجة الرئيسية' },
    { id: 'musculaire', label: 'Système musculaire', labelAr: 'الجهاز العضلي' },
    { id: 'osseux', label: 'Système osseux', labelAr: 'الجهاز العظمي' },
    { id: 'articulaire', label: 'Système articulaire', labelAr: 'الجهاز المفصلي' },
    { id: 'cellule_nerveuse', label: 'La cellule nerveuse', labelAr: 'الخلية العصبية' },
    { id: 'snc', label: 'Système nerveux central', labelAr: 'الجهاز العصبي المركزي' },
    { id: 'cerebral', label: 'Système nerveux cérébral', labelAr: 'الجهاز العصبي الدماغي' },
    { id: 'respiratoire', label: 'Système respiratoire', labelAr: 'الجهاز التنفسي' },
    { id: 'cardio', label: 'Système cardio-vasculaire', labelAr: 'الجهاز القلبي الوعائي' },
    { id: 'endocrines', label: 'Les glandes endocrines', labelAr: 'الغدد الصماء' },
    { id: 'digestif', label: 'Appareil digestif', labelAr: 'الجهاز الهضمي' },
    { id: 'genito_urinaire', label: 'Appareil génito-urinaire', labelAr: 'الجهاز التناسلي البولي' },

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
