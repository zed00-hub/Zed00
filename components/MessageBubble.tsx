import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { UserIcon, ZGLogo } from './Icons';
import QuizResultBubble from './QuizResultBubble';
import { Edit2, Copy, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface MessageBubbleProps {
    msg: Message;
    onEdit?: (messageId: string, newContent: string) => void;
    onNavigateVersion?: (messageId: string, direction: 'prev' | 'next') => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, onEdit, onNavigateVersion }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(msg.content);
    const [copied, setCopied] = useState(false);

    // Check if this is a quiz result message
    const isQuizResult = msg.type === 'quiz_result' && msg.quizResultData;

    // Copy to clipboard handler
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(msg.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Handle edit submit
    const handleEditSubmit = () => {
        if (editedText.trim() && editedText !== msg.content && onEdit) {
            onEdit(msg.id, editedText.trim());
        }
        setIsEditing(false);
    };

    // Handle edit cancel
    const handleEditCancel = () => {
        setEditedText(msg.content);
        setIsEditing(false);
    };

    // Calculate version info for navigation
    const totalVersions = msg.editedVersions ? msg.editedVersions.length : 0;
    const currentVersion = msg.currentVersionIndex ?? 0;
    const hasMultipleVersions = totalVersions > 1;

    return (
        <div
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-4 duration-500 group`}
        >
            {/* Avatar */}
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden transition-transform hover:scale-110 ${msg.role === 'user'
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white ring-2 ring-indigo-200/50'
                : 'bg-gradient-to-br from-medical-100 to-medical-200 dark:from-medical-900/40 dark:to-medical-800/40 ring-2 ring-medical-200/50 dark:ring-medical-800/50'
                }`}>
                {msg.role === 'user' ? <UserIcon /> : <div className="scale-75"><ZGLogo /></div>}
            </div>

            {/* Bubble */}
            <div className="flex-1 flex flex-col gap-2">
                <div className={`max-w-[95%] md:max-w-[85%] rounded-3xl shadow-xl backdrop-blur-sm relative ${isQuizResult
                    ? 'p-0 overflow-hidden'
                    : `p-5 ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-md shadow-indigo-200/50 dark:shadow-indigo-900/30'
                        : 'bg-white/90 dark:bg-dark-surface/90 text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50 rounded-bl-md shadow-gray-200/50 dark:shadow-gray-900/30'
                    }`
                    }`}>

                    {/* Quiz Result Message */}
                    {isQuizResult && msg.quizResultData && (
                        <QuizResultBubble data={msg.quizResultData} />
                    )}

                    {/* Regular Message Content */}
                    {!isQuizResult && (
                        <>
                            {/* Attachments within Message Bubble */}
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-3 mb-4">
                                    {msg.attachments.map((imgSrc, idx) => (
                                        <div key={idx} className="relative group">
                                            <img
                                                src={imgSrc}
                                                alt="مرفق"
                                                className="max-h-64 rounded-xl border-2 border-white/30 dark:border-gray-600/30 shadow-lg object-contain bg-black/5 dark:bg-white/5 hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Edit Mode */}
                            {isEditing ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={editedText}
                                        onChange={(e) => setEditedText(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-y"
                                        dir="auto"
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={handleEditCancel}
                                            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            onClick={handleEditSubmit}
                                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
                                        >
                                            <Check className="w-4 h-4" />
                                            حفظ
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Normal Display */}
                                    {msg.role === 'model' ? (
                                        <div
                                            dir="auto"
                                            className="markdown-content text-sm md:text-base leading-relaxed"
                                        >
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    // Custom styling for clarity
                                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-medical-700 dark:text-medical-400 mt-4 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-medical-600 dark:text-medical-400 mt-4 mb-2" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-3 mb-1" {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-3 text-gray-700 dark:text-gray-300" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700" {...props} />,
                                                    li: ({ node, ...props }) => <li className="text-gray-700 dark:text-gray-300" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold text-medical-800 dark:text-medical-300" {...props} />,
                                                    blockquote: ({ node, ...props }) => <blockquote className="border-r-4 border-medical-400 pr-4 py-1 my-2 bg-gray-50 dark:bg-gray-800 italic text-gray-600 dark:text-gray-400 rounded-r" {...props} />,
                                                    code: ({ node, ...props }) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-red-500 font-mono text-xs" {...props} />,
                                                    table: ({ node, ...props }) => (
                                                        <div className="overflow-x-auto my-4">
                                                            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow-sm" {...props} />
                                                        </div>
                                                    ),
                                                    thead: ({ node, ...props }) => <thead className="bg-medical-100 dark:bg-medical-900/40" {...props} />,
                                                    tbody: ({ node, ...props }) => <tbody {...props} />,
                                                    tr: ({ node, ...props }) => <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" {...props} />,
                                                    th: ({ node, ...props }) => <th className="px-4 py-2 text-left font-bold text-medical-800 dark:text-medical-300 border border-gray-300 dark:border-gray-600" {...props} />,
                                                    td: ({ node, ...props }) => <td className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600" {...props} />,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap" dir="auto">{msg.content}</p>
                                    )}
                                    {msg.isError && (
                                        <p className="text-xs text-red-200 mt-2 border-t border-red-400/30 pt-1">
                                            Échec de l'envoi / فشل الإرسال
                                        </p>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Action Buttons - Show on hover or when edited */}
                {!isQuizResult && !isEditing && (
                    <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                        {/* Copy Button */}
                        <button
                            onClick={handleCopy}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all hover:scale-110"
                            title="نسخ"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Edit Button - Only for user messages */}
                        {msg.role === 'user' && onEdit && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all hover:scale-110"
                                title="تعديل"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        )}

                        {/* Version Navigator - Only for model messages with multiple versions */}
                        {msg.role === 'model' && hasMultipleVersions && onNavigateVersion && (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
                                <button
                                    onClick={() => onNavigateVersion(msg.id, 'prev')}
                                    disabled={currentVersion <= 0}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="الإجابة السابقة"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
                                    {currentVersion + 1} / {totalVersions}
                                </span>
                                <button
                                    onClick={() => onNavigateVersion(msg.id, 'next')}
                                    disabled={currentVersion >= totalVersions - 1}
                                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="الإجابة التالية"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Edited Indicator */}
                        {msg.isEdited && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                تم التعديل
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(MessageBubble);

