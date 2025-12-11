import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { UserIcon, ZGLogo } from './Icons';

interface MessageBubbleProps {
    msg: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg }) => {
    return (
        <div
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
        >
            {/* Avatar */}
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden transition-transform hover:scale-110 ${msg.role === 'user'
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white ring-2 ring-indigo-200/50'
                : 'bg-gradient-to-br from-medical-100 to-medical-200 dark:from-medical-900/40 dark:to-medical-800/40 ring-2 ring-medical-200/50 dark:ring-medical-800/50'
                }`}>
                {msg.role === 'user' ? <UserIcon /> : <div className="scale-75"><ZGLogo /></div>}
            </div>

            {/* Bubble */}
            <div className={`max-w-[95%] md:max-w-[85%] rounded-3xl p-5 shadow-xl backdrop-blur-sm ${msg.role === 'user'
                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-md shadow-indigo-200/50 dark:shadow-indigo-900/30'
                : 'bg-white/90 dark:bg-dark-surface/90 text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50 rounded-bl-md shadow-gray-200/50 dark:shadow-gray-900/30'
                }`}>
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
            </div>
        </div>
    );
};

export default memo(MessageBubble);
