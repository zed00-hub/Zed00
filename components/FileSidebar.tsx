
import React, { useState } from 'react';
import { FileContext, ChatSession } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { FileIcon, TrashIcon, CloseIcon, BookOpen, SearchIcon, PlusIcon, ChatIcon, LayersIcon, EditIcon, CheckIcon, XIcon, LogOutIcon } from './Icons';
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
  onRenameChat
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
      onRenameChat(editingSessionId, editTitle.trim());
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
    onDeleteChat(id);
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
  const sortedSessions = [...sessions].sort((a, b) => b.timestamp - a.timestamp);

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

          {/* New Chat Button (Always Visible) */}
          <div className="px-5 py-4 shrink-0">
            <button 
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-medical-600 to-medical-700 hover:from-medical-700 hover:to-medical-800 text-white py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 font-semibold text-base"
            >
              <PlusIcon />
              محادثة جديدة
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200/50 dark:border-dark-border/50 px-5 gap-2 shrink-0 bg-gray-50/30 dark:bg-dark-bg/30">
            <button 
              onClick={() => setActiveTab('chats')}
              className={`flex-1 pb-3.5 pt-3 text-sm font-semibold transition-all relative rounded-t-xl ${
                activeTab === 'chats' 
                  ? 'text-medical-600 dark:text-medical-400 bg-white dark:bg-dark-surface shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              المحادثات
              {activeTab === 'chats' && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-600 to-medical-500 dark:from-medical-400 dark:to-medical-500 rounded-t-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`flex-1 pb-3.5 pt-3 text-sm font-semibold transition-all relative rounded-t-xl ${
                activeTab === 'files' 
                  ? 'text-medical-600 dark:text-medical-400 bg-white dark:bg-dark-surface shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              المصادر والملفات
              {activeTab === 'files' && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-600 to-medical-500 dark:from-medical-400 dark:to-medical-500 rounded-t-full" />
              )}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            
            {/* --- CHATS TAB --- */}
            {activeTab === 'chats' && (
              <div className="space-y-2">
                {sortedSessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => {
                      if (editingSessionId !== session.id) {
                        onSwitchChat(session.id);
                        if (window.innerWidth < 768) onClose();
                      }
                    }}
                    className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                      session.id === currentSessionId
                        ? 'bg-gradient-to-r from-medical-50 to-medical-100/50 dark:from-medical-900/30 dark:to-medical-800/20 border-medical-300 dark:border-medical-700/50 shadow-md'
                        : 'bg-transparent border-transparent hover:bg-gray-50/80 dark:hover:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 transition-all ${
                      session.id === currentSessionId 
                        ? 'bg-gradient-to-br from-medical-500 to-medical-600 text-white shadow-lg' 
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                    }`}>
                      <ChatIcon />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {editingSessionId === session.id ? (
                        <input 
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full bg-white dark:bg-dark-bg border-2 border-medical-500 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                        />
                      ) : (
                         deleteConfirmationId === session.id ? (
                           <span className="text-red-600 dark:text-red-400 text-sm font-bold animate-pulse">تأكيد الحذف؟</span>
                         ) : (
                          <>
                            <p className={`text-sm font-semibold truncate ${
                              session.id === currentSessionId 
                                ? 'text-medical-900 dark:text-medical-100' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {session.title || 'محادثة جديدة'}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {new Date(session.timestamp).toLocaleDateString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                            </p>
                          </>
                         )
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {editingSessionId === session.id ? (
                        <>
                           <button onClick={saveTitle} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all hover:scale-110 active:scale-95"><CheckIcon /></button>
                           <button onClick={cancelEdit} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all hover:scale-110 active:scale-95"><XIcon /></button>
                        </>
                      ) : deleteConfirmationId === session.id ? (
                        <>
                           <button onClick={(e) => confirmDelete(session.id, e)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all hover:scale-110 active:scale-95 font-bold"><CheckIcon /></button>
                           <button onClick={cancelDelete} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all hover:scale-110 active:scale-95"><XIcon /></button>
                        </>
                      ) : (
                        <>
                           <button 
                            onClick={(e) => startEditing(session, e)}
                            className="p-2 text-gray-400 hover:text-medical-600 dark:hover:text-medical-400 hover:bg-medical-50 dark:hover:bg-medical-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 active:scale-95"
                            title="تعديل العنوان"
                          >
                            <EditIcon />
                          </button>
                          <button 
                            onClick={(e) => requestDelete(session.id, e)}
                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 active:scale-95"
                            title="حذف المحادثة"
                          >
                            <TrashIcon />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- FILES TAB --- */}
            {activeTab === 'files' && (
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
            )}
          </div>

          {/* User Profile Section */}
          <div className="p-5 border-t border-gray-200/50 dark:border-dark-border/50 bg-gradient-to-r from-gray-50/80 to-white dark:from-dark-bg/50 dark:to-dark-surface/50 backdrop-blur-sm shrink-0">
            {user && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=0ea5e9&color=fff`} 
                      alt="User" 
                      className="w-12 h-12 rounded-xl border-2 border-white dark:border-gray-700 shadow-lg ring-2 ring-medical-200/50 dark:ring-medical-800/50"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-700"></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{user.email}</p>
                  </div>
                </div>
                <button 
                  onClick={logout}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all hover:scale-110 active:scale-95"
                  title="تسجيل الخروج"
                >
                  <LogOutIcon />
                </button>
              </div>
            )}
          </div>
      </aside>
    </>
  );
};

export default FileSidebar;
