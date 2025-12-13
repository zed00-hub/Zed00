
import React, { useState } from 'react';
import { FileContext, ChatSession, QuizSession } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { FileIcon, TrashIcon, CloseIcon, BookOpen, SearchIcon, PlusIcon, ChatIcon, LayersIcon, EditIcon, CheckIcon, XIcon, LogOutIcon } from './Icons';
import { Sparkles, Settings, Crown, Sun, Moon, ClipboardList } from 'lucide-react';
import { formatFileSize } from '../utils/fileHelpers';

interface SidebarProps {
  files: FileContext[];
  setFiles: React.Dispatch<React.SetStateAction<FileContext[]>>;
  isOpen: boolean;
  onClose: () => void;

  // Chat Session Props
  sessions: ChatSession[];
  currentSessionId: string;
  onNewChat: () => void;
  onSwitchChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;

  // Quiz Session Props
  quizSessions: QuizSession[];
  currentQuizId: string | null;
  onNewQuiz: () => void;
  onSwitchQuiz: (id: string) => void;
  onDeleteQuiz: (id: string) => void;
  onRenameQuiz: (id: string, newTitle: string) => void;

  // App Mode
  appMode: 'chat' | 'quiz' | 'mnemonics' | 'checklist';
  onModeChange: (mode: 'chat' | 'quiz' | 'mnemonics' | 'checklist') => void;

  // Theme & Settings
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

const FileSidebar: React.FC<SidebarProps> = ({
  files,
  setFiles,
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
  onRenameChat,
  quizSessions,
  currentQuizId,
  onNewQuiz,
  onSwitchQuiz,
  onDeleteQuiz,
  onRenameQuiz,
  appMode,
  onModeChange,
  isDarkMode,
  onToggleTheme,
  onOpenSettings,
  onOpenAdmin,
  isAdmin: isUserAdmin
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'files'>('chats');

  // States for Editing and Deleting
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
    setDeleteConfirmationId(null); // Close any delete confirmation
  };

  const saveTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingSessionId && editTitle.trim()) {
      if (appMode === 'chat') {
        onRenameChat(editingSessionId, editTitle.trim());
      } else {
        onRenameQuiz(editingSessionId, editTitle.trim());
      }
      setEditingSessionId(null);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmationId(id);
    setEditingSessionId(null); // Close edit mode if open
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (appMode === 'chat') {
      onDeleteChat(id);
    } else {
      onDeleteQuiz(id);
    }
    setDeleteConfirmationId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmationId(null);
  };

  // Filter files based on search query
  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate filtered files into System (pre-loaded) and User uploaded
  const systemFiles = filteredFiles.filter(f => !!f.content);
  const userFiles = filteredFiles.filter(f => !f.content);

  // Filter and Switch Logic
  const sessionsToDisplay = appMode === 'chat' ? sessions : quizSessions;

  // Sort sessions by timestamp (newest first)
  // ChatSession uses 'timestamp', QuizSession uses 'createdAt'
  const sortedItems = [...sessionsToDisplay].sort((a: any, b: any) => {
    const timeA = a.timestamp || a.createdAt || 0;
    const timeB = b.timestamp || b.createdAt || 0;
    return timeB - timeA;
  });

