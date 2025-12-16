
import React, { useState } from 'react';
import { FileContext, ChatSession, QuizSession, ChecklistSession } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { FileIcon, TrashIcon, CloseIcon, BookOpen, SearchIcon, PlusIcon, ChatIcon, LayersIcon, EditIcon, CheckIcon, XIcon, LogOutIcon } from './Icons';
import { Sparkles, Settings, Crown, Sun, Moon, ClipboardList, MessageSquare, Bell } from 'lucide-react';
import { formatFileSize } from '../utils/fileHelpers';
import { isSupervisor, isAdmin } from '../services/coursesService';

interface SidebarProps {
  files: FileContext[];
  setFiles?: React.Dispatch<React.SetStateAction<FileContext[]>>;
  onFileSelect?: (file: FileContext) => void;
  isOpen: boolean;
  onClose: () => void;

  // Chat
  chatSessions: ChatSession[];
  currentSessionId: string;
  onSessionSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;

  // Quiz
  quizSessions: QuizSession[];
  currentQuizId: string | null;
  onQuizSelect: (id: string) => void;
  onNewQuiz: () => void;
  onDeleteQuiz: (id: string) => void;
  onRenameQuiz: (id: string, newTitle: string) => void;

  // Checklist
  checklistSessions: ChecklistSession[];
  currentChecklistId: string | null;
  onChecklistSelect: (id: string) => void;
  onNewChecklist: () => void;
  onDeleteChecklist: (id: string) => void;
  onRenameChecklist: (id: string, newTitle: string) => void;

  // App Mode
  appMode: 'chat' | 'quiz' | 'mnemonics' | 'checklist';
  onModeChange: (mode: 'chat' | 'quiz' | 'mnemonics' | 'checklist') => void;

  // Theme & Settings
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  isAdmin: boolean;

  // Notifications
  adminMessagesCount?: number;
  unreadCount?: number;
  onOpenAdminMessages?: () => void;
}

