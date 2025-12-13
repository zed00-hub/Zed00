import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import { SendIcon, LoadingIcon, AttachIcon, FileIcon, ZGLogo, SunIcon, MoonIcon, XIcon } from './Icons';
import MessageBubble from './MessageBubble';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onStopGeneration: () => void;
  onToggleSidebar: () => void;
  onUpload: (files: FileList | null) => void;
  pendingAttachments?: string[];
  onRemoveAttachment?: (index: number) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onNavigateVersion?: (messageId: string, direction: 'prev' | 'next') => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  onStopGeneration,
  onToggleSidebar,
  onUpload,
  pendingAttachments = [],
  onRemoveAttachment,
  isDarkMode,
  toggleTheme,
  onEditMessage,
  onNavigateVersion
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
      <div className="md:hidden h-16 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-gray-200/50 dark:border-dark-border/50 flex items-center justify-between px-5 shrink-0 transition-colors duration-300 shadow-sm">
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
                أنا مساعدك الدراسي للسداسي الأول (S1). اسألني عن أي مادة!
                <br />
                <span className="text-sm text-medical-600 dark:text-medical-400 font-semibold mt-2 inline-block">
                  📚 مواد الجذع المشترك • 📝 اختبارات • 🧠 حيل حفظية
                </span>
              </p>
            </div>

            {/* S1 Subjects Grid */}
            <div className="w-full max-w-3xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">📖 اختر مادة للسؤال عنها:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <button onClick={() => setInput("اشرح لي مادة Anatomie-physiologie")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">🦴</span>
                  <span className="font-medium text-xs">Anatomie-physiologie</span>
                </button>
                <button onClick={() => setInput("اشرح لي مادة Terminologie médicale")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">📝</span>
                  <span className="font-medium text-xs">Terminologie médicale</span>
                </button>
                <button onClick={() => setInput("اشرح لي مادة Hygiène hospitalière")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">🧹</span>
                  <span className="font-medium text-xs">Hygiène hospitalière</span>
                </button>
                <button onClick={() => setInput("اشرح لي مادة Santé publique")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">🏥</span>
                  <span className="font-medium text-xs">Santé publique</span>
                </button>
                <button onClick={() => setInput("اشرح لي مادة Secourisme")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">🚑</span>
                  <span className="font-medium text-xs">Secourisme</span>
                </button>
                <button onClick={() => setInput("اشرح لي مادة Psychologie")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">🧠</span>
                  <span className="font-medium text-xs">Psychologie</span>
                </button>
                <button onClick={() => setInput("اشرح لي مادة Législation et Éthique")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">⚖️</span>
                  <span className="font-medium text-xs">Législation/Éthique</span>
                </button>
                <button onClick={() => setInput("اشرح لي أساسيات المهنة الشبه طبية")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">👨‍⚕️</span>
                  <span className="font-medium text-xs">Fondements profession</span>
                </button>
                <button onClick={() => setInput("أعطني قائمة بجميع مواد السداسي الأول S1")} className="p-3 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-all hover:shadow-md text-right group">
                  <span className="text-lg group-hover:scale-110 transition-transform inline-block ml-1">📋</span>
                  <span className="font-medium text-xs">كل مواد S1</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onEdit={onEditMessage}
              onNavigateVersion={onNavigateVersion}
            />
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
            {pendingAttachments.map((attachment, index) => {
              const isFile = attachment.startsWith('file:');
              const fileName = isFile ? attachment.split(':')[1] : null;
              const fileType = isFile ? attachment.split(':')[2] : null;

              return (
                <div key={index} className="relative shrink-0 group">
                  {isFile ? (
                    // File attachment (PDF, etc.)
                    <div className="h-20 w-24 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-md hover:scale-105 transition-transform">
                      <div className="text-3xl mb-1">
                        {fileType?.includes('pdf') ? '📄' : '📁'}
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-[80px] px-1" title={fileName || ''}>
                        {fileName && fileName.length > 10 ? fileName.substring(0, 10) + '...' : fileName}
                      </span>
                    </div>
                  ) : (
                    // Image attachment
                    <img src={attachment} alt="preview" className="h-20 w-20 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-md hover:scale-105 transition-transform" />
                  )}
                  <button
                    onClick={() => onRemoveAttachment && onRemoveAttachment(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 hover:bg-red-600 transition-all ring-2 ring-white dark:ring-gray-800"
                  >
                    <XIcon />
                  </button>
                </div>
              );
            })}
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
            className={`p-3.5 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${(input.trim() || pendingAttachments.length > 0) && !isLoading
              ? 'bg-gradient-to-br from-medical-600 to-medical-700 text-white hover:from-medical-700 hover:to-medical-800 hover:scale-110 active:scale-95 shadow-medical-500/30'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
              }`}
          >
            <SendIcon />
          </button>

          {/* Stop Generation Button - Shows when loading */}
          {isLoading && (
            <button
              onClick={onStopGeneration}
              className="p-3.5 rounded-xl flex items-center justify-center transition-all duration-300 bg-red-500 hover:bg-red-600 text-white hover:scale-110 active:scale-95 shadow-lg shadow-red-500/30"
              title="إيقاف الرد"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          )}
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