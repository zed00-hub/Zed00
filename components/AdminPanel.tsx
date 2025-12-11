import React, { useState, useEffect } from 'react';
import { FileContext } from '../types';
import {
    saveCourseToFirestore,
    loadCoursesFromFirestore,
    deleteCourseFromFirestore,
    isAdmin
} from '../services/coursesService';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus, Trash2, Edit2, Save, FileText, Upload, BookOpen, AlertCircle, Check } from 'lucide-react';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onCoursesUpdated: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onCoursesUpdated }) => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<FileContext[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<FileContext | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Form state
    const [courseName, setCourseName] = useState('');
    const [courseContent, setCourseContent] = useState('');

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

    const handleSaveCourse = async () => {
        if (!courseName.trim() || !courseContent.trim()) return;

        setSaveStatus('saving');
        try {
            const newCourse: FileContext = {
                id: editingCourse?.id || `course-${Date.now()}`,
                name: courseName.trim(),
                type: 'text/plain',
                content: courseContent.trim(),
                size: new Blob([courseContent]).size
            };

            await saveCourseToFirestore(newCourse);
            setSaveStatus('success');

            // Reset form
            setTimeout(() => {
                setCourseName('');
                setCourseContent('');
                setShowAddForm(false);
                setEditingCourse(null);
                setSaveStatus('idle');
                loadCourses();
                onCoursesUpdated();
            }, 1000);

        } catch (error) {
            console.error('Error saving course:', error);
            setSaveStatus('error');
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

    const handleEditCourse = (course: FileContext) => {
        setEditingCourse(course);
        setCourseName(course.name);
        setCourseContent(course.content || '');
        setShowAddForm(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            setCourseName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
            setCourseContent(text);
            setShowAddForm(true);
        } catch (error) {
            console.error('Error reading file:', error);
            alert('فشل قراءة الملف');
        }
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
                                    onClick={() => { setShowAddForm(false); setEditingCourse(null); setCourseName(''); setCourseContent(''); }}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    إلغاء
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    اسم المادة / الدرس
                                </label>
                                <input
                                    type="text"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    placeholder="مثال: الفصل الأول - الخلية"
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-bg text-gray-800 dark:text-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    محتوى الدرس
                                </label>
                                <textarea
                                    value={courseContent}
                                    onChange={(e) => setCourseContent(e.target.value)}
                                    placeholder="الصق محتوى الدرس هنا..."
                                    rows={12}
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-bg text-gray-800 dark:text-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {courseContent.length} حرف | {new Blob([courseContent]).size} bytes
                                </p>
                            </div>

                            <button
                                onClick={handleSaveCourse}
                                disabled={!courseName.trim() || !courseContent.trim() || saveStatus === 'saving'}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${saveStatus === 'success'
                                        ? 'bg-green-500 text-white'
                                        : saveStatus === 'error'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white disabled:bg-gray-300 disabled:text-gray-500'
                                    }`}
                            >
                                {saveStatus === 'saving' && <span className="animate-spin">⏳</span>}
                                {saveStatus === 'success' && <Check size={20} />}
                                {saveStatus === 'idle' && <Save size={20} />}
                                {saveStatus === 'saving' ? 'جاري الحفظ...' : saveStatus === 'success' ? 'تم الحفظ!' : 'حفظ المادة'}
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
                            </div>

                            {/* Courses Grid */}
                            {isLoading ? (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="animate-spin text-4xl mb-4">⏳</div>
                                    <p>جاري تحميل المواد...</p>
                                </div>
                            ) : courses.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="font-medium">لا توجد مواد مضافة بعد</p>
                                    <p className="text-sm">اضغط على "إضافة مادة جديدة" للبدء</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {courses.map((course) => (
                                        <div
                                            key={course.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                                                    <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{course.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {course.content?.length || 0} حرف
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    👑 أنت مسؤول | المواد المضافة ستظهر لجميع الطلاب
                </div>
            </div>
        </>
    );
};

export default AdminPanel;
