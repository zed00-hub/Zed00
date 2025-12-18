import React, { useState, useEffect, useRef } from 'react';
import { FileContext, MindMapSession } from '../../types';
import { saveMindMapToFirestore } from '../../services/notebookService';
import { generateMindMap, generateResponseStream } from '../../services/geminiService';
import { transformMarkdownToNode } from '../../utils/markmapHelper';
import { Markmap } from 'markmap-view';
import { LoadingIcon } from '../Icons';
import { BookOpen, FileText, Upload, ArrowLeft, Share2, Database, MessageSquare, ChevronLeft, X } from 'lucide-react';
import { loadCoursesFromFirestore, CourseFile } from '../../services/coursesService';
import { extractTextFromFile } from '../../utils/fileHelpers';

interface NotebookContainerProps {
    files: FileContext[];
    activeSession?: MindMapSession | null;
    onSessionUpdate?: (session: MindMapSession | null) => void;
    userId?: string;
}

const NotebookContainer: React.FC<NotebookContainerProps> = ({
    files,
    activeSession,
    onSessionUpdate,
    userId
}) => {
    const [sourceType, setSourceType] = useState<'upload' | 'database' | 'text'>('upload');
    const [topic, setTopic] = useState('');
    const [selectedFileId, setSelectedFileId] = useState('');
    const [dbCourses, setDbCourses] = useState<CourseFile[]>([]);
    const [customText, setCustomText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Chat state
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const mmRef = useRef<Markmap | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const courses = await loadCoursesFromFirestore();
                setDbCourses(courses);
            } catch (e) {
                console.error("Failed to load DB courses", e);
            }
        };
        fetchCourses();
    }, []);

    useEffect(() => {
        if (activeSession && svgRef.current) {
            if (mmRef.current) {
                mmRef.current.destroy();
            }
            try {
                const data = transformMarkdownToNode(activeSession.markdown);
                mmRef.current = Markmap.create(svgRef.current, undefined, data as any);
                mmRef.current.fit();
            } catch (err) {
                console.error("Markmap rendering error:", err);
            }
        }
    }, [activeSession]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        try {
            const text = await extractTextFromFile(file);
            setCustomText(text);
            if (!topic) setTopic(file.name.split('.')[0]);
        } catch (err) {
            setError("فشل استخراج النص من الملف.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!topic && !selectedFileId && !customText) {
            setError("يرجى اختيار موضوع، ملف، أو إدخال نص.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let contentToProcess = customText;
            let finalTopic = topic;

            if (sourceType === 'database' && selectedFileId) {
                const course = dbCourses.find(c => c.id === selectedFileId);
                if (course) {
                    contentToProcess = course.content;
                    if (!finalTopic) finalTopic = course.name;
                }
            }

            if (!contentToProcess && topic) {
                contentToProcess = `Topic: ${topic}. Please generate a comprehensive mind map about this topic using your internal knowledge.`;
            }

            const generatedMarkdown = await generateMindMap(contentToProcess, finalTopic);

            const newSession: MindMapSession = {
                id: Date.now().toString(),
                title: finalTopic || 'Mind Map',
                markdown: generatedMarkdown,
                timestamp: Date.now(),
                topic: finalTopic,
                userId: userId || '',
                sourceContent: contentToProcess
            };

            if (onSessionUpdate) {
                onSessionUpdate(newSession);
            }

            if (userId) {
                await saveMindMapToFirestore(userId, newSession);
            }
        } catch (err: any) {
            console.error(err);
            setError("فشل إنشاء المخطط الذهني. حاول مرة أخرى.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChat = async () => {
        if (!chatInput.trim() || !activeSession?.sourceContent) return;

        const userMsg = { role: 'user' as const, content: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            let fullResponse = '';
            await generateResponseStream(
                `Based on the provided lesson text, please answer the user's question. Focus strictly on the content provided or related medical facts. \n\nLesson Source: ${activeSession.sourceContent}\n\nQuestion: ${chatInput}`,
                [],
                chatMessages.map(m => ({ id: Math.random().toString(), role: m.role, content: m.content, timestamp: Date.now() })),
                (chunk) => {
                    fullResponse += chunk;
                }
            );
            setChatMessages(prev => [...prev, { role: 'model', content: fullResponse }]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsChatLoading(false);
        }
    };

    if (activeSession) {
        return (
            <div className="h-full flex bg-slate-50 dark:bg-dark-bg relative overflow-hidden">
                {/* Sidebar / Chat & Source Panel */}
                <div className={`h-full bg-white dark:bg-dark-surface border-l border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col z-20 ${isSidebarOpen ? 'w-full md:w-96 shadow-xl' : 'w-0 overflow-hidden'}`}>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                            المساعد الذكي / المحتوى
                        </h3>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2"> <X size={20} /> </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                        {chatMessages.map((m, i) => (
                            <div key={i} className={`p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-purple-100 dark:bg-purple-900/30 ml-4' : 'bg-gray-100 dark:bg-gray-800 mr-4'}`}>
                                <p className="font-bold mb-1 text-[10px] text-gray-500">{m.role === 'user' ? 'أنت' : 'ZED'}</p>
                                <p className="whitespace-pre-wrap">{m.content}</p>
                            </div>
                        ))}
                        {isChatLoading && <LoadingIcon />}

                        <div className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mt-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">النص الأصلي</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-[10]">
                                {activeSession.sourceContent}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                                placeholder="اسأل عن المخطط..."
                                className="w-full p-3 rounded-xl border dark:bg-dark-bg border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none text-right"
                            />
                            <button onClick={handleChat} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-lg">
                                <ChevronLeft size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Side */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <MessageSquare size={20} className="text-purple-600" />
                            </button>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 truncate">
                                {activeSession.title}
                            </h2>
                        </div>
                        <button onClick={() => onSessionUpdate && onSessionUpdate(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline">عودة</span>
                        </button>
                    </div>

                    <div className="flex-1 relative bg-white dark:bg-dark-bg">
                        <svg ref={svgRef} className="w-full h-full block" />
                        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                            <button onClick={() => mmRef.current?.fit()} className="p-3 bg-white dark:bg-dark-surface shadow-xl rounded-full border border-gray-200 dark:border-gray-700 text-purple-600">
                                <span className="font-bold">FIT</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center animate-fadeIn bg-slate-50 dark:bg-dark-bg">
            <div className="max-w-4xl w-full grid md:grid-cols-[1fr_250px] gap-8">
                <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-xl p-6 md:p-10 border border-gray-100 dark:border-gray-700">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
                            <span className="text-4xl">🧠</span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">NotebookLM Mind Map</h1>
                        <p className="text-gray-500 dark:text-gray-400">حوّل أي مادة دراسية إلى خريطة ذهنية تفاعلية.</p>
                    </div>

                    <div className="space-y-8">
                        <div className="flex p-1 bg-gray-100 dark:bg-dark-bg rounded-2xl gap-1">
                            <button onClick={() => setSourceType('upload')} className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${sourceType === 'upload' ? 'bg-white dark:bg-gray-800 shadow-sm text-purple-600' : 'text-gray-500'}`}>
                                <Upload size={20} /> <span className="text-xs font-bold">رفع ملف</span>
                            </button>
                            <button onClick={() => setSourceType('database')} className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${sourceType === 'database' ? 'bg-white dark:bg-gray-800 shadow-sm text-purple-600' : 'text-gray-500'}`}>
                                <Database size={20} /> <span className="text-xs font-bold">المقرر</span>
                            </button>
                            <button onClick={() => setSourceType('text')} className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${sourceType === 'text' ? 'bg-white dark:bg-gray-800 shadow-sm text-purple-600' : 'text-gray-500'}`}>
                                <FileText size={20} /> <span className="text-xs font-bold">نص حر</span>
                            </button>
                        </div>

                        <div className="animate-fadeIn min-h-[120px]">
                            {sourceType === 'upload' && (
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all group">
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt" />
                                    <Upload size={24} className="mx-auto mb-3 text-purple-600 group-hover:scale-110 transition-transform" />
                                    <p className="font-bold text-gray-700 dark:text-gray-300">انقر لرفع ملف (PDF, Docx, Text)</p>
                                    {customText && <div className="mt-4 text-xs bg-green-100 text-green-700 p-2 rounded-lg inline-block">✓ تم تحميل المحتوى</div>}
                                </div>
                            )}

                            {sourceType === 'database' && (
                                <select value={selectedFileId} onChange={(e) => setSelectedFileId(e.target.value)} className="w-full p-4 rounded-xl border dark:bg-gray-800 text-right">
                                    <option value="">-- اختر درساً --</option>
                                    {dbCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            )}

                            {sourceType === 'text' && (
                                <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={5} placeholder="ألصق النص هنا..." className="w-full p-4 rounded-xl border dark:bg-gray-800 text-right" />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">عنوان المخطط</label>
                            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثلاً: الخلية..." className="w-full p-4 rounded-xl border dark:bg-gray-800/50 text-right" />
                        </div>

                        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm">{error}</div>}

                        <button onClick={handleGenerate} disabled={isLoading} className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3">
                            {isLoading ? <><LoadingIcon /><span>جاري المعالجة...</span></> : <><span>إنشاء المخطط</span><ChevronLeft size={24} /></>}
                        </button>
                    </div>
                </div>

                <div className="hidden md:block space-y-4">
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold mb-2">💡 نصيحة</h3>
                        <p className="text-xs text-gray-500">ارفع ملف PDF الدرس الخاص بك وسيقوم الذكاء الاصطناعي ببناء الهيكل بالكامل.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotebookContainer;
