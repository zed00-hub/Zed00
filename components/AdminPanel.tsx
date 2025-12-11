import React, { useState, useEffect } from 'react';
import {
    saveCourseToFirestore,
    loadCoursesFromFirestore,
    deleteCourseFromFirestore,
    isAdmin,
    COURSE_CATEGORIES,
    CourseFile
} from '../services/coursesService';
import {
    getAllUsersStats,
    UserStats,
    getUserLevel
} from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';
import {
    X, Plus, Trash2, Edit2, Save, FileText, Upload, BookOpen,
    AlertCircle, Check, FileUp, Loader2, Eye, EyeOff, LayoutDashboard,
    Users, Clock, MessageCircle, Medal
} from 'lucide-react';
import { extractTextFromPDF } from '../utils/pdfUtils';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onCoursesUpdated: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, onCoursesUpdated }) => {
    const { user } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState<'courses' | 'analytics'>('courses');
    const [isLoading, setIsLoading] = useState(true);

    // Courses State
    const [courses, setCourses] = useState<CourseFile[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<CourseFile | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [isExtractingPDF, setIsExtractingPDF] = useState(false);
    const [showContentPreview, setShowContentPreview] = useState(true);
    const [courseName, setCourseName] = useState('');
    const [courseContent, setCourseContent] = useState('');
    const [courseCategory, setCourseCategory] = useState('other');

    // Analytics State
    const [userStats, setUserStats] = useState<UserStats[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'courses') {
                const loaded = await loadCoursesFromFirestore();
                setCourses(loaded);
            } else {
                const stats = await getAllUsersStats();
                setUserStats(stats);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Course Functions ---
    const resetForm = () => {
        setCourseName('');
        setCourseContent('');
        setCourseCategory('other');
        setShowAddForm(false);
        setEditingCourse(null);
        setSaveStatus('idle');
        setShowContentPreview(true);
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
                loadData();
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
            loadData();
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
        setShowContentPreview(course.content.length < 1000);
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
                setCourseContent('');
                setShowContentPreview(false);

                const text = await extractTextFromPDF(file);

                setCourseContent(text);
                setIsExtractingPDF(false);
                setShowContentPreview(false);
            } else {
                const text = await file.text();
                setCourseName(file.name.replace(/\.[^/.]+$/, ''));
                setCourseContent(text);
                setShowAddForm(true);
                setShowContentPreview(true);
            }
        } catch (error: any) {
            console.error('Error reading file:', error);
            alert(error.message || 'فشل قراءة الملف');
            setIsExtractingPDF(false);
            setCourseContent('');
            setShowContentPreview(true);
        }
        e.target.value = '';
    };

    const getCategoryLabel = (categoryId: string) => {
        const cat = COURSE_CATEGORIES.find(c => c.id === categoryId);
        return cat?.labelAr || 'أخرى';
    };

    // --- Format Helper ---
    const formatTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}س ${m}د`;
        return `${m}د`;
    };

    if (!isOpen) return null;

    if (!isAdmin(user?.email)) {
        return null;
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-5xl max-h-[90vh] bg-white dark:bg-dark-surface rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col">
                {/* Header with Tabs */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                <LayoutDashboard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">لوحة القيادة</h2>
                                <p className="text-xs text-gray-500">مرحباً بك في لوحة تحكم PARABOT</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('courses')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'courses'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            <BookOpen size={18} />
                            إدارة المواد
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'analytics'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Users size={18} />
                            تحليلات الطلاب
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900/50">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-500" />
                            <p>جاري تحميل البيانات...</p>
                        </div>
                    ) : activeTab === 'courses' ? (
                        // --- COURSES TAB ---
                        showAddForm ? (
                            <div className="space-y-4 bg-white dark:bg-dark-bg p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200">
                                        {editingCourse ? 'تعديل المادة' : 'إضافة مادة جديدة'}
                                    </h3>
                                    <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700">
                                        إلغاء
                                    </button>
                                </div>

                                {/* Inputs for Course (Same as before) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم المادة</label>
                                    <input
                                        type="text"
                                        value={courseName}
                                        onChange={(e) => setCourseName(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl dark:bg-dark-surface dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التصنيف</label>
                                    <select
                                        value={courseCategory}
                                        onChange={(e) => setCourseCategory(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl dark:bg-dark-surface dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        {COURSE_CATEGORIES.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.labelAr} - {cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">المحتوى</label>
                                        <button
                                            onClick={() => setShowContentPreview(!showContentPreview)}
                                            className="text-xs text-amber-500 hover:text-amber-600 flex items-center gap-1"
                                            disabled={isExtractingPDF}
                                        >
                                            {showContentPreview ? <><EyeOff size={14} /> إخفاء</> : <><Eye size={14} /> عرض</>}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        {isExtractingPDF ? (
                                            <div className="w-full p-8 border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/10 rounded-xl flex flex-col items-center justify-center animate-pulse">
                                                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
                                                <p className="text-sm font-bold text-amber-700">جاري تحليل ملف PDF...</p>
                                            </div>
                                        ) : !showContentPreview && courseContent ? (
                                            <div className="w-full p-4 border rounded-xl bg-gray-50 flex items-center gap-3">
                                                <Check size={20} className="text-green-500" />
                                                <p className="text-sm text-gray-600">المحتوى جاهز ({courseContent.length} حرف)</p>
                                            </div>
                                        ) : (
                                            <textarea
                                                value={courseContent}
                                                onChange={(e) => setCourseContent(e.target.value)}
                                                rows={10}
                                                className="w-full px-4 py-3 border rounded-xl dark:bg-dark-surface dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                                            />
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveCourse}
                                    disabled={!courseName.trim() || !courseContent.trim() || saveStatus === 'saving'}
                                    className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                                >
                                    {saveStatus === 'saving' ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    {saveStatus === 'saving' ? 'جاري الحفظ...' : 'حفظ المادة'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <button onClick={() => { resetForm(); setShowAddForm(true); }} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600">
                                        <Plus size={20} /> إضافة يدوية
                                    </button>
                                    <label className="flex-1 py-3 bg-white border border-dashed border-gray-300 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50">
                                        <FileUp size={20} /> تحليل PDF
                                        <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                                    </label>
                                </div>

                                {courses.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">لا توجد مواد مضافة</div>
                                ) : (
                                    <div className="grid gap-3">
                                        {courses.map(course => (
                                            <div key={course.id} className="p-4 bg-white dark:bg-dark-surface rounded-xl border dark:border-gray-700 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><BookOpen size={20} /></div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 dark:text-gray-200">{course.name}</p>
                                                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{getCategoryLabel(course.category || 'other')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEditCourse(course)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteCourse(course.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        // --- ANALYTICS TAB ---
                        <div className="space-y-4">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-4 bg-white dark:bg-dark-surface rounded-xl border dark:border-gray-700 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">عدد الطلاب</p>
                                    <p className="text-2xl font-bold text-amber-600">{userStats.length}</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-dark-surface rounded-xl border dark:border-gray-700 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">المحادثات</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {userStats.reduce((acc, u) => acc + (u.conversationsCount || 0), 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-white dark:bg-dark-surface rounded-xl border dark:border-gray-700 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">وقت التعلم</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatTime(userStats.reduce((acc, u) => acc + (u.totalTimeSpent || 0), 0))}
                                    </p>
                                </div>
                                <div className="p-4 bg-white dark:bg-dark-surface rounded-xl border dark:border-gray-700 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">متوسط الوقت</p>
                                    <p className="text-xl font-bold text-purple-600">
                                        {userStats.length > 0
                                            ? formatTime(Math.round(userStats.reduce((acc, u) => acc + (u.totalTimeSpent || 0), 0) / userStats.length))
                                            : '0د'}
                                    </p>
                                </div>
                            </div>

                            {/* Students List */}
                            <div className="bg-white dark:bg-dark-surface rounded-2xl border dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 gap-2 p-4 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-500 border-b dark:border-gray-700">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-5 md:col-span-4">الطالب</div>
                                    <div className="col-span-3 md:col-span-2 text-center">المستوى</div>
                                    <div className="col-span-3 md:col-span-2 text-center">الوقت</div>
                                    <div className="hidden md:block col-span-2 text-center">المحادثات</div>
                                    <div className="hidden md:block col-span-1 text-center">آخر ظهور</div>
                                </div>

                                <div className="divide-y dark:divide-gray-700">
                                    {userStats.map((stat, index) => {
                                        const level = getUserLevel(stat.totalTimeSpent || 0);
                                        return (
                                            <div key={stat.id} className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="col-span-1 text-center font-bold text-amber-500">
                                                    {index < 3 ? <Medal size={20} className={`mx-auto ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-500'}`} /> : index + 1}
                                                </div>
                                                <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                                                    <img src={stat.avatar || `https://ui-avatars.com/api/?name=${stat.name}&background=random`} alt={stat.name} className="w-8 h-8 rounded-full bg-gray-200" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{stat.name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{stat.email}</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-3 md:col-span-2 text-center">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${level.color}`}>
                                                        {level.label}
                                                    </span>
                                                </div>
                                                <div className="col-span-3 md:col-span-2 text-center font-mono text-sm text-gray-700 dark:text-gray-300">
                                                    {formatTime(stat.totalTimeSpent || 0)}
                                                </div>
                                                <div className="hidden md:block col-span-2 text-center text-sm text-gray-600 dark:text-gray-400">
                                                    {stat.conversationsCount || 0}
                                                </div>
                                                <div className="hidden md:block col-span-1 text-center text-xs text-gray-400">
                                                    {/* Simple date format */}
                                                    {stat.lastActive?.seconds ? new Date(stat.lastActive.seconds * 1000).toLocaleDateString('ar-EG') : '-'}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {userStats.length === 0 && (
                                        <div className="text-center py-8 text-gray-400">
                                            لا توجد بيانات طلاب لعرضها حالياً
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t bg-white dark:bg-dark-surface text-center text-[10px] text-gray-400">
                    PARABOT Admin Panel v2.0
                </div>
            </div>
        </>
    );
};

export default AdminPanel;
