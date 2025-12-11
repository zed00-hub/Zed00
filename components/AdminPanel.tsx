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
import { useNavigate } from 'react-router-dom';

const AdminPanel: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState<'courses' | 'analytics'>('courses');
    const [isLoading, setIsLoading] = useState(true);

    // Courses State
    const [courses, setCourses] = useState<CourseFile[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<CourseFile | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [isExtractingPDF, setIsExtractingPDF] = useState(false);
    const [showContentPreview, setShowContentPreview] = useState(true); // Toggle for viewing raw content
    const [courseName, setCourseName] = useState('');
    const [courseContent, setCourseContent] = useState('');
    const [courseCategory, setCourseCategory] = useState('other');

    // Analytics State
    const [userStats, setUserStats] = useState<UserStats[]>([]);

    useEffect(() => {
        // Redirect if not admin
        if (user && !isAdmin(user.email)) {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        loadData();
    }, [activeTab]);

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

    if (!user || !isAdmin(user.email)) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">جاري التحقق من الصلاحيات...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
                {/* Header with Tabs */}
                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                <LayoutDashboard className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">لوحة القيادة</h2>
                                <p className="text-sm text-gray-500">نظرة شاملة على أداء PARABOT</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 px-4 flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all"
                        >
                            <X size={20} />
                            <span>العودة للتطبيق</span>
                        </button>
                    </div>

                    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-xl">
                        <button
                            onClick={() => setActiveTab('courses')}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'courses'
                                    ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            <BookOpen size={20} />
                            إدارة المواد
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'analytics'
                                    ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            <Users size={20} />
                            تحليلات الطلاب
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <Loader2 className="w-10 h-10 mb-4 animate-spin text-amber-500" />
                            <p>جاري تحميل البيانات...</p>
                        </div>
                    ) : activeTab === 'courses' ? (
                        // --- COURSES TAB ---
                        showAddForm ? (
                            <div className="space-y-4 bg-white dark:bg-dark-surface p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
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
                                        className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التصنيف</label>
                                    <select
                                        value={courseCategory}
                                        onChange={(e) => setCourseCategory(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
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
                                                rows={12}
                                                className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm leading-relaxed"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleSaveCourse}
                                        disabled={!courseName.trim() || !courseContent.trim() || saveStatus === 'saving'}
                                        className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                                    >
                                        {saveStatus === 'saving' ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                        {saveStatus === 'saving' ? 'جاري الحفظ...' : 'حفظ المادة'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <button onClick={() => { resetForm(); setShowAddForm(true); }} className="flex-1 py-4 bg-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 shadow-lg hover:shadow-amber-500/20 transition-all">
                                        <Plus size={24} /> إضافة مادة يدوياً
                                    </button>
                                    <label className="flex-1 py-4 bg-white dark:bg-dark-surface border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                                        <FileUp size={24} /> رفع ملف PDF
                                        <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                                    </label>
                                </div>

                                <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">المواد الحالية</h3>
                                    </div>
                                    {courses.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">لا توجد مواد مضافة بعد</div>
                                    ) : (
                                        <div className="divide-y dark:divide-gray-700">
                                            {courses.map(course => (
                                                <div key={course.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-amber-600 dark:text-amber-500 group-hover:scale-110 transition-transform"><BookOpen size={24} /></div>
                                                        <div>
                                                            <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">{course.name}</p>
                                                            <span className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 font-medium">{getCategoryLabel(course.category || 'other')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditCourse(course)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-blue-500 transition-colors"><Edit2 size={20} /></button>
                                                        <button onClick={() => handleDeleteCourse(course.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    ) : (
                        // --- ANALYTICS TAB ---
                        <div className="space-y-6">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-6 bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <p className="text-sm font-medium text-gray-500 mb-2">عدد الطلاب</p>
                                    <p className="text-3xl font-black text-amber-600">{userStats.length}</p>
                                </div>
                                <div className="p-6 bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <p className="text-sm font-medium text-gray-500 mb-2">إجمالي المحادثات</p>
                                    <p className="text-3xl font-black text-blue-600">
                                        {userStats.reduce((acc, u) => acc + (u.conversationsCount || 0), 0)}
                                    </p>
                                </div>
                                <div className="p-6 bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <p className="text-sm font-medium text-gray-500 mb-2">وقت التعلم الكلي</p>
                                    <p className="text-3xl font-black text-green-600">
                                        {formatTime(userStats.reduce((acc, u) => acc + (u.totalTimeSpent || 0), 0))}
                                    </p>
                                </div>
                                <div className="p-6 bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <p className="text-sm font-medium text-gray-500 mb-2">متوسط وقت الطالب</p>
                                    <p className="text-3xl font-black text-purple-600">
                                        {userStats.length > 0
                                            ? formatTime(Math.round(userStats.reduce((acc, u) => acc + (u.totalTimeSpent || 0), 0) / userStats.length))
                                            : '0د'}
                                    </p>
                                </div>
                            </div>

                            {/* Info Alert for Admin */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">لماذا العدد قليل؟</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                        يظهر هنا فقط الطلاب الذين دخلوا للتطبيق <strong>بعد</strong> التحديث الأخير.
                                        الطلاب القدامى سيظهرون تلقائياً في القائمة واحداً تلو الآخر بمجرد فتحهم للتطبيق.
                                    </p>
                                </div>
                            </div>

                            {/* Students List */}
                            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 gap-2 p-4 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-500 border-b dark:border-gray-700">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-4 md:col-span-3">الطالب</div>
                                    <div className="col-span-2 text-center">المستوى</div>
                                    <div className="col-span-2 text-center">الوقت</div>
                                    <div className="col-span-1 text-center hidden md:block">المحادثات</div>
                                    <div className="col-span-1 text-center hidden md:block">الاختبارات</div>
                                    <div className="col-span-2 md:col-span-1 text-center">آخر ظهور</div>
                                </div>

                                <div className="divide-y dark:divide-gray-700">
                                    {userStats.map((stat, index) => {
                                        const level = getUserLevel(stat.totalTimeSpent || 0);
                                        return (
                                            <div key={stat.id} className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="col-span-1 text-center font-bold text-amber-500">
                                                    {index < 3 ? <Medal size={24} className={`mx-auto ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-500'}`} /> : index + 1}
                                                </div>
                                                <div className="col-span-4 md:col-span-3 flex items-center gap-3">
                                                    <img src={stat.avatar || `https://ui-avatars.com/api/?name=${stat.name}&background=random`} alt={stat.name} className="w-10 h-10 rounded-full bg-gray-200 shadow-sm" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{stat.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{stat.email}</p>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${level.color}`}>
                                                        {level.label}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 text-center font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                                                    {formatTime(stat.totalTimeSpent || 0)}
                                                </div>
                                                <div className="col-span-1 text-center text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:block">
                                                    {stat.conversationsCount || 0}
                                                </div>
                                                <div className="col-span-1 text-center text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:block">
                                                    {stat.quizzesCount || 0}
                                                </div>
                                                <div className="col-span-2 md:col-span-1 text-center text-xs text-gray-400">
                                                    {stat.lastActive?.seconds ? new Date(stat.lastActive.seconds * 1000).toLocaleDateString('ar-EG') : '-'}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {userStats.length === 0 && (
                                        <div className="text-center py-12 text-gray-400">
                                            لا توجد بيانات طلاب لعرضها حالياً
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-8 p-4 border-t border-gray-200 dark:border-gray-800 text-center">
                    <p className="text-xs text-gray-400">PARABOT Admin Dashboard &copy; {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
