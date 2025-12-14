import React, { useState, useEffect } from 'react';
import { ChecklistResponse, ChecklistItem, FileContext, ChecklistSession } from '../../types';
import { generateChecklist } from '../../services/geminiService';
import { loadCoursesFromFirestore, CourseFile } from '../../services/coursesService';
import { saveChecklistToFirestore } from '../../services/checklistService';
import { LoadingIcon } from '../Icons';
import { ClipboardList, Upload, Library, Check, Clock, Lightbulb, ChevronDown, ChevronUp, RotateCcw, Sparkles } from 'lucide-react';
import { fileToBase64 } from '../../utils/fileHelpers';
import { extractTextFromPDF } from '../../utils/pdfUtils';
import { extractTextFromDocx } from '../../utils/docxUtils';
import { INITIAL_COURSES } from '../../data/courses';

interface ChecklistContainerProps {
    initialSession?: ChecklistSession;
    onSaveSession?: (session: ChecklistSession) => void;
    userId?: string;
    onNewChecklist?: () => void;
}

const ChecklistContainer: React.FC<ChecklistContainerProps> = ({ initialSession, onSaveSession, userId, onNewChecklist }) => {
    // Source selection
    const [sourceType, setSourceType] = useState<'library' | 'upload'>('library');

    // Library state
    const [courses, setCourses] = useState<CourseFile[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);

    // Upload state
    const [uploadedContent, setUploadedContent] = useState<string>('');
    const [uploadedFileName, setUploadedFileName] = useState<string>('');
    const [isExtractingFile, setIsExtractingFile] = useState(false);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Checklist state
    const [checklist, setChecklist] = useState<ChecklistResponse | null>(null);
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // Load initial session if provided
    useEffect(() => {
        if (initialSession) {
            setChecklist(initialSession.checklist);
            setChecklistItems(initialSession.checklist.items);
            setCurrentSessionId(initialSession.id);
            // Expand all on load
            const allIds = new Set<string>();
            const collectIds = (items: ChecklistItem[]) => {
                items.forEach(item => {
                    allIds.add(item.id);
                    if (item.subItems) collectIds(item.subItems);
                });
            };
            collectIds(initialSession.checklist.items);
            setExpandedItems(allIds);
        } else {
            // Reset if no session (New Checklist Mode)
            setChecklist(null);
            setChecklistItems([]);
            setCurrentSessionId(null);
            setSourceType('library');
            setUploadedContent('');
            setUploadedFileName('');
            setSelectedCourseId('');
        }
    }, [initialSession]);

    // Load courses from database on mount
    useEffect(() => {
        const loadCourses = async () => {
            setIsLoadingCourses(true);
            try {
                const loadedCourses = await loadCoursesFromFirestore();

                // Match INITIAL_COURSES to CourseFile type
                const formattedInitialCourses: CourseFile[] = INITIAL_COURSES.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    content: c.content || '', // Ensure content is string
                    size: c.size,
                    category: c.category || 'other',
                    createdAt: Date.now() // Default timestamp for static files
                }));

                // Merge INITIAL_COURSES with loadedCourses, avoiding duplicates by ID
                const initialIds = new Set(formattedInitialCourses.map(c => c.id));
                const uniqueLoadedCourses = loadedCourses.filter(c => !initialIds.has(c.id));
                const allCourses = [...formattedInitialCourses, ...uniqueLoadedCourses];

                // Filter out laws, legislation, and official journals
                const filteredCourses = allCourses.filter(course => {
                    const isLaw = course.category === 'laws' || course.category === 'legislation';
                    const isOfficialJournal = course.name.toLowerCase().includes('journal officiel') ||
                        course.name.includes('الجريدة الرسمية');
                    return !isLaw && !isOfficialJournal;
                });

                setCourses(filteredCourses);
            } catch (err) {
                console.error('Error loading courses:', err);
                // Fallback to initial courses if loading fails
                const fallbackCourses: CourseFile[] = INITIAL_COURSES.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    content: c.content || '',
                    size: c.size,
                    category: c.category || 'other',
                    createdAt: Date.now()
                }));

                setCourses(fallbackCourses.filter(course => {
                    const isLaw = course.category === 'laws' || course.category === 'legislation';
                    const isOfficialJournal = course.name.toLowerCase().includes('journal officiel') ||
                        course.name.includes('الجريدة الرسمية');
                    return !isLaw && !isOfficialJournal;
                }));
            } finally {
                setIsLoadingCourses(false);
            }
        };
        loadCourses();
    }, []);

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtractingFile(true);
        setError(null);

        try {
            let text = "";
            if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
                text = await extractTextFromPDF(file);
            } else if (file.name.endsWith('.docx') || file.type.includes('wordprocessing')) {
                text = await extractTextFromDocx(file);
            } else {
                text = await file.text();
            }

            setUploadedContent(text);
            setUploadedFileName(file.name);
        } catch (err: any) {
            console.error('Error reading file:', err);
            setError(err.message || 'فشل قراءة الملف');
        } finally {
            setIsExtractingFile(false);
        }
        e.target.value = '';
    };

    // Generate checklist
    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setChecklist(null);

        try {
            let content = '';
            let title = '';

            if (sourceType === 'library') {
                const selectedCourse = courses.find(c => c.id === selectedCourseId);
                if (!selectedCourse || !selectedCourse.content) {
                    throw new Error('الرجاء اختيار درس من المكتبة');
                }
                content = selectedCourse.content;
                title = selectedCourse.name;
            } else {
                if (!uploadedContent) {
                    throw new Error('الرجاء رفع ملف أولاً');
                }
                content = uploadedContent;
                title = uploadedFileName.replace(/\.[^/.]+$/, "");
            }

            const result = await generateChecklist(content, title);
            setChecklist(result);
            setChecklistItems(result.items);

            // Create new session
            const newSessionId = Date.now().toString();
            setCurrentSessionId(newSessionId);

            const newSession: ChecklistSession = {
                id: newSessionId,
                title: result.title,
                createdAt: Date.now(),
                checklist: result,
                progress: 0,
                isFinished: false
            };

            // Save session
            if (userId && onSaveSession) {
                await saveChecklistToFirestore(userId, newSession);
                onSaveSession(newSession);
            }

            // Expand all items by default
            const allIds = new Set<string>();
            const collectIds = (items: ChecklistItem[]) => {
                items.forEach(item => {
                    allIds.add(item.id);
                    if (item.subItems) collectIds(item.subItems);
                });
            };
            collectIds(result.items);
            setExpandedItems(allIds);

        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء التوليد');
        } finally {
            setIsGenerating(false);
        }
    };

    // Calculate progress helper
    const calculateProgressFromItems = (items: ChecklistItem[]): number => {
        let total = 0;
        let completed = 0;

        const countItems = (list: ChecklistItem[]) => {
            list.forEach(item => {
                if (!item.subItems || item.subItems.length === 0) {
                    total++;
                    if (item.isCompleted) completed++;
                } else {
                    countItems(item.subItems);
                }
            });
        };

        countItems(items);
        return total === 0 ? 0 : Math.round((completed / total) * 100);
    };

    // Toggle item completion
    const toggleItemCompletion = (itemId: string, parentId?: string) => {
        const updateItems = (items: ChecklistItem[]): ChecklistItem[] => {
            return items.map(item => {
                if (item.id === itemId) {
                    const newCompleted = !item.isCompleted;
                    // If completing parent, complete all children
                    if (item.subItems && newCompleted) {
                        return {
                            ...item,
                            isCompleted: newCompleted,
                            subItems: item.subItems.map(sub => ({ ...sub, isCompleted: true }))
                        };
                    }
                    return { ...item, isCompleted: newCompleted };
                }
                if (item.subItems) {
                    const updatedSubItems = updateItems(item.subItems);
                    // If all children are completed, mark parent as completed
                    const allChildrenCompleted = updatedSubItems.every(sub => sub.isCompleted);
                    return {
                        ...item,
                        subItems: updatedSubItems,
                        isCompleted: allChildrenCompleted
                    };
                }
                return item;
            });
        };

        const newItems = updateItems(checklistItems);
        setChecklistItems(newItems);

        // Update session
        if (checklist && currentSessionId && userId) {
            const currentProgress = calculateProgressFromItems(newItems);
            const updatedSession: ChecklistSession = {
                id: currentSessionId,
                title: checklist.title,
                createdAt: initialSession?.createdAt || Date.now(), // Preserve timestamp if exists
                lastUpdated: Date.now(),
                checklist: { ...checklist, items: newItems },
                progress: currentProgress,
                isFinished: currentProgress === 100
            };

            saveChecklistToFirestore(userId, updatedSession);
            if (onSaveSession) onSaveSession(updatedSession);
        }
    };

    // Toggle item expansion
    const toggleExpand = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // Calculate progress
    const calculateProgress = (): number => {
        let total = 0;
        let completed = 0;

        const countItems = (items: ChecklistItem[]) => {
            items.forEach(item => {
                if (!item.subItems || item.subItems.length === 0) {
                    total++;
                    if (item.isCompleted) completed++;
                } else {
                    countItems(item.subItems);
                }
            });
        };

        countItems(checklistItems);
        return total === 0 ? 0 : Math.round((completed / total) * 100);
    };

    // Reset checklist
    const resetChecklist = () => {
        if (checklist) {
            setChecklistItems(checklist.items.map(item => ({
                ...item,
                isCompleted: false,
                subItems: item.subItems?.map(sub => ({ ...sub, isCompleted: false }))
            })));
        }
    };

    // Render checklist item
    const renderChecklistItem = (item: ChecklistItem, level: number = 0) => {
        const isExpanded = expandedItems.has(item.id);
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const progress = calculateProgress();

        return (
            <div key={item.id} className={`${level > 0 ? 'mr-6 border-r-2 border-gray-200 dark:border-gray-700 pr-4' : ''}`}>
                <div
                    className={`flex items-start gap-3 p-4 rounded-xl transition-all ${item.isCompleted
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50'
                        : 'bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700'
                        } ${level > 0 ? 'mt-2' : 'mb-3'}`}
                >
                    {/* Checkbox */}
                    <button
                        onClick={() => toggleItemCompletion(item.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${item.isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-teal-500'
                            }`}
                    >
                        {item.isCompleted && <Check className="w-4 h-4" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className={`font-medium text-sm sm:text-base ${item.isCompleted
                                ? 'text-green-700 dark:text-green-400 line-through'
                                : 'text-gray-800 dark:text-gray-200'
                                }`}>
                                {item.title}
                            </h4>
                            {hasSubItems && (
                                <button
                                    onClick={() => toggleExpand(item.id)}
                                    className="p-1 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                        {item.description && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                {item.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Sub-items */}
                {hasSubItems && isExpanded && (
                    <div className="mt-2">
                        {item.subItems!.map(subItem => renderChecklistItem(subItem, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const progress = calculateProgress();

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-3 sm:p-6 pb-24 sm:pb-10 max-w-4xl mx-auto">

            {/* Header */}
            <div className="text-center mb-6 sm:mb-8 animate-fadeIn">
                <div className="inline-flex p-3 sm:p-4 bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-full mb-4 shadow-sm border border-teal-200 dark:border-teal-700/50">
                    <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600 dark:text-teal-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 mb-2">
                    Chekiha
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-lg mx-auto px-4">
                    حول درسك إلى مهام واضحة | Transformez votre cours en tâches claires
                </p>
            </div>

            {/* Input Section - Only show if no checklist yet */}
            {!checklist && (
                <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-dark-border mb-8 animate-slideUp">

                    {/* Source Type Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            اختر مصدر الدرس
                        </label>
                        <div className="flex bg-gray-100 dark:bg-dark-bg p-1 rounded-xl">
                            <button
                                onClick={() => setSourceType('library')}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${sourceType === 'library'
                                    ? 'bg-white dark:bg-dark-surface text-teal-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                <Library className="w-4 h-4" />
                                <span>من المكتبة</span>
                            </button>
                            <button
                                onClick={() => setSourceType('upload')}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${sourceType === 'upload'
                                    ? 'bg-white dark:bg-dark-surface text-teal-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                <Upload className="w-4 h-4" />
                                <span>رفع ملف</span>
                            </button>
                        </div>
                    </div>

                    {/* Library Selection */}
                    {sourceType === 'library' && (
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                اختر الدرس من المكتبة
                            </label>
                            {isLoadingCourses ? (
                                <div className="flex items-center justify-center py-8 text-gray-500">
                                    <LoadingIcon />
                                    <span className="mr-2">جاري تحميل الدروس...</span>
                                </div>
                            ) : courses.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <Library className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>لا توجد دروس في المكتبة حالياً</p>
                                    <p className="text-sm">يمكنك رفع ملف بدلاً من ذلك</p>
                                </div>
                            ) : (
                                <select
                                    value={selectedCourseId}
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-bg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all dark:text-white"
                                    dir="rtl"
                                >
                                    <option value="">-- اختر درساً --</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} ({course.category || 'عام'})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Upload Section */}
                    {sourceType === 'upload' && (
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                رفع ملف (PDF, DOCX, TXT)
                            </label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt,.doc"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="file-upload"
                                    disabled={isExtractingFile}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadedContent
                                        ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/20'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-teal-400 bg-gray-50 dark:bg-dark-bg'
                                        }`}
                                >
                                    {isExtractingFile ? (
                                        <div className="flex flex-col items-center gap-2 text-gray-500">
                                            <LoadingIcon />
                                            <span>جاري استخراج المحتوى...</span>
                                        </div>
                                    ) : uploadedContent ? (
                                        <div className="flex flex-col items-center gap-2 text-teal-600 dark:text-teal-400 px-4 text-center">
                                            <Check className="w-10 h-10" />
                                            <span className="font-medium break-all line-clamp-2">{uploadedFileName}</span>
                                            <span className="text-sm text-gray-500">انقر لتغيير الملف</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                            <Upload className="w-10 h-10" />
                                            <span className="font-medium">اسحب الملف هنا أو انقر للرفع</span>
                                            <span className="text-sm">PDF, DOCX, TXT</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || (sourceType === 'library' && !selectedCourseId) || (sourceType === 'upload' && !uploadedContent)}
                        className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-xl font-bold shadow-lg shadow-teal-500/20 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <LoadingIcon />
                                <span>جاري إنشاء قائمة المهام...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                <span>أنشئ قائمة المهام</span>
                            </>
                        )}
                    </button>

                    {error && (
                        <p className="text-red-500 text-center text-sm mt-3">{error}</p>
                    )}
                </div>
            )}

            {/* Checklist Results */}
            {checklist && (
                <div className="animate-slideUp space-y-4 sm:space-y-6">

                    {/* Header with Progress */}
                    <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-0.5 sm:p-1 rounded-2xl shadow-xl">
                        <div className="bg-white dark:bg-dark-surface h-full rounded-xl p-4 sm:p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0 ml-2">
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-1 truncate">
                                        {checklist.title}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm line-clamp-2">
                                        {checklist.summary}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (onNewChecklist) onNewChecklist();
                                        else setChecklist(null);
                                    }}
                                    className="p-2 -mt-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title="إنشاء قائمة جديدة"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                                        التقدم
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400">
                                        {progress}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 sm:h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                                {checklist.estimatedTime && (
                                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{checklist.estimatedTime}</span>
                                    </div>
                                )}
                                <button
                                    onClick={resetChecklist}
                                    className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>إعادة تعيين</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Checklist Items */}
                    <div className="space-y-3">
                        {checklistItems.map(item => renderChecklistItem(item))}
                    </div>

                    {/* Tips Section */}
                    {checklist.tips && checklist.tips.length > 0 && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-5 sm:p-6 border border-amber-200 dark:border-amber-800/50">
                            <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2 text-sm sm:text-base">
                                <Lightbulb className="w-5 h-5 shrink-0" />
                                نصائح للمراجعة
                            </h3>
                            <ul className="space-y-2.5">
                                {checklist.tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-amber-700 dark:text-amber-200 text-sm">
                                        <span className="text-amber-500 mt-1">•</span>
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Completion Celebration */}
                    {progress === 100 && (
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 sm:p-8 text-center text-white animate-bounce-once shadow-lg shadow-green-500/30">
                            <div className="text-4xl sm:text-5xl mb-4">🎉</div>
                            <h3 className="text-xl sm:text-2xl font-bold mb-2">أحسنت! أكملت كل المهام</h3>
                            <p className="opacity-90 text-sm sm:text-base">استمر في التفوق والنجاح!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChecklistContainer;
