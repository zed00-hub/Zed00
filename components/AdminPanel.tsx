import React, { useState, useEffect } from 'react';
import {
    saveCourseToFirestore,
    loadCoursesFromFirestore,
    deleteCourseFromFirestore,
    isAdmin,
    COURSE_CATEGORIES,
    CourseFile
} from '../services/coursesService';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Trash2, Edit2, Save, FileText, Upload, BookOpen, AlertCircle, Check, FileUp, Loader2 } from 'lucide-react';
import { extractTextFromPDF } from '../utils/pdfUtils';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onCoursesUpdated: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onCoursesUpdated }) => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<CourseFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<CourseFile | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [isExtractingPDF, setIsExtractingPDF] = useState(false);

    // Form state
    const [courseName, setCourseName] = useState('');
    const [courseContent, setCourseContent] = useState('');
    const [courseCategory, setCourseCategory] = useState('other');

    // Load courses on mount
    useEffect(() => {
        if (isOpen) {
            loadCourses();
        }
    }, [isOpen]);

    const loadCourses = async () => {
        setIsLoading(true);
        try {
            const loaded = await loadCoursesFromFirestore();
            setCourses(loaded);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setCourseName('');
        setCourseContent('');
        setCourseCategory('other');
        setShowAddForm(false);
        setEditingCourse(null);
        setSaveStatus('idle');
    };

    const handleSaveCourse = async () => {
        if (!courseName.trim() || !courseContent.trim()) return;

        setSaveStatus('saving');
        try {
            const newCourse: CourseFile = {
                id: editingCourse?.id || `course-${Date.now()}`,
                name: courseName.trim(),
                type: 'text/plain',
                content: courseContent.trim(),
                size: new Blob([courseContent]).size,
                category: courseCategory,
                createdAt: editingCourse?.createdAt || Date.now()
            };

            await saveCourseToFirestore(newCourse);
            setSaveStatus('success');

            setTimeout(() => {
                resetForm();
                loadCourses();
                onCoursesUpdated();
            }, 1000);

        } catch (error) {
            console.error('Error saving course:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المادة؟')) return;

        try {
            await deleteCourseFromFirestore(courseId);
            loadCourses();
            onCoursesUpdated();
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    };

    const handleEditCourse = (course: CourseFile) => {
        setEditingCourse(course);
        setCourseName(course.name);
        setCourseContent(course.content || '');
        setCourseCategory(course.category || 'other');
        setShowAddForm(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        try {
            if (isPDF) {
                setIsExtractingPDF(true);
                setShowAddForm(true);
                setCourseName(file.name.replace(/\.pdf$/i, ''));
                setCourseContent('جاري استخراج النص من ملف PDF...');

                const text = await extractTextFromPDF(file);
                setCourseContent(text);
                setIsExtractingPDF(false);
            } else {
                // Text file
                const text = await file.text();
                setCourseName(file.name.replace(/\.[^/.]+$/, ''));
                setCourseContent(text);
                setShowAddForm(true);
            }
        } catch (error: any) {
            console.error('Error reading file:', error);
            alert(error.message || 'فشل قراءة الملف');
            setIsExtractingPDF(false);
            setCourseContent('');
        }

        // Reset input
        e.target.value = '';
    };

    const getCategoryLabel = (categoryId: string) => {
        const cat = COURSE_CATEGORIES.find(c => c.id === categoryId);
        return cat?.labelAr || 'أخرى';
    };

    if (!isOpen) return null;

    // Check if user is admin
    if (!isAdmin(user?.email)) {
        return (
            <>
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-dark-surface rounded-3xl shadow-2xl z-50 p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">غير مصرح</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">ليس لديك صلاحية الوصول لهذه الصفحة.</p>
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl">
                        إغلاق
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

            {/* Panel */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-4xl max-h-[90vh] bg-white dark:bg-dark-surface rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/20 dark:to-dark-surface shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                            <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">لوحة إدارة المواد</h2>
                            <p className="text-xs text-gray-500">إضافة وتعديل المواد الدراسية</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {showAddForm ? (
                        /* Add/Edit Form */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200">
                                    {editingCourse ? 'تعديل المادة' : 'إضافة مادة جديدة'}
                                </h3>
                                <button
                                    onClick={resetForm}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    إلغاء
                                </button>
                            </div>

                            {/* Course Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    📝 اسم المادة / الدرس
                                </label>
                                <input
                                    type="text"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    placeholder="مثال: الجريدة الرسمية للتخصصات الشبه طبية"
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-bg text-gray-800 dark:text-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                />
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    📂 تصنيف المادة
                                </label>
                                <select
                                    value={courseCategory}
                                    onChange={(e) => setCourseCategory(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-bg text-gray-800 dark:text-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                >
                                    {COURSE_CATEGORIES.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.labelAr} - {cat.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    يساعد التصنيف البوت في العثور على المعلومات المناسبة
                                </p>
                            </div>

                            {/* Course Content */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    📄 محتوى الدرس
                                </label>
                                <div className="relative">
                                    <textarea
                                        value={courseContent}
                                        onChange={(e) => setCourseContent(e.target.value)}
                                        placeholder="الصق محتوى الدرس هنا أو ارفع ملف PDF..."
                                        rows={12}
                                        disabled={isExtractingPDF}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-bg text-gray-800 dark:text-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none font-mono text-sm disabled:opacity-50"
                                    />
                                    {isExtractingPDF && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-dark-bg/80 rounded-xl">
                                            <div className="flex items-center gap-3 text-amber-600">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span className="font-medium">جاري استخراج النص من PDF...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {courseContent.length.toLocaleString()} حرف | {(new Blob([courseContent]).size / 1024).toFixed(1)} KB
                                </p>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSaveCourse}
                                disabled={!courseName.trim() || !courseContent.trim() || saveStatus === 'saving' || isExtractingPDF}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${saveStatus === 'success'
                                        ? 'bg-green-500 text-white'
                                        : saveStatus === 'error'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white disabled:bg-gray-300 disabled:text-gray-500'
                                    }`}
                            >
                                {saveStatus === 'saving' && <Loader2 size={20} className="animate-spin" />}
                                {saveStatus === 'success' && <Check size={20} />}
                                {saveStatus === 'idle' && <Save size={20} />}
                                {saveStatus === 'saving' ? 'جاري الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : saveStatus === 'error' ? 'حدث خطأ!' : 'حفظ المادة'}
                            </button>
                        </div>
                    ) : (
                        /* Courses List */
                        <div className="space-y-4">
                            {/* Actions Bar */}
                            <div className="flex gap-3 flex-wrap">
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all"
                                >
                                    <Plus size={18} />
                                    <span>إضافة مادة جديدة</span>
                                </button>

                                <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all cursor-pointer">
                                    <Upload size={18} />
                                    <span>رفع ملف نصي</span>
                                    <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                                </label>

                                <label className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-medium transition-all cursor-pointer border border-red-200 dark:border-red-800">
                                    <FileUp size={18} />
                                    <span>رفع ملف PDF</span>
                                    <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </div>

                            {/* Courses Grid */}
                            {isLoading ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-amber-500" />
                                    <p>جاري تحميل المواد...</p>
                                </div>
                            ) : courses.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="font-medium">لا توجد مواد مضافة بعد</p>
                                    <p className="text-sm">اضغط على "إضافة مادة جديدة" أو ارفع ملف PDF</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {courses.map((course) => (
                                        <div
                                            key={course.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                                                    <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{course.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                                                            {getCategoryLabel(course.category || 'other')}
                                                        </span>
                                                        <span>{(course.content?.length || 0).toLocaleString()} حرف</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => handleEditCourse(course)}
                                                    className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                                                    title="تعديل"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCourse(course.id)}
                                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center text-xs text-gray-500 shrink-0">
                    👑 أنت مسؤول | المواد المضافة ستظهر لجميع الطلاب ويستخدمها البوت في إجاباته
                </div>
            </div>
        </>
    );
};

export default AdminPanel;
