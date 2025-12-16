import React, { useState, useEffect } from 'react';
import {
    saveCourseToFirestore,
    loadCoursesFromFirestore,
    deleteCourseFromFirestore,
    isAdmin,
    isSupervisor,
    hasAdminPanelAccess,
    COURSE_CATEGORIES,
    CourseFile
} from '../services/coursesService';
import {
    saveKnowledgeEntry,
    loadKnowledgeEntries,
    deleteKnowledgeEntry,
    KNOWLEDGE_CATEGORIES,
    KnowledgeEntry,
    getBotConfig,
    saveBotConfig,
    BotGlobalConfig
} from '../services/botKnowledgeService';
import {
    getAllUsersStats,
    getStatsForDateRange,
    getUserDetailedActivity,
    UserStats,
    getUserLevel
} from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';
import {
    X, Plus, Trash2, Edit2, Save, FileText, Upload, BookOpen,
    AlertCircle, Check, FileUp, Loader2, Eye, EyeOff, LayoutDashboard,
    Users, Clock, MessageCircle, Medal, Brain, Lightbulb
} from 'lucide-react';
import { extractTextFromPDF } from '../utils/pdfUtils';
import { extractTextFromDocx } from '../utils/docxUtils';
import { useNavigate } from 'react-router-dom';
import { analyzeImage } from '../services/geminiService';
import { sendAdminMessage, getAllMessagesForAdmin, AdminMessage, replyToMessage } from '../services/notificationService';
import { MessageSquarePlus, Send, Mail } from 'lucide-react';

