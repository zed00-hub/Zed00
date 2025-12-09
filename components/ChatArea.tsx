import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { BotIcon, UserIcon, SendIcon, LoadingIcon, AttachIcon, FileIcon, ZGLogo, SunIcon, MoonIcon } from './Icons';

interface ChatAreaProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onToggleSidebar: () => void;
  onUpload: (files: FileList | null) => void;
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
  }, [messages, isLoading]);

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
      <div className="md:hidden h-16 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-4 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <ZGLogo />
          <h1 className="font-bold text-gray-800 dark:text-dark-text text-sm">Paramedical AI</h1>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button 
            onClick={onToggleSidebar}
            className="p-2 text-medical-600 hover:bg-medical-50 dark:text-medical-500 dark:hover:bg-gray-700 rounded-lg relative"
          >
             <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
             <FileIcon /> 
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 space-y-4 px-4">
            <div className="mb-2 transform hover:scale-105 transition-transform duration-300">
              <ZGLogo />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">السلام عليكم</h3>
              <p className="max-w-md mx-auto leading-relaxed">
                أنا مساعدك الدراسي. اسألني عن الدروس والمحاضرات.
                <br />
                <span className="text-sm text-medical-600 dark:text-medical-400 font-medium">
                  أجيبك بالفرنسية مع شرح المصطلحات الصعبة عند الحاجة.
                </span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-8 w-full max-w-lg">
              <button onClick={() => setInput("Explique-moi le système osseux")} className="p-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-colors text-left dir-ltr">
                🦴 Explique-moi le système osseux
              </button>
              <button onClick={() => setInput("Quelles sont les abréviations en Cardiologie ?")} className="p-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-colors text-left dir-ltr">
                ❤️ Quelles sont les abréviations en Cardiologie ?
              </button>
              <button onClick={() => setInput("ما هي مكونات الخلية؟")} className="p-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-colors text-right">
                🧬 ما هي مكونات الخلية؟
              </button>
              <button onClick={() => setInput("أعطني ملخصاً عن المصطلحات الطبية")} className="p-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl hover:border-medical-400 hover:text-medical-600 dark:text-gray-300 dark:hover:text-medical-400 transition-colors text-right">
                📝 أعطني ملخصاً عن المصطلحات الطبية
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${
                msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-transparent border-0'
              }`}>
                {msg.role === 'user' ? <UserIcon /> : <div className="scale-75"><ZGLogo /></div> }
              </div>

              {/* Bubble */}
              <div className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-dark-surface text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'
              }`}>
                 {msg.role === 'model' ? (
                   <div 
                     dir="auto"
                     className="prose prose-sm md:prose-base max-w-none prose-p:leading-relaxed prose-a:text-medical-600 dark:prose-a:text-medical-400 prose-headings:text-medical-800 dark:prose-headings:text-medical-400 prose-strong:text-gray-900 dark:prose-strong:text-white dark:text-gray-200"
                   >
                     <ReactMarkdown>{msg.content}</ReactMarkdown>
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
          <div className="flex gap-4">
             <div className="w-10 h-10 flex items-center justify-center shrink-0">
               <div className="scale-75"><ZGLogo /></div>
            </div>
            <div className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-3">
               <LoadingIcon />
               <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">يتم تحليل الدروس...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-medical-500/20 focus-within:border-medical-500 transition-all shadow-sm">
          
          {/* Student Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-medical-600 dark:text-gray-400 dark:hover:text-medical-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-2 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed"
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
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-xl flex items-center justify-center transition-all duration-200 ${
              input.trim() && !isLoading
                ? 'bg-medical-600 text-white shadow-md hover:bg-medical-700 hover:scale-105' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? <LoadingIcon /> : <SendIcon />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
           IA Paramédicale - Vérifiez toujours les informations médicales.
        </p>
        <p className="text-center text-xs font-bold text-black dark:text-white mt-1">
          By:Ziad
        </p>
      </div>
    </main>
  );
};

export default ChatArea;