const FileSidebar: React.FC<SidebarProps> = ({
  files,
  setFiles,
  onFileSelect,
  isOpen,
  onClose,
  chatSessions,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onDeleteSession,
  onRenameSession,

  quizSessions,
  currentQuizId,
  onQuizSelect,
  onNewQuiz,
  onDeleteQuiz,
  onRenameQuiz,

  checklistSessions = [],
  currentChecklistId,
  onChecklistSelect,
  onNewChecklist,
  onDeleteChecklist,
  onRenameChecklist,

  appMode,
  onModeChange,
  isDarkMode,
  onToggleTheme,
  onOpenSettings,
  onOpenAdmin,
  isAdmin: isUserAdmin,
  adminMessagesCount = 0,
  unreadCount = 0,
  onOpenAdminMessages
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'files'>('chats');

  // States for Editing and Deleting
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState(''); // Renamed from editTitle
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const startEditing = (session: ChatSession | QuizSession | ChecklistSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSessionId(session.id);
    setNewTitle(session.title || '');
    setDeleteConfirmationId(null); // Close any delete confirmation
  };

  const handleRename = (id: string) => {
    if (newTitle.trim()) {
      if (appMode === 'chat') {
        onRenameSession(id, newTitle.trim());
      } else if (appMode === 'quiz') {
        onRenameQuiz(id, newTitle.trim());
      } else if (appMode === 'checklist') {
        onRenameChecklist(id, newTitle.trim());
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
      onDeleteSession(id);
    } else if (appMode === 'quiz') {
      onDeleteQuiz(id);
    } else if (appMode === 'checklist') {
      onDeleteChecklist(id);
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

  // Sort sessions by timestamp (newest first)
  const sortItems = (items: any[]) => [...items].sort((a: any, b: any) => {
    const timeA = a.timestamp || a.createdAt || 0;
    const timeB = b.timestamp || b.createdAt || 0;
    return timeB - timeA;
  });

  const sortedChatSessions = sortItems(chatSessions);
  const sortedQuizSessions = sortItems(quizSessions);
  const sortedChecklistSessions = sortItems(checklistSessions);

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
        fixed top-0 right-0 h-[100dvh] md:h-full w-80 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-2xl z-30 transform transition-transform duration-300 ease-in-out flex flex-col
        md:translate-x-0 md:static md:shadow-lg border-l border-gray-200/50 dark:border-dark-border/50
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

        {/* Create New Checklist Button (Only in Checklist Mode) */}
        {appMode === 'checklist' && (
          <div className="px-5 pt-3 pb-0 animate-fadeIn">
            <button
              onClick={() => {
                onNewChecklist();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-md active:scale-95"
            >
              <div className="bg-white/20 p-1 rounded-full"><PlusIcon /></div>
              <span className="font-bold">قائمة مهام جديدة</span>
            </button>
          </div>
        )}

        {/* Separator */}
        <div className="mx-5 my-4 h-px bg-gray-200 dark:bg-dark-border" />

        {/* Tabs */}
        <div className="flex border-b border-gray-200/50 dark:border-dark-border/50 px-5 gap-2 shrink-0 bg-gray-50/30 dark:bg-dark-bg/30">
          {appMode === 'chat' ? (
            <button
              className={`flex-1 pb-3 pt-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chats'
                ? 'border-medical-500 text-medical-600 dark:text-medical-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              onClick={() => setActiveTab('chats')}
            >
              المحادثات
            </button>
          ) : appMode === 'quiz' ? (
            <button
              className={`flex-1 pb-3 pt-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chats' // Reusing 'chats' tab name for primary list for simplicity, or could rename logic
                ? 'border-medical-500 text-medical-600 dark:text-medical-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              onClick={() => setActiveTab('chats')}
            >
              سجل الاختبارات
            </button>
          ) : appMode === 'checklist' ? (
            <button
              className={`flex-1 pb-3 pt-3 text-sm font-medium border-b-2 transition-colors border-teal-500 text-teal-600 dark:text-teal-400`}
              onClick={() => setActiveTab('chats')}
            >
              سجل المراجعة
            </button>
          ) : (
            <div className="h-4"></div>
          )}
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
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 pb-20 custom-scrollbar">

          {/* --- CHATS TAB --- */}
          {activeTab === 'chats' && (
            <div className="space-y-2">

              {/* Chat Sessions List */}
              {appMode === 'chat' && sortedChatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${session.id === currentSessionId
                    ? 'bg-white dark:bg-dark-surface border-medical-200 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-dark-surface/50 text-gray-600 dark:text-gray-400'
                    }`}
                  onClick={() => {
                    onSessionSelect(session.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare size={18} className={session.id === currentSessionId ? 'text-medical-500' : 'opacity-50'} />
                      <div className="min-w-0">
                        {editingSessionId === session.id ? (
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onBlur={() => handleRename(session.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                            className="w-full bg-white dark:bg-dark-bg border border-medical-300 rounded px-1 text-sm disabled:opacity-50"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3 className={`font-medium text-sm truncate ${session.id === currentSessionId ? 'text-gray-900 dark:text-white' : ''}`}>
                            {session.title}
                          </h3>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(session.timestamp).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          startEditing(session, e);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={(e) => {
                          confirmDelete(session.id, e);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Quiz Sessions List */}
              {appMode === 'quiz' && sortedQuizSessions.map((quiz) => (
                <div
                  key={quiz.id}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${quiz.id === currentQuizId
                    ? 'bg-white dark:bg-dark-surface border-medical-200 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-dark-surface/50 text-gray-600 dark:text-gray-400'
                    }`}
                  onClick={() => {
                    onQuizSelect(quiz.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen size={18} className={quiz.id === currentQuizId ? 'text-medical-500' : 'opacity-50'} />
                      <div className="min-w-0">
                        <h3 className={`font-medium text-sm truncate ${quiz.id === currentQuizId ? 'text-gray-900 dark:text-white' : ''}`}>
                          {quiz.title || 'اختبار بدون عنوان'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex gap-2">
                          <span>{new Date(quiz.createdAt).toLocaleDateString('ar-EG')}</span>
                          {quiz.score !== undefined && (
                            <span className={quiz.score >= 50 ? 'text-green-500' : 'text-red-500'}>
                              {Math.round(quiz.score)}%
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        confirmDelete(quiz.id, e);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}

              {/* Checklist Sessions List */}
              {appMode === 'checklist' && sortedChecklistSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${session.id === currentChecklistId
                    ? 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-dark-surface/50 text-gray-600 dark:text-gray-400'
                    }`}
                  onClick={() => {
                    onChecklistSelect(session.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardList size={18} className={session.id === currentChecklistId ? 'text-teal-500' : 'opacity-50'} />
                      <div className="min-w-0">
                        <h3 className={`font-medium text-sm truncate ${session.id === currentChecklistId ? 'text-gray-900 dark:text-white' : ''}`}>
                          {session.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex gap-2">
                          <span>{new Date(session.createdAt).toLocaleDateString('ar-EG')}</span>
                          <span className={session.progress === 100 ? 'text-green-500' : 'text-teal-500'}>
                            {session.progress}%
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        confirmDelete(session.id, e);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon />
                    </button>
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

        {/* User Profile Section - Compact Single Row */}
        <div className="p-3 border-t border-gray-200/50 dark:border-dark-border/50 bg-gradient-to-r from-gray-50/80 to-white dark:from-dark-bg/50 dark:to-dark-surface/50 backdrop-blur-sm shrink-0">
          {user && (
            <div className="flex items-center justify-between gap-2">
              {/* User Info (Right) */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=0ea5e9&color=fff`}
                    alt="User"
                    className="w-9 h-9 rounded-xl border-2 border-white dark:border-gray-700 shadow-sm"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"></div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[80px] sm:max-w-[100px]">{user.name}</p>
                    {isAdmin(user.email) && (
                      <span className="px-1 py-0.5 bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] font-bold rounded border border-amber-200 dark:border-amber-800 shrink-0">
                        ADMIN
                      </span>
                    )}
                    {isSupervisor(user.email) && (
                      <span className="px-1 py-0.5 bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[9px] font-bold rounded border border-blue-200 dark:border-blue-800 shrink-0">
                        MUSHRIF
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{user.email}</p>
                </div>
              </div>

              {/* Action Buttons (Left) */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onToggleTheme}
                  className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                  title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Notifications Bell */}
                <button
                  onClick={adminMessagesCount > 0 ? onOpenAdminMessages : undefined}
                  className={`p-1.5 relative rounded-lg transition-all ${adminMessagesCount > 0
                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                    : 'text-gray-300 dark:text-gray-600'}`}
                  title={unreadCount > 0 ? `${unreadCount} رسائل جديدة` : 'لا توجد رسائل'}
                >
                  <Bell size={18} className={unreadCount > 0 ? "animate-pulse" : ""} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full border-2 border-white dark:border-dark-surface text-[8px] text-white font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={onOpenSettings}
                  className="p-1.5 text-gray-400 hover:text-medical-600 hover:bg-medical-50 dark:hover:bg-medical-900/30 rounded-lg transition-all"
                  title="الإعدادات"
                >
                  <Settings size={18} />
                </button>

                {(isUserAdmin || isSupervisor(user.email)) && (
                  <button
                    onClick={onOpenAdmin}
                    className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                    title="لوحة الإدارة"
                  >
                    <Crown size={18} />
                  </button>
                )}

                <button
                  onClick={logout}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
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