const AdminPanel: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // UI State
    const [activeTab, setActiveTab] = useState<'courses' | 'analytics' | 'knowledge' | 'settings' | 'messages'>('courses');
    const [isLoading, setIsLoading] = useState(true);

    // Courses State
    const [courses, setCourses] = useState<CourseFile[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<CourseFile | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [isExtractingPDF, setIsExtractingPDF] = useState(false);
    const [showContentPreview, setShowContentPreview] = useState(false); // Hidden by default as requested
    const [courseName, setCourseName] = useState('');
    const [courseContent, setCourseContent] = useState('');
    const [courseCategory, setCourseCategory] = useState('other');
    const [formMode, setFormMode] = useState<'create' | 'append'>('create');
    const [lessonTitle, setLessonTitle] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');

    // Analytics State
    const [userStats, setUserStats] = useState<UserStats[]>([]);
    const [originalUserStats, setOriginalUserStats] = useState<UserStats[]>([]); // Store original for reset
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'totalTimeSpent' | 'conversationsCount' | 'quizzesCount' | 'lastActive'>('totalTimeSpent');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterDateType, setFilterDateType] = useState<'all' | 'today' | 'custom'>('all');
    const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [periodStats, setPeriodStats] = useState<Record<string, { conversations: number, quizzes: number, checklists: number }>>({}); // Stats for filtered period

    // Message Modal State
    const [messageModal, setMessageModal] = useState<{ isOpen: boolean; userId: string; userName: string }>({ isOpen: false, userId: '', userName: '' });
    const [messageText, setMessageText] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    // Messages Tab State (for viewing replies)
    const [allAdminMessages, setAllAdminMessages] = useState<AdminMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [adminReplyText, setAdminReplyText] = useState('');
    const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);

    // Student Details Modal State
    const [selectedStudent, setSelectedStudent] = useState<UserStats | null>(null);
    const [studentDetails, setStudentDetails] = useState<{ sessions: any[], quizzes: any[], checklists: any[] } | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState<'conversations' | 'quizzes' | 'checklists'>('conversations');

    // Knowledge State
    const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
    const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
    const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeEntry | null>(null);
    const [knowledgeTitle, setKnowledgeTitle] = useState('');
    const [knowledgeContent, setKnowledgeContent] = useState('');
    const [knowledgeCategory, setKnowledgeCategory] = useState('general_info');
    const [knowledgeComment, setKnowledgeComment] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Settings State
    const [botConfig, setBotConfig] = useState<BotGlobalConfig>({
        systemInstruction: '',
        temperature: 0.5,
        restrictToStudy: false,
        interactionStyle: 'default'
    });

    useEffect(() => {
        // Redirect if not admin or supervisor
        if (user && !hasAdminPanelAccess(user.email)) {
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
            } else if (activeTab === 'analytics') {
                const stats = await getAllUsersStats();
                setOriginalUserStats(stats);
                setUserStats(stats);

                // If filter is active (re-loading tab), apply it? For now, we reset filter on tab switch or keep it simple.
                // Let's reset filter on tab switch for simplicity, or handle it via useEffect on filterDateType.
            } else if (activeTab === 'knowledge') {
                const entries = await loadKnowledgeEntries();
                setKnowledgeEntries(entries);
            } else if (activeTab === 'settings') {
                const config = await getBotConfig();
                if (config) {
                    setBotConfig(config);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Filter Logic ---
    useEffect(() => {
        const fetchPeriodStats = async () => {
            if (filterDateType === 'all') {
                setPeriodStats({});
                return;
            }

            setIsLoading(true);
            try {
                let startDate = new Date();
                let endDate = new Date();

                if (filterDateType === 'today') {
                    startDate.setHours(0, 0, 0, 0);
                    endDate.setHours(23, 59, 59, 999);
                } else if (filterDateType === 'custom') {
                    startDate = new Date(customDate);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(customDate);
                    endDate.setHours(23, 59, 59, 999);
                }

                const stats = await getStatsForDateRange(startDate, endDate);
                setPeriodStats(stats);
            } catch (error) {
                console.error("Error applying date filter:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (activeTab === 'analytics') {
            fetchPeriodStats();
        }
    }, [filterDateType, customDate, activeTab]);

    const handleSendMessageToUser = async () => {
        if (!messageText.trim()) return;
        setSendingMessage(true);
        try {
            await sendAdminMessage(messageModal.userId, messageText.trim(), messageModal.userName);
            alert('تم إرسال الرسالة بنجاح');
            setMessageModal({ isOpen: false, userId: '', userName: '' });
            setMessageText('');
        } catch (error) {
            alert('فشل إرسال الرسالة');
            console.error(error);
        } finally {
            setSendingMessage(false);
        }
    };

    // Load messages when messages tab is active
    useEffect(() => {
        const loadMessages = async () => {
            if (activeTab === 'messages' && isAdmin(user?.email)) {
                setMessagesLoading(true);
                try {
                    const messages = await getAllMessagesForAdmin();
                    setAllAdminMessages(messages);
                } catch (error) {
                    console.error('Error loading messages:', error);
                } finally {
                    setMessagesLoading(false);
                }
            }
        };
        loadMessages();
    }, [activeTab, user?.email]);

    // Handle admin reply to student
    const handleAdminReply = async (studentId: string, messageId: string) => {
        if (!adminReplyText.trim()) return;
        try {
            await replyToMessage(studentId, messageId, adminReplyText.trim(), 'الإدارة');
            // Refresh messages
            const messages = await getAllMessagesForAdmin();
            setAllAdminMessages(messages);
            setAdminReplyText('');
            setReplyingToMessageId(null);
        } catch (error) {
            console.error('Error sending admin reply:', error);
            alert('فشل إرسال الرد');
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
        setLessonTitle('');
        setSelectedCourseId('');
        setFormMode('create');
    };

    const handleSaveCourse = async () => {
        if (formMode === 'create' && (!courseName.trim() || !courseContent.trim())) return;
        if (formMode === 'append' && (!selectedCourseId || !courseContent.trim())) return;

        setSaveStatus('saving');
        try {
            if (formMode === 'create') {
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
            } else {
                // In append mode, selectedCourseId is actually the CATEGORY ID
                const categoryId = selectedCourseId;
                const category = COURSE_CATEGORIES.find(c => c.id === categoryId);

                // Try to find existing course for this category
                // We PRIORITIZE exact category match used by the system
                let courseToUpdate = courses.find(c => c.category === categoryId);

                const separator = `\n\n---\n**${lessonTitle || 'درس جديد'}**\n---\n\n`;
                const contentToAdd = courseContent.trim();

                if (courseToUpdate) {
                    // Append to existing
                    const newContent = courseToUpdate.content + separator + contentToAdd;
                    const updatedCourse: CourseFile = {
                        ...courseToUpdate,
                        content: newContent,
                        size: new Blob([newContent]).size
                    };
                    await saveCourseToFirestore(updatedCourse);
                } else {
                    // Create new course for this category automatically
                    const newCourse: CourseFile = {
                        id: `course-${categoryId}-${Date.now()}`, // Unique ID
                        name: category ? category.labelAr : 'مادة جديدة', // Use Arabic label as name
                        type: 'text/plain',
                        content: `# ${category ? category.labelAr : 'مادة'} - ${category ? category.label : ''}\n\n` + separator + contentToAdd,
                        size: new Blob([contentToAdd]).size,
                        category: categoryId,
                        createdAt: Date.now()
                    };
                    await saveCourseToFirestore(newCourse);
                }
            }

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
        setFormMode('create'); // Edit is essentially a "create" mode (full edit)
        setShowAddForm(true);
        setShowContentPreview(course.content.length < 1000);
    };

    useEffect(() => {
        if (selectedStudent) {
            setLoadingDetails(true);
            getUserDetailedActivity(selectedStudent.id)
                .then(data => {
                    setStudentDetails(data);
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingDetails(false));
        } else {
            setStudentDetails(null);
        }
    }, [selectedStudent]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsExtractingPDF(true);
            setIsExtractingPDF(true);
            if (!showAddForm) setShowAddForm(true); // Ensure form is open if triggered externally

            if (formMode === 'create') {
                setCourseName(file.name.replace(/\.[^/.]+$/, ""));
            } else {
                setLessonTitle(file.name.replace(/\.[^/.]+$/, ""));
            }

            setCourseContent('');
            setShowContentPreview(false);

            let text = "";
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                text = await extractTextFromPDF(file);
            } else if (file.name.endsWith('.docx') || file.type.includes('wordprocessing')) {
                text = await extractTextFromDocx(file);
            } else {
                text = await file.text();
            }

            setCourseContent(text);
            setIsExtractingPDF(false);
        } catch (error: any) {
            console.error('Error reading file:', error);
            alert(error.message || 'فشل قراءة الملف');
            setIsExtractingPDF(false);
            setCourseContent('');
        }
        e.target.value = '';
    };

    const getCategoryLabel = (categoryId: string) => {
        const cat = COURSE_CATEGORIES.find(c => c.id === categoryId);
        return cat?.labelAr || 'أخرى';
    };

    const handleKnowledgeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            let content = "";
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                content = await extractTextFromPDF(file);
            } else if (file.type.startsWith('image/')) {
                content = await analyzeImage(file);
            } else {
                content = await file.text();
            }

            setKnowledgeContent(content);
            setKnowledgeTitle(file.name.replace(/\.[^/.]+$/, "")); // Auto title
        } catch (error) {
            console.error("Knowledge upload error:", error);
            alert("فشل تحليل الملف: " + error);
        } finally {
            setIsAnalyzing(false);
        }
        e.target.value = '';
    };

    // --- Format Helper ---
    const formatTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}س ${m}د`;
        return `${m}د`;
    };

    // Check supervisor status
    const isUserSupervisor = isSupervisor(user?.email);

    if (!user || (!isAdmin(user.email) && !isSupervisor(user.email))) {
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
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                                    {isUserSupervisor ? 'لوحة المشرف' : 'لوحة القيادة'}
                                </h2>
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

                    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-xl overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('courses')}
                            className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'courses'
                                ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            <BookOpen size={20} />
                            إدارة المواد
                        </button>

                        {!isUserSupervisor && (
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'analytics'
                                    ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                <Users size={20} />
                                تحليلات الطلاب
                            </button>
                        )}

                        <button
                            onClick={() => setActiveTab('knowledge')}
                            className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'knowledge'
                                ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            <Brain size={20} />
                            تغذية البوت
                        </button>

                        {!isUserSupervisor && (
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'settings'
                                    ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                <Lightbulb size={20} />
                                تخصيص البوت
                            </button>
                        )}

                        {!isUserSupervisor && (
                            <button
                                onClick={() => setActiveTab('messages')}
                                className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'messages'
                                    ? 'bg-white dark:bg-dark-surface text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                <Mail size={20} />
                                الرسائل
                            </button>
                        )}
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
                                        {editingCourse ? 'تعديل المادة' : (formMode === 'create' ? 'إضافة مادة جديدة' : 'إضافة درس لمادة سابقة')}
                                    </h3>
                                    <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700">
                                        إلغاء
                                    </button>
                                </div>

                                {/* Inputs for Course (Same as before) */}
                                {formMode === 'create' ? (
                                    <>
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
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اختر المادة</label>
                                            <select
                                                value={selectedCourseId}
                                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                                className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                            >
                                                <option value="">اختر مادة للتدريس...</option>
                                                {COURSE_CATEGORIES.filter(cat => cat.id !== 'other').map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.labelAr} ({cat.label})</option>
                                                ))}
                                                <option value="other">أخرى / Autre</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">عنوان الدرس (اختياري)</label>
                                            <input
                                                type="text"
                                                value={lessonTitle}
                                                onChange={(e) => setLessonTitle(e.target.value)}
                                                placeholder="مثال: درس القلعة العصبية"
                                                className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">المحتوى</label>
                                        <div className="flex gap-2">
                                            <label className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded cursor-pointer flex items-center gap-1 text-gray-600 dark:text-gray-300 transition-colors">
                                                <Upload size={12} />
                                                <span>رفع ملف</span>
                                                <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} className="hidden" />
                                            </label>
                                            <button
                                                onClick={() => setShowContentPreview(!showContentPreview)}
                                                className="text-xs text-amber-500 hover:text-amber-600 flex items-center gap-1"
                                                disabled={isExtractingPDF}
                                            >
                                                {showContentPreview ? <><EyeOff size={14} /> إخفاء</> : <><Eye size={14} /> عرض</>}
                                            </button>
                                        </div>
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
                                                placeholder={formMode === 'append' ? "اكتب محتوى الدرس هنا أو ارفع ملف..." : "اكتب محتوى المادة هنا..."}
                                                className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm leading-relaxed"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleSaveCourse}
                                        disabled={
                                            (formMode === 'create' && (!courseName.trim() || !courseContent.trim())) ||
                                            (formMode === 'append' && (!selectedCourseId || !courseContent.trim())) ||
                                            saveStatus === 'saving'
                                        }
                                        className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                                    >
                                        {saveStatus === 'saving' ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                        {saveStatus === 'saving' ? 'جاري الحفظ...' : (formMode === 'create' ? 'حفظ المادة' : 'إضافة الدرس')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                        <Plus className="text-amber-500" />
                                        إضافة دروس
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => { resetForm(); setFormMode('append'); setShowAddForm(true); }}
                                            className="p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all group"
                                        >
                                            <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full text-amber-600 group-hover:scale-110 transition-transform">
                                                <FileText size={28} />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-gray-800 dark:text-gray-200">إضافة درس لمادة سابقة</p>
                                                <p className="text-xs text-gray-500 mt-1">إضافة محتوى جديد لمادة موجودة بالفعل</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { resetForm(); setFormMode('create'); setShowAddForm(true); }}
                                            className="p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                                        >
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                                                <BookOpen size={28} />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-gray-800 dark:text-gray-200">إضافة مادة جديدة بالكامل</p>
                                                <p className="text-xs text-gray-500 mt-1">إنشاء سجل جديد لمادة وتصنيف جديد</p>
                                            </div>
                                        </button>
                                    </div>
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
                    ) : activeTab === 'analytics' ? (
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

                            {/* Filter and Sort Toolbar */}
                            <div className="flex flex-col xl:flex-row gap-4 mb-4">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="بحث عن طالب..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <Users className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                </div>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {/* Date Filter */}
                                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                        <button
                                            onClick={() => setFilterDateType('all')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDateType === 'all' ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            الكل
                                        </button>
                                        <button
                                            onClick={() => setFilterDateType('today')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDateType === 'today' ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            اليوم
                                        </button>
                                        <button
                                            onClick={() => setFilterDateType('custom')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDateType === 'custom' ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            تاريخ
                                        </button>
                                    </div>

                                    {filterDateType === 'custom' && (
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => setCustomDate(e.target.value)}
                                            className="px-2 py-1.5 text-xs text-gray-600 border rounded-lg dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    )}

                                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="px-4 py-2 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                    >
                                        <option value="totalTimeSpent">الأكثر وقتاً</option>
                                        <option value="conversationsCount">الأكثر محادثة</option>
                                        <option value="quizzesCount">الأكثر اختباراً</option>
                                        <option value="lastActive">آخر ظهور</option>
                                    </select>
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="p-2 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                                    >
                                        {sortOrder === 'desc' ? '⬇️' : '⬆️'}
                                    </button>
                                </div>
                            </div>

                            {filterDateType !== 'all' && (
                                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg mb-2 flex items-center gap-2">
                                    <Clock size={14} />
                                    <span>يتم عرض نشاط الطلاب خلال: <strong>{filterDateType === 'today' ? 'اليوم' : customDate}</strong> فقط. (الوقت الكلي يمثل دائماً الإجمالي)</span>
                                </div>
                            )}

                            {/* Students List */}
                            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 gap-2 p-4 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-500 border-b dark:border-gray-700">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-4 md:col-span-3">الطالب</div>
                                    <div className="col-span-2 text-center">المستوى</div>
                                    <div className="col-span-2 text-center">الوقت</div>
                                    <div className="col-span-1 text-center hidden md:block">نشاط</div>
                                    <div className="col-span-1 text-center">آخر ظهور</div>
                                    <div className="col-span-1 text-center">إجراء</div>
                                </div>

                                <div className="divide-y dark:divide-gray-700">
                                    {userStats
                                        .filter(stat =>
                                            !isAdmin(stat.email) &&
                                            !isSupervisor(stat.email) &&
                                            (
                                                stat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                stat.email.toLowerCase().includes(searchTerm.toLowerCase())
                                            )
                                        )
                                        .sort((a, b) => {
                                            // Determine values based on whether filtering is active
                                            let valA = a[sortBy] || 0;
                                            let valB = b[sortBy] || 0;

                                            if (filterDateType !== 'all') {
                                                const statsA = periodStats[a.id] || { conversations: 0, quizzes: 0 };
                                                const statsB = periodStats[b.id] || { conversations: 0, quizzes: 0 };
                                                if (sortBy === 'conversationsCount') {
                                                    valA = statsA.conversations;
                                                    valB = statsB.conversations;
                                                } else if (sortBy === 'quizzesCount') {
                                                    valA = statsA.quizzes;
                                                    valB = statsB.quizzes;
                                                }
                                            }

                                            // Handle timestamp for Last Active
                                            if (sortBy === 'lastActive') {
                                                valA = a.lastActive?.seconds || 0;
                                                valB = b.lastActive?.seconds || 0;
                                            }

                                            return sortOrder === 'asc' ? valA - valB : valB - valA;
                                        })
                                        .map((stat, index) => {
                                            const level = getUserLevel(stat.totalTimeSpent || 0);
                                            const lastActiveDate = stat.lastActive?.seconds
                                                ? new Date(stat.lastActive.seconds * 1000)
                                                : null;

                                            // Get period specific counts if active
                                            const periodData = filterDateType !== 'all' ? (periodStats[stat.id] || { conversations: 0, quizzes: 0 }) : null;
                                            const displayConv = periodData ? periodData.conversations : (stat.conversationsCount || 0);
                                            const displayQuiz = periodData ? periodData.quizzes : (stat.quizzesCount || 0);

                                            return (
                                                <div
                                                    key={stat.id}
                                                    onClick={() => setSelectedStudent(stat)}
                                                    className="grid grid-cols-12 gap-2 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border-b border-transparent hover:border-amber-100 dark:hover:border-gray-700"
                                                >
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
                                                    <div className="col-span-1 text-center hidden md:block">
                                                        <div className="flex flex-col text-xs text-gray-500">
                                                            <span className={periodData ? "text-amber-600 font-bold" : ""} title="محادثات">💬 {displayConv}</span>
                                                            <span className={periodData ? "text-amber-600 font-bold" : ""} title="اختبارات">📝 {displayQuiz}</span>
                                                            <span className={periodData ? "text-amber-600 font-bold" : ""} title="قوائم">✅ {periodData ? periodData.checklists : (stat.checklistsCount || 0)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1 text-center text-xs text-gray-500 flex flex-col items-center justify-center">
                                                        {lastActiveDate ? (
                                                            <>
                                                                <span className="font-bold text-gray-700 dark:text-gray-300">{lastActiveDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                <span className="text-[10px]">{lastActiveDate.toLocaleDateString('en-GB')}</span>
                                                            </>
                                                        ) : '-'}
                                                    </div>
                                                    <div className="col-span-1 text-center flex justify-center">
                                                        <button
                                                            onClick={() => {
                                                                setMessageModal({ isOpen: true, userId: stat.id, userName: stat.name });
                                                                setMessageText('');
                                                            }}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="إرسال رسالة"
                                                        >
                                                            <MessageSquarePlus size={20} />
                                                        </button>
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
                    ) : activeTab === 'knowledge' ? (
                        <div className="space-y-6">
                            {showKnowledgeForm ? (
                                <div className="space-y-4 bg-white dark:bg-dark-surface p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg flex items-center gap-2">
                                            <Lightbulb className="text-amber-500" />
                                            {editingKnowledge ? 'تعديل المعلومة' : 'إضافة معلومة للبوت'}
                                        </h3>
                                        <button
                                            onClick={() => {
                                                setShowKnowledgeForm(false);
                                                setEditingKnowledge(null);
                                                setKnowledgeTitle('');
                                                setKnowledgeContent('');
                                                setKnowledgeCategory('general_info');
                                            }}
                                            className="text-sm text-gray-500 hover:text-gray-700"
                                        >
                                            إلغاء
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">عنوان المعلومة</label>
                                        <input
                                            type="text"
                                            value={knowledgeTitle}
                                            onChange={(e) => setKnowledgeTitle(e.target.value)}
                                            placeholder="مثال: معلومات عن تخصص IDE"
                                            className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التصنيف</label>
                                        <select
                                            value={knowledgeCategory}
                                            onChange={(e) => setKnowledgeCategory(e.target.value)}
                                            className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                        >
                                            {KNOWLEDGE_CATEGORIES.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.icon} {cat.labelAr} - {cat.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-4">
                                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                                            {isAnalyzing ? (
                                                <div className="flex flex-col items-center text-amber-500">
                                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                                    <span className="text-sm font-bold">جاري تحليل الملف/الصورة...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">اضغط لرفع ملف أو صورة</span>
                                                    <span className="text-xs text-gray-400 mt-1">PDF, TXT, Images (مع تحليل ذكي)</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept=".pdf,.txt,.md,.json,image/*"
                                                onChange={handleKnowledgeFileUpload}
                                                disabled={isAnalyzing}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تعليق إضافي (اختياري)</label>
                                        <input
                                            type="text"
                                            value={knowledgeComment}
                                            onChange={(e) => setKnowledgeComment(e.target.value)}
                                            placeholder="أضف ملاحظة أو سياق لهذا المحتوى..."
                                            className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المحتوى المستخرج</label>
                                            <button
                                                onClick={() => setShowContentPreview(!showContentPreview)} // Reuse the course state for now or add new one? Actually reusing simplifies UI logic here or user can rely on "saving" blindly. Let's make it always hidden or toggleable detail.
                                                type="button"
                                                className="text-xs text-amber-500 hover:text-amber-600"
                                            >
                                                {/* Reusing showContentPreview might be weird if tabs switch, but acceptable for simple admin. Or better: use 'details' html element. */}
                                            </button>
                                        </div>
                                        <details className="group">
                                            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-amber-600 dark:text-amber-400 text-sm mb-2">
                                                <span>عرض/تعديل المحتوى المستخرج</span>
                                                <span className="transition group-open:rotate-180">
                                                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                                </span>
                                            </summary>
                                            <textarea
                                                value={knowledgeContent}
                                                onChange={(e) => setKnowledgeContent(e.target.value)}
                                                rows={8}
                                                placeholder="أدخل المعلومات التي تريد أن يعرفها البوت..."
                                                className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm leading-relaxed"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">هذا هو النص الذي سيحفظ في ذاكرة البوت.</p>
                                        </details>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={async () => {
                                                if (!knowledgeTitle.trim() || !knowledgeContent.trim()) return;
                                                setSaveStatus('saving');
                                                try {
                                                    const finalContent = knowledgeComment.trim()
                                                        ? `[ملاحظة: ${knowledgeComment.trim()}]\n\n${knowledgeContent.trim()}`
                                                        : knowledgeContent.trim();

                                                    await saveKnowledgeEntry({
                                                        id: editingKnowledge?.id || `knowledge-${Date.now()}`,
                                                        title: knowledgeTitle.trim(),
                                                        content: finalContent,
                                                        category: knowledgeCategory,
                                                        createdAt: editingKnowledge?.createdAt || Date.now()
                                                    });
                                                    setSaveStatus('success');
                                                    setTimeout(() => {
                                                        setShowKnowledgeForm(false);
                                                        setEditingKnowledge(null);
                                                        setKnowledgeTitle('');
                                                        setKnowledgeContent('');
                                                        setKnowledgeComment('');
                                                        setSaveStatus('idle');
                                                        loadData();
                                                    }, 1000);
                                                } catch (error) {
                                                    console.error('Error saving knowledge:', error);
                                                    setSaveStatus('error');
                                                    setTimeout(() => setSaveStatus('idle'), 2000);
                                                }
                                            }}
                                            disabled={!knowledgeTitle.trim() || !knowledgeContent.trim() || saveStatus === 'saving'}
                                            className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]"
                                        >
                                            {saveStatus === 'saving' ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                            {saveStatus === 'saving' ? 'جاري الحفظ...' : saveStatus === 'success' ? '✓ تم الحفظ!' : 'حفظ المعلومة'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <button
                                        onClick={() => setShowKnowledgeForm(true)}
                                        className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 shadow-lg hover:shadow-amber-500/20 transition-all"
                                    >
                                        <Plus size={24} /> إضافة معلومة جديدة للبوت
                                    </button>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                                        <Brain className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">كيف يعمل؟</p>
                                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                                المعلومات التي تضيفها هنا ستكون متاحة للبوت للإجابة على أسئلة الطلاب.
                                                يمكنك إضافة معلومات عن التخصصات، نصائح للامتحانات، بحوث، قوانين، وغيرها.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                            <h3 className="font-bold text-gray-800 dark:text-gray-200">المعلومات المضافة ({knowledgeEntries.length})</h3>
                                        </div>
                                        {knowledgeEntries.length === 0 ? (
                                            <div className="text-center py-12 text-gray-400">لم تضف أي معلومات بعد</div>
                                        ) : (
                                            <div className="divide-y dark:divide-gray-700">
                                                {knowledgeEntries.map(entry => {
                                                    const cat = KNOWLEDGE_CATEGORIES.find(c => c.id === entry.category);
                                                    return (
                                                        <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-start justify-between group">
                                                            <div className="flex items-start gap-4">
                                                                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-2xl group-hover:scale-110 transition-transform">
                                                                    {cat?.icon || '📎'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">{entry.title}</p>
                                                                    <span className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 font-medium">
                                                                        {cat?.labelAr || 'أخرى'}
                                                                    </span>
                                                                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{entry.content.substring(0, 150)}...</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingKnowledge(entry);
                                                                        setKnowledgeTitle(entry.title);
                                                                        setKnowledgeContent(entry.content);
                                                                        setKnowledgeCategory(entry.category);
                                                                        setShowKnowledgeForm(true);
                                                                    }}
                                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-blue-500 transition-colors"
                                                                >
                                                                    <Edit2 size={20} />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm('هل أنت متأكد من حذف هذه المعلومة؟')) return;
                                                                        await deleteKnowledgeEntry(entry.id);
                                                                        loadData();
                                                                    }}
                                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'settings' ? (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                        <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">تخصيص شخصية البوت</h3>
                                        <p className="text-sm text-gray-500">تحكم في كيفية تصرف البوت، أسلوبه، وحدوده.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            التعليمات البرمجية (System Instruction)
                                        </label>
                                        <p className="text-xs text-gray-500 mb-3">
                                            هذه التعليمات هي "عقل" البوت. اكتب هنا كيف تريده أن يتصرف، لغته، اسمه، والقواعد التي يجب أن يتبعها.
                                            <br />
                                            <span className="text-amber-600 font-bold">ملاحظة:</span> سيتم دمج المعلومات من "تغذية البوت" ومواد الفصل الأول تلقائياً مع هذه التعليمات، لذا لا داعي لكتابتها يدوياً هنا.
                                        </p>
                                        <textarea
                                            value={botConfig.systemInstruction}
                                            onChange={(e) => setBotConfig({ ...botConfig, systemInstruction: e.target.value })}
                                            rows={15}
                                            placeholder={`أنت مساعد ذكي للطلاب...
قواعدك هي:
1. ...
2. ...`}
                                            className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm leading-relaxed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            مستوى الإبداع (Temperature): {botConfig.temperature}
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500">دقيق (0.0)</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.1"
                                                value={botConfig.temperature}
                                                onChange={(e) => setBotConfig({ ...botConfig, temperature: parseFloat(e.target.value) })}
                                                className="flex-1 accent-amber-500"
                                            />
                                            <span className="text-xs text-gray-500">مبدع (1.0)</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            القيم المنخفضة تجعل البوت أكثر دقة وجدية. القيم العالية تجعله أكثر تنوعاً وإبداعاً. (المستحسن: 0.5)
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            {/* Interaction Style */}
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                    نمط التفاعل (Personality Style)
                                                </label>
                                                <select
                                                    value={botConfig.interactionStyle || 'default'}
                                                    onChange={(e) => setBotConfig({ ...botConfig, interactionStyle: e.target.value as any })}
                                                    className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
                                                >
                                                    <option value="default">الافتراضي (Default)</option>
                                                    <option value="formal">رسمي وأكاديمي (Formal)</option>
                                                    <option value="friendly">ودود ومشجع (Friendly)</option>
                                                    <option value="motivational">محفز وحماسي (Motivational)</option>
                                                    <option value="coach">مدرب صارم (Coach)</option>
                                                </select>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    يحدد نبرة صوت البوت وطريقة تعامله مع الطالب.
                                                </p>
                                            </div>

                                            {/* Restriction Toggle */}
                                            <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                                        حصر الإجابات في الدراسة فقط
                                                    </label>
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                        عند التفعيل، سيرفض البوت الإجابة عن أي سؤال خارج المنهج الطبي.
                                                    </p>
                                                </div>
                                                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                                                    <input
                                                        type="checkbox"
                                                        id="restrictToggle"
                                                        className="peer sr-only"
                                                        checked={botConfig.restrictToStudy || false}
                                                        onChange={(e) => setBotConfig({ ...botConfig, restrictToStudy: e.target.checked })}
                                                    />
                                                    <label
                                                        htmlFor="restrictToggle"
                                                        className="block bg-gray-300 peer-checked:bg-red-500 w-12 h-6 rounded-full cursor-pointer transition-colors duration-200"
                                                    ></label>
                                                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 peer-checked:translate-x-6"></span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                setSaveStatus('saving');
                                                try {
                                                    await saveBotConfig(botConfig);
                                                    setSaveStatus('success');
                                                    setTimeout(() => setSaveStatus('idle'), 2000);
                                                } catch (error) {
                                                    console.error(error);
                                                    setSaveStatus('error');
                                                    setTimeout(() => setSaveStatus('idle'), 2000);
                                                }
                                            }}
                                            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
                                        >
                                            {saveStatus === 'saving' ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                            {saveStatus === 'saving' ? 'جاري الحفظ...' : saveStatus === 'success' ? '✓ تم تحديث البوت!' : 'حفظ الإعدادات'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'messages' ? (
                        // --- MESSAGES TAB ---
                        <div className="space-y-6 p-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Mail className="text-blue-500" />
                                    رسائل الطلاب
                                </h2>
                                <button
                                    onClick={async () => {
                                        setMessagesLoading(true);
                                        const messages = await getAllMessagesForAdmin();
                                        setAllAdminMessages(messages);
                                        setMessagesLoading(false);
                                    }}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
                                >
                                    تحديث
                                </button>
                            </div>

                            {messagesLoading ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                    <Loader2 className="w-10 h-10 mb-4 animate-spin text-blue-500" />
                                    <p>جاري تحميل الرسائل...</p>
                                </div>
                            ) : allAdminMessages.length === 0 ? (
                                <div className="text-center py-16 text-gray-500">
                                    <Mail size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium">لا توجد رسائل مع ردود</p>
                                    <p className="text-sm">عندما يرد طالب على رسالة، ستظهر هنا</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {allAdminMessages.map(msg => (
                                        <div key={msg.id} className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                                            {/* Student Info */}
                                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                        <Users size={16} className="text-blue-600" />
                                                    </div>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                                        {msg.studentName || 'طالب'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400" dir="ltr">
                                                    {new Date(msg.createdAt).toLocaleString('ar-DZ')}
                                                </span>
                                            </div>

                                            {/* Original Admin Message */}
                                            <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg mb-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">رسالتك</span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 text-sm">{msg.content}</p>
                                            </div>

                                            {/* Replies */}
                                            {msg.replies && msg.replies.length > 0 && (
                                                <div className="space-y-2 mb-3">
                                                    {msg.replies.map(reply => (
                                                        <div
                                                            key={reply.id}
                                                            className={`p-3 rounded-lg ${reply.sender === 'student'
                                                                ? 'bg-blue-50 dark:bg-blue-900/20 mr-4'
                                                                : 'bg-amber-50 dark:bg-amber-900/20 ml-4'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${reply.sender === 'student'
                                                                    ? 'bg-blue-500 text-white'
                                                                    : 'bg-amber-500 text-white'
                                                                    }`}>
                                                                    {reply.sender === 'student' ? (reply.senderName || 'الطالب') : 'أنت'}
                                                                </span>
                                                                <span className="text-xs text-gray-400" dir="ltr">
                                                                    {new Date(reply.createdAt).toLocaleString('ar-DZ')}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-700 dark:text-gray-300 text-sm">{reply.content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Reply Input */}
                                            {replyingToMessageId === msg.id ? (
                                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                                    <textarea
                                                        value={adminReplyText}
                                                        onChange={(e) => setAdminReplyText(e.target.value)}
                                                        placeholder="اكتب ردك للطالب..."
                                                        className="w-full p-3 border rounded-lg dark:bg-dark-bg dark:border-gray-700 text-gray-800 dark:text-gray-200 text-right resize-none text-sm"
                                                        rows={2}
                                                    />
                                                    <div className="flex gap-2 mt-2 justify-end">
                                                        <button
                                                            onClick={() => { setReplyingToMessageId(null); setAdminReplyText(''); }}
                                                            className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm"
                                                        >
                                                            إلغاء
                                                        </button>
                                                        <button
                                                            onClick={() => msg.studentId && handleAdminReply(msg.studentId, msg.id)}
                                                            disabled={!adminReplyText.trim()}
                                                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-bold"
                                                        >
                                                            إرسال الرد
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setReplyingToMessageId(msg.id)}
                                                    className="mt-2 text-amber-500 hover:text-amber-600 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <Send size={14} />
                                                    رد على الطالب
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Message Modal */}
                {messageModal.isOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pointer-events-auto">
                        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                                إرسال رسالة للطالب: <span className="text-amber-500">{messageModal.userName}</span>
                            </h3>
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                rows={4}
                                placeholder="اكتب رسالتك هنا..."
                                className="w-full px-4 py-3 border rounded-xl dark:bg-dark-bg dark:border-gray-700 outline-none focus:ring-2 focus:ring-amber-500 mb-4 text-gray-900 dark:text-gray-100"
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setMessageModal({ isOpen: false, userId: '', userName: '' })}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleSendMessageToUser}
                                    disabled={!messageText.trim() || sendingMessage}
                                    className="px-6 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {sendingMessage ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={16} />}
                                    إرسال
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Student Details Modal */}
                {selectedStudent && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 pointer-events-auto backdrop-blur-sm">
                        <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col overflow-hidden">

                            {/* Header */}
                            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={selectedStudent.avatar || `https://ui-avatars.com/api/?name=${selectedStudent.name}&background=random`}
                                        alt={selectedStudent.name}
                                        className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-700 shadow-md"
                                    />
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedStudent.name}</h3>
                                        <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getUserLevel(selectedStudent.totalTimeSpent || 0).color}`}>
                                                {getUserLevel(selectedStudent.totalTimeSpent || 0).label}
                                            </span>
                                            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                                                🕒 {(selectedStudent.totalTimeSpent || 0)} دقيقة
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b dark:border-gray-700 px-6 pt-2">
                                <button
                                    onClick={() => setActiveDetailTab('conversations')}
                                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeDetailTab === 'conversations' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    <MessageCircle size={18} />
                                    المحادثات ({studentDetails?.sessions?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveDetailTab('quizzes')}
                                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeDetailTab === 'quizzes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Brain size={18} />
                                    الاختبارات ({studentDetails?.quizzes?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveDetailTab('checklists')}
                                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeDetailTab === 'checklists' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Check size={18} />
                                    قوائم المهام ({studentDetails?.checklists?.length || 0})
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-dark-bg/50">
                                {loadingDetails ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-amber-500" />
                                        <p>جاري تحميل سجلات الطالب...</p>
                                    </div>
                                ) : !studentDetails ? (
                                    <div className="text-center text-gray-500 py-10">لا توجد بيانات للعرض</div>
                                ) : (
                                    <>
                                        {/* Conversations Tab */}
                                        {activeDetailTab === 'conversations' && (
                                            <div className="space-y-4">
                                                {studentDetails.sessions.length === 0 ? (
                                                    <div className="text-center py-10 text-gray-400">لا توجد محادثات سابقة</div>
                                                ) : (
                                                    studentDetails.sessions.map((session: any) => (
                                                        <div key={session.id} className="bg-white dark:bg-dark-surface p-4 rounded-xl border dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-bold text-gray-800 dark:text-gray-200 line-clamp-1">
                                                                    {session.title || "محادثة بدون عنوان"}
                                                                </h4>
                                                                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                                                    {session.timestamp ? new Date(session.timestamp).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                                                {session.lastMessage || session.preview || "لا توجد معاينة"}
                                                            </p>
                                                            <div className="mt-3 flex justify-end">
                                                                <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                                                                    {session.messagesCount || 0} رسالة
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* Quizzes Tab */}
                                        {activeDetailTab === 'quizzes' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {studentDetails.quizzes.length === 0 ? (
                                                    <div className="col-span-full text-center py-10 text-gray-400">لا توجد اختبارات سابقة</div>
                                                ) : (
                                                    studentDetails.quizzes.map((quiz: any) => (
                                                        <div key={quiz.id} className="bg-white dark:bg-dark-surface p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className={`text-xs px-2 py-1 rounded-lg font-bold ${(quiz.score / quiz.totalQuestions) >= 0.8 ? 'bg-green-100 text-green-700' :
                                                                        (quiz.score / quiz.totalQuestions) >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {Math.round((quiz.score / quiz.totalQuestions) * 100)}%
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {quiz.timestamp ? new Date(quiz.timestamp.seconds * 1000).toLocaleDateString('ar-EG') : 'N/A'}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">{quiz.topic || "موضوع غير محدد"}</h4>
                                                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-2">
                                                                <span>🎯 {quiz.score}/{quiz.totalQuestions} صحيح</span>
                                                                <span>⚡ {quiz.difficulty || "متوسط"}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* Checklists Tab */}
                                        {activeDetailTab === 'checklists' && (
                                            <div className="space-y-4">
                                                {studentDetails.checklists.length === 0 ? (
                                                    <div className="text-center py-10 text-gray-400">لا توجد قوائم مهام</div>
                                                ) : (
                                                    studentDetails.checklists.map((list: any) => (
                                                        <div key={list.id} className="bg-white dark:bg-dark-surface p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-bold text-gray-800 dark:text-gray-200">{list.title}</h4>
                                                                {list.isCompleted && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">مكتملة</span>}
                                                            </div>
                                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{list.summary}</p>
                                                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                                                                <span>📅 {list.timestamp ? new Date(list.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                                                <span>⏱️ {list.estimatedTime}</span>
                                                                <span>📝 {list.items?.length || 0} مهام</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* Footer */}
                <div className="mt-8 p-4 border-t border-gray-200 dark:border-gray-800 text-center">
                    <p className="text-xs text-gray-400">PARABOT Admin Dashboard &copy; {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