  const activeId = appMode === 'chat' ? currentSessionId : (currentQuizId || '');

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 right-0 h-full w-80 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-2xl z-30 transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:shadow-lg border-l border-gray-200/50 dark:border-dark-border/50 flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="p-5 border-b border-gray-200/50 dark:border-dark-border/50 flex justify-between items-center shrink-0 bg-gradient-to-r from-gray-50/50 to-white dark:from-dark-bg/50 dark:to-dark-surface/50">
          <h2 className="text-xl font-bold flex items-center gap-3 text-gray-800 dark:text-gray-200">
            <div className="p-2 bg-medical-100 dark:bg-medical-900/30 rounded-xl">
              <LayersIcon />
            </div>
            القائمة
          </h2>
          <button onClick={onClose} className="md:hidden p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all hover:scale-110 active:scale-95">
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 pt-4 shrink-0 grid grid-cols-2 gap-3">
          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              onModeChange('chat');
              if (window.innerWidth < 768) onClose();
            }}
            className={`flex flex-col items-center justify-center gap-2 py-3 rounded-2xl transition-all shadow-sm active:scale-95 border-2 ${appMode === 'chat'
              ? 'bg-medical-50 dark:bg-medical-900/20 border-medical-500 text-medical-600 dark:text-medical-400'
              : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700 text-gray-500 hover:border-medical-200'
              }`}
          >
            <div className="p-2 bg-white dark:bg-dark-bg rounded-full shadow-sm">
              <PlusIcon />
            </div>
            <span className="text-sm font-bold">محادثة جديدة</span>
          </button>

          {/* Quiz Mode Button */}
          <button
            onClick={() => {
              onModeChange('quiz');
              if (window.innerWidth < 768) onClose();
            }}
            className={`flex flex-col items-center justify-center gap-2 py-3 rounded-2xl transition-all shadow-sm active:scale-95 border-2 ${appMode === 'quiz'
              ? 'bg-medical-50 dark:bg-medical-900/20 border-medical-500 text-medical-600 dark:text-medical-400'
              : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700 text-gray-500 hover:border-medical-200'
              }`}
          >
            <div className="p-2 bg-white dark:bg-dark-bg rounded-full shadow-sm">
              <BookOpen size={20} />
            </div>
            <span className="text-sm font-bold">إنشاء اختبار</span>
          </button>


        </div>



        {/* Afriha Tool (Checklist) */}
        <div className="px-5 pt-3 pb-0">
          <button
            onClick={() => {
              onModeChange('checklist');
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-2xl transition-all shadow-sm active:scale-95 border-2 ${appMode === 'checklist'
              ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-500 text-teal-600 dark:text-teal-400'
              : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700 text-gray-500 hover:border-teal-300 dark:hover:border-teal-700'
              }`}
          >
            <div className="p-1.5 bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/40 rounded-lg shadow-sm">
              <ClipboardList size={18} className="text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-sm font-bold">Chekiha (Checklist)</span>
          </button>
        </div>

        {/* Mnemonics Tool */}
        <div className="px-5 pt-3 pb-0">
          <button
            onClick={() => {
              onModeChange('mnemonics');
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center justify-center gap-3 py-3 rounded-2xl transition-all shadow-sm active:scale-95 border-2 ${appMode === 'mnemonics'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-600 dark:text-amber-400'
              : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700 text-gray-500 hover:border-amber-300 dark:hover:border-amber-700'
              }`}
          >
            <div className="p-1.5 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-lg shadow-sm">
              <Sparkles size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-bold">صانع الحيل الحفظية (Mnemonics)</span>
          </button>
        </div>

        {/* Separator */}
        <div className="mx-5 my-4 h-px bg-gray-200 dark:bg-dark-border" />

        {/* Tabs */}
        <div className="flex border-b border-gray-200/50 dark:border-dark-border/50 px-5 gap-2 shrink-0 bg-gray-50/30 dark:bg-dark-bg/30">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 pb-3.5 pt-3 text-sm font-semibold transition-all relative rounded-t-xl ${activeTab === 'chats'
              ? 'text-medical-600 dark:text-medical-400 bg-white dark:bg-dark-surface shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            {appMode === 'chat' ? 'المحادثات' : 'الاختبارات'}
            {activeTab === 'chats' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-600 to-medical-500 dark:from-medical-400 dark:to-medical-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 pb-3.5 pt-3 text-sm font-semibold transition-all relative rounded-t-xl ${activeTab === 'files'
              ? 'text-medical-600 dark:text-medical-400 bg-white dark:bg-dark-surface shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            المصادر والملفات
            {activeTab === 'files' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-600 to-medical-500 dark:from-medical-400 dark:to-medical-500 rounded-t-full" />
            )}
          </button>
        </div >

        {/* Content Area */}
        < div className="flex-1 overflow-y-auto px-3 py-3" >

          {/* --- CHATS TAB --- */}
          {
            activeTab === 'chats' && (
              <div className="space-y-2">
                {sortedItems.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (editingSessionId !== item.id) {
                        if (appMode === 'chat') onSwitchChat(item.id);
                        else onSwitchQuiz(item.id);

                        if (window.innerWidth < 768) onClose();
                      }
                    }}
                    className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border-2 ${item.id === activeId
                      ? 'bg-gradient-to-r from-medical-50 to-medical-100/50 dark:from-medical-900/30 dark:to-medical-800/20 border-medical-300 dark:border-medical-700/50 shadow-md'
                      : 'bg-transparent border-transparent hover:bg-gray-50/80 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700'
                      }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 transition-all ${item.id === activeId
                      ? 'bg-gradient-to-br from-medical-500 to-medical-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                      }`}>
                      {appMode === 'chat' ? <ChatIcon /> : <BookOpen size={18} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingSessionId === item.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full bg-white dark:bg-dark-bg border-2 border-medical-500 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                        />
                      ) : (
                        deleteConfirmationId === item.id ? (
                          <span className="text-red-600 dark:text-red-400 text-sm font-bold animate-pulse">تأكيد الحذف؟</span>
                        ) : (
                          <>
                            <p className={`text-sm font-semibold truncate ${item.id === activeId
                              ? 'text-medical-900 dark:text-medical-100'
                              : 'text-gray-700 dark:text-gray-300'
                              }`}>
                              {item.title || (appMode === 'chat' ? 'محادثة جديدة' : 'اختبار جديد')}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {new Date(item.timestamp || item.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </>
                        )
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {editingSessionId === item.id ? (
                        <>
                          <button onClick={saveTitle} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all hover:scale-110 active:scale-95"><CheckIcon /></button>
                          <button onClick={cancelEdit} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all hover:scale-110 active:scale-95"><XIcon /></button>
                        </>
                      ) : deleteConfirmationId === item.id ? (
                        <>
                          <button onClick={(e) => confirmDelete(item.id, e)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all hover:scale-110 active:scale-95 font-bold"><CheckIcon /></button>
                          <button onClick={cancelDelete} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all hover:scale-110 active:scale-95"><XIcon /></button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => startEditing(item, e)}
                            className="p-2 text-gray-400 hover:text-medical-600 dark:hover:text-medical-400 hover:bg-medical-50 dark:hover:bg-medical-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 active:scale-95"
                            title="تعديل العنوان"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={(e) => requestDelete(item.id, e)}
                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 active:scale-95"
                            title="حذف"
                          >
                            <TrashIcon />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          }

          {/* --- FILES TAB --- */}
          {
            activeTab === 'files' && (
              <div className="space-y-4 px-2">
                {/* Search Input */}
                <div className="relative mb-4">
                  <div className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20 text-gray-700 dark:text-gray-200 transition-all"
                  />
                </div>

                {/* System Files */}
                {systemFiles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-1 bg-medical-500 rounded-full"></div>
                      المقرر الدراسي
                    </h3>
                    <div className="space-y-2">
                      {systemFiles.map(file => (
                        <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group">
                          <div className="p-2 bg-medical-100 dark:bg-medical-900/30 rounded-lg group-hover:bg-medical-200 dark:group-hover:bg-medical-800/40 transition-colors">
                            <BookOpen size={16} className="text-medical-600 dark:text-medical-400 shrink-0" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Files (Visible if added via chat, but cannot upload here) */}
                {userFiles.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                      ملفاتك (من المحادثة)
                    </h3>
                    <div className="space-y-2">
                      {userFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/40 transition-colors">
                              <FileIcon />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button onClick={() => removeFile(file.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110 active:scale-95">
                            <TrashIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {systemFiles.length === 0 && userFiles.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    لا توجد ملفات للعرض
                  </div>
                )}
              </div>
            )
          }
        </div >

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200/50 dark:border-dark-border/50 bg-gradient-to-r from-gray-50/80 to-white dark:from-dark-bg/50 dark:to-dark-surface/50 backdrop-blur-sm shrink-0">
          {user && (
            <div className="space-y-3">
              {/* User Info Row */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=0ea5e9&color=fff`}
                    alt="User"
                    className="w-10 h-10 rounded-xl border-2 border-white dark:border-gray-700 shadow-lg"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                {/* Theme Toggle */}
                <button
                  onClick={onToggleTheme}
                  className="flex-1 p-2 text-gray-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all flex justify-center"
                  title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Settings */}
                <button
                  onClick={onOpenSettings}
                  className="flex-1 p-2 text-gray-500 hover:text-medical-600 hover:bg-medical-50 dark:hover:bg-medical-900/30 rounded-lg transition-all flex justify-center"
                  title="إعدادات المساعد"
                >
                  <Settings size={20} />
                </button>

                {/* Admin Panel - Only for admins */}
                {isUserAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="flex-1 p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all flex justify-center"
                    title="لوحة إدارة المواد"
                  >
                    <Crown size={20} />
                  </button>
                )}

                {/* Logout */}
                <button
                  onClick={logout}
                  className="flex-1 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all flex justify-center"
                  title="تسجيل الخروج"
                >
                  <LogOutIcon />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside >
    </>
  );
};

export default FileSidebar;
