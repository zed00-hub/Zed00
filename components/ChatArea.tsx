import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { BotIcon, UserIcon, SendIcon, LoadingIcon, AttachIcon, FileIcon, ZGLogo, SunIcon, MoonIcon, XIcon } from './Icons';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onToggleSidebar: () => void;
  onUpload: (files: FileList | null) => void;
  pendingAttachments?: string[];
  onRemoveAttachment?: (index: number) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  messages, 
  input, 
  setInput, 
  isLoading, 
  onSend,
  onToggleSidebar,
  onUpload,
  pendingAttachments = [],
  onRemoveAttachment,
  isDarkMode,
  toggleTheme
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, pendingAttachments]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpload(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-dark-bg relative transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50 flex items-center justify-between px-5 shrink-0 transition-colors duration-300 shadow-sm">
        <div className="flex items-center gap-3">
          <ZGLogo />
          <h1 className="font-bold text-gray-800 dark:text-dark-text text-base">Paramedical AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/80 rounded-xl transition-all hover:scale-110 active:scale-95"
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button 
            onClick={onToggleSidebar}
            className="p-2.5 text-medical-600 hover:bg-medical-50 dark:text-medical-400 dark:hover:bg-gray-700/80 rounded-xl relative transition-all hover:scale-110 active:scale-95"
          >
             <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-lg" />
             <FileIcon /> 
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-gradient-to-b from-slate-50/50 to-white dark:from-dark-bg dark:to-slate-900/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 space-y-6 px-4">
            <div className="mb-4 transform hover:scale-110 transition-transform duration-300 animate-pulse">
              <div className="p-4 bg-gradient-to-br from-medical-100 to-medical-200 dark:from-medical-900/30 dark:to-medical-800/30 rounded-2xl shadow-lg">
                <ZGLogo />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">السلام عليكم</h3>
              <p className="max-w-lg mx-auto leading-relaxed text-gray-600 dark:text-gray-300 text-base">
                أنا مساعدك الدراسي. اسألني عن الدروس والمحاضرات.
                <br />
                <span className="text-sm text-medical-600 dark:text-medical-400 font-semibold mt-2 inline-block">
                  أجيبك بدقة مع شرح المصطلحات بالفرنسية والعربية.
                </span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-10 w-full max-w-2xl">
              <button onClick={() => setInput("Explique-moi le système osseux")} className="p-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 dark:hover:border-medical-500 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-left dir-ltr group">
                <span className="text-2xl group-hover:scale-110 transition-transform inline-block mr-2">🦴</span>
                <span className="font-medium">Explique-moi le système osseux</span>
              </button>
              <button onClick={() => setInput("Quelles sont les abréviations en Cardiologie ?")} className="p-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 dark:hover:border-medical-500 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-left dir-ltr group">
                <span className="text-2xl group-hover:scale-110 transition-transform inline-block mr-2">❤️</span>
                <span className="font-medium">Quelles sont les abréviations en Cardiologie ?</span>
              </button>
              <button onClick={() => setInput("ما هي مكونات الخلية؟")} className="p-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 dark:hover:border-medical-500 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-right group">
                <span className="text-2xl group-hover:scale-110 transition-transform inline-block ml-2">🧬</span>
                <span className="font-medium">ما هي مكونات الخلية؟</span>
              </button>
              <button onClick={() => setInput("أعطني ملخصاً عن المصطلحات الطبية")} className="p-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 dark:hover:border-medical-500 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-right group">
                <span className="text-2xl group-hover:scale-110 transition-transform inline-block ml-2">📝</span>
                <span className="font-medium">أعطني ملخصاً عن المصطلحات الطبية</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
            >
              {/* Avatar */}
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden transition-transform hover:scale-110 ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white ring-2 ring-indigo-200/50' 
                  : 'bg-gradient-to-br from-medical-100 to-medical-200 dark:from-medical-900/40 dark:to-medical-800/40 ring-2 ring-medical-200/50 dark:ring-medical-800/50'
              }`}>
                {msg.role === 'user' ? <UserIcon /> : <div className="scale-75"><ZGLogo /></div> }
              </div>

              {/* Bubble */}
              <div className={`max-w-[95%] md:max-w-[85%] rounded-3xl p-5 shadow-xl backdrop-blur-sm ${
                msg.role === 'user' 
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
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-medical-700 dark:text-medical-400 mt-4 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-medical-600 dark:text-medical-400 mt-4 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mt-3 mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 text-gray-700 dark:text-gray-300" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-700 dark:text-gray-300" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-medical-800 dark:text-medical-300" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-r-4 border-medical-400 pr-4 py-1 my-2 bg-gray-50 dark:bg-gray-800 italic text-gray-600 dark:text-gray-400 rounded-r" {...props} />,
                        code: ({node, ...props}) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-red-500 font-mono text-xs" {...props} />,
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow-sm" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-medical-100 dark:bg-medical-900/40" {...props} />,
                        tbody: ({node, ...props}) => <tbody {...props} />,
                        tr: ({node, ...props}) => <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" {...props} />,
                        th: ({node, ...props}) => <th className="px-4 py-2 text-left font-bold text-medical-800 dark:text-medical-300 border border-gray-300 dark:border-gray-600" {...props} />,
                        td: ({node, ...props}) => <td className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600" {...props} />,
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
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-medical-100 to-medical-200 dark:from-medical-900/40 dark:to-medical-800/40 ring-2 ring-medical-200/50 dark:ring-medical-800/50 shadow-lg">
               <div className="scale-75"><ZGLogo /></div>
            </div>
            <div className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-3xl rounded-bl-md p-5 shadow-xl flex items-center gap-4">
               <LoadingIcon />
               <span className="text-sm text-gray-600 dark:text-gray-300 font-medium animate-pulse">يتم تحليل الدروس وإعداد الإجابة...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 transition-colors duration-300 shadow-lg">
        
        {/* Pending Attachments Preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex gap-3 mb-3 overflow-x-auto py-2 scrollbar-hide">
            {pendingAttachments.map((img, index) => (
              <div key={index} className="relative shrink-0 group">
                <img src={img} alt="preview" className="h-20 w-20 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-md hover:scale-105 transition-transform" />
                <button 
                  onClick={() => onRemoveAttachment && onRemoveAttachment(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 hover:bg-red-600 transition-all ring-2 ring-white dark:ring-gray-800"
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="max-w-4xl mx-auto flex items-end gap-3 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 border-2 border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-3 focus-within:ring-4 focus-within:ring-medical-500/20 focus-within:border-medical-500 transition-all shadow-lg hover:shadow-xl">
          
          {/* Student Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 text-gray-500 hover:text-medical-600 dark:text-gray-400 dark:hover:text-medical-400 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm"
            title="Joindre un fichier / إرفاق ملف"
          >
            <AttachIcon />
          </button>
          <input 
              type="file" 
              multiple 
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              ref={fileInputRef}
              className="hidden" 
              onChange={handleFileChange}
            />

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            dir="auto"
            placeholder="Pose ta question ici... / اطرح سؤالك هنا"
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-36 min-h-[48px] py-3.5 px-4 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed text-base"
            rows={1}
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
          
          <button 
            onClick={onSend}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
            className={`p-3.5 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${
              (input.trim() || pendingAttachments.length > 0) && !isLoading
                ? 'bg-gradient-to-br from-medical-600 to-medical-700 text-white hover:from-medical-700 hover:to-medical-800 hover:scale-110 active:scale-95 shadow-medical-500/30' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isLoading ? <LoadingIcon /> : <SendIcon />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3 font-medium">
           IA Paramédicale - Vérifiez toujours les informations médicales.
        </p>
        <p className="text-center text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
          By: Ziad
        </p>
      </div>
    </main>
  );
};

export default ChatArea;