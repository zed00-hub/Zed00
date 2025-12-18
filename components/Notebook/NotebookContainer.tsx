import React, { useState, useEffect, useRef } from 'react';
import { FileContext } from '../../types';
import { MindMapSession, saveMindMapToFirestore } from '../../services/notebookService';
import { generateMindMap } from '../../services/geminiService';
import { transformMarkdownToNode } from '../../utils/markmapHelper';
import { Markmap } from 'markmap-view';
import { LoadingIcon } from '../Icons';
import { BookOpen, FileText, Upload, Save, ArrowLeft, Share2 } from 'lucide-react';

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
    const [topic, setTopic] = useState('');
    const [selectedFileId, setSelectedFileId] = useState('');
    const [customText, setCustomText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Markmap refs
    const svgRef = useRef<SVGSVGElement>(null);
    const mmRef = useRef<Markmap | null>(null);

    // Sync with active session
    useEffect(() => {
        if (activeSession && svgRef.current) {
            // Render the map
            if (mmRef.current) {
                mmRef.current.destroy();
            }
            const data = transformMarkdownToNode(activeSession.markdown);
            mmRef.current = Markmap.create(svgRef.current, undefined, data);
            mmRef.current.fit();
        }
    }, [activeSession]);

    const handleGenerate = async () => {
        if ((!topic && !selectedFileId && !customText)) {
            setError("يرجى اختيار موضوع، ملف، أو إدخال نص.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let contentToProcess = customText;
            let finalTopic = topic;

            if (selectedFileId) {
                const file = files.find(f => f.id === selectedFileId);
                if (file) {
                    if (file.content) {
                        contentToProcess = file.content;
                    }
                    if (!finalTopic) {
                        finalTopic = file.name;
                    }
                }
            }

            if (!contentToProcess && topic) {
                // If only topic is provided, we might want to generate entirely from training data
                // But generateMindMap expects content.
                // We can pass the topic as content and ask Gemini to generate info about it.
                contentToProcess = `Topic: ${topic}. Please generate a comprehensive mind map about this topic using your internal knowledge.`;
            }

            const generatedMarkdown = await generateMindMap(contentToProcess, finalTopic);

            const newSession: MindMapSession = {
                id: Date.now().toString(),
                title: finalTopic || 'Mind Map',
                markdown: generatedMarkdown,
                timestamp: Date.now(),
                topic: finalTopic,
                userId: userId || ''
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

    if (activeSession) {
        return (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-dark-bg relative">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-surface flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <span role="img" aria-label="brain">🧠</span>
                        {activeSession.title}
                    </h2>
                    <button
                        onClick={() => onSessionUpdate && onSessionUpdate(null)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <ArrowLeft size={20} />
                        <span>عودة</span>
                    </button>
                </div>

                {/* Map View */}
                <div className="flex-1 overflow-hidden relative bg-white dark:bg-dark-bg">
                    <svg ref={svgRef} className="w-full h-full block" />
                </div>
            </div>
        );
    }

    // Setup / Create Mode
    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center animate-fadeIn">
            <div className="max-w-2xl w-full bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600 dark:text-purple-400">
                        <span className="text-3xl">🧠</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        المخططات الذهنية الذكية
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        أدخل موضوعاً أو اختر ملفاً لإنشاء مخطط ذهني تفاعلي للمراجعة والحفظ.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Topic Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            عنوان أو موضوع الدرس
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="مثلاً: الجهاز الدوري، علم التشريح..."
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-right"
                        />
                    </div>

                    {/* File Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            اختر من ملفاتك (اختياري)
                        </label>
                        <select
                            value={selectedFileId}
                            onChange={(e) => setSelectedFileId(e.target.value)}
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-right"
                        >
                            <option value="">-- اختر ملفاً --</option>
                            {files.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex items-center justify-center py-2">
                        <div className="border-t border-gray-200 dark:border-gray-700 w-full absolute"></div>
                        <span className="bg-white dark:bg-dark-surface px-4 text-sm text-gray-400 relative z-10">أو</span>
                    </div>

                    {/* Custom Text Area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ألصق النص هنا
                        </label>
                        <textarea
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            rows={4}
                            placeholder="ألصق محتوى الدرس هنا..."
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-right resize-none"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || (!topic && !selectedFileId && !customText)}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <LoadingIcon />
                                <span>جاري الإنشاء...</span>
                            </>
                        ) : (
                            <>
                                <BookOpen size={24} />
                                <span>إنشاء المخطط الذهني</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotebookContainer;
