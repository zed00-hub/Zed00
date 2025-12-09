import React, { useState } from 'react';
import { FileContext, ChatSession } from '../types';
import { FileIcon, TrashIcon, CloseIcon, BookOpen, SearchIcon, PlusIcon, ChatIcon, LayersIcon, EditIcon, CheckIcon, XIcon } from './Icons';
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
        fixed top-0 right-0 h-full w-80 bg-white dark:bg-dark-surface shadow-xl z-30 transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:shadow-none border-l border-gray-100 dark:border-dark-border flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
               <LayersIcon />
               القائمة
            </h2>
            <button onClick={onClose} className="md:hidden text-gray-500 hover:text-red-500">
              <CloseIcon />
            </button>
          </div>

          {/* New Chat Button (Always Visible) */}
          <div className="px-4 py-3 shrink-0">
            <button 
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center justify-center gap-2 bg-medical-600 hover:bg-medical-700 text-white py-3 rounded-xl transition-all shadow-md active:scale-95 font-semibold"
            >
              <PlusIcon />
              محادثة جديدة
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-dark-border px-4 gap-4 shrink-0">
            <button 
              onClick={() => setActiveTab('chats')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'chats' 
                  ? 'text-medical-600 dark:text-medical-400' 
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              المحادثات
              {activeTab === 'chats' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-medical-600 dark:bg-medical-400 rounded-t-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'files' 
                  ? 'text-medical-600 dark:text-medical-400' 
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
            >
              المصادر والملفات
              {activeTab === 'files' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-medical-600 dark:bg-medical-400 rounded-t-full" />
              )}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            
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
                    className={`group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border ${
                      session.id === currentSessionId
                        ? 'bg-medical-50 dark:bg-medical-900/20 border-medical-200 dark:border-medical-700/50'
                        : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      session.id === currentSessionId 
                        ? 'bg-medical-100 text-medical-600 dark:bg-medical-800 dark:text-medical-300' 
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
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
                          className="w-full bg-white dark:bg-dark-bg border border-medical-500 rounded px-1 py-0.5 text-sm focus:outline-none"
                        />
                      ) : (
                         deleteConfirmationId === session.id ? (
                           <span className="text-red-500 text-sm font-bold animate-pulse">تأكيد الحذف؟</span>
                         ) : (
                          <>
                            <p className={`text-sm font-medium truncate ${
                              session.id === currentSessionId 
                                ? 'text-medical-900 dark:text-medical-100' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {session.title || 'محادثة جديدة'}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              {new Date(session.timestamp).toLocaleDateString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                            </p>
                          </>
                         )
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      {editingSessionId === session.id ? (
                        <>
                           <button onClick={saveTitle} className="p-1 text-green-500 hover:bg-green-100 rounded-full"><CheckIcon /></button>
                           <button onClick={cancelEdit} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><XIcon /></button>
                        </>
                      ) : deleteConfirmationId === session.id ? (
                        <>
                           <button onClick={(e) => confirmDelete(session.id, e)} className="p-1 text-red-600 hover:bg-red-100 rounded-full font-bold"><CheckIcon /></button>
                           <button onClick={cancelDelete} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full"><XIcon /></button>
                        </>
                      ) : (
                        <>
                           <button 
                            onClick={(e) => startEditing(session, e)}
                            className="p-1.5 text-gray-400 hover:text-medical-600 hover:bg-medical-50 dark:hover:bg-medical-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="تعديل العنوان"
                          >
                            <EditIcon />
                          </button>
                          <button 
                            onClick={(e) => requestDelete(session.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
                <div className="relative">
                  <div className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-medical-500 text-gray-700 dark:text-gray-200"
                  />
                </div>

                {/* System Files */}
                {systemFiles.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      المقرر الدراسي
                    </h3>
                    <div className="space-y-1">
                      {systemFiles.map(file => (
                        <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <BookOpen size={14} className="text-medical-500 shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Files (Visible if added via chat, but cannot upload here) */}
                {userFiles.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      ملفاتك (من المحادثة)
                    </h3>
                    <div className="space-y-1">
                      {userFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileIcon />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                              <p className="text-[9px] text-gray-400">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button onClick={() => removeFile(file.id)} className="text-gray-400 hover:text-red-500">
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
      </aside>
    </>
  );
};

export default FileSidebar;