
import React, { useState, useCallback, useEffect } from 'react';
import FileSidebar from './components/FileSidebar';
import ChatArea from './components/ChatArea';
import LoginPage from './components/LoginPage';
import { FileContext, Message, ChatSession } from './types';
import { generateResponse } from './services/geminiService';
import { ZGLogo, SunIcon, MoonIcon, LoadingIcon } from './components/Icons';
import { fileToBase64 } from './utils/fileHelpers';
import { INITIAL_COURSES } from './data/courses';
import { useAuth } from './contexts/AuthContext';

const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Initialize files with the pre-loaded courses
  const [files, setFiles] = useState<FileContext[]>(INITIAL_COURSES);
  
  // Initialize Sessions with one default empty session
  const [sessions, setSessions] = useState<ChatSession[]>([
    { 
      id: 'default', 
      title: 'محادثة جديدة', 
      messages: [], 
      timestamp: Date.now() 
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');

  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]); // New state for images waiting to be sent
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Helper to get current session object
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession.messages;

  // Toggle Dark Mode
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // --- Session Management ---

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'محادثة جديدة',
      messages: [],
      timestamp: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setInput('');
    setPendingAttachments([]);
  };

  const deleteSession = (id: string) => {
    // Prevent deleting the last session, just clear it instead
    if (sessions.length === 1) {
      setSessions([{ ...sessions[0], messages: [], title: 'محادثة جديدة' }]);
      return;
    }

    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    
    // If we deleted the active session, switch to the first available one
    if (id === currentSessionId) {
      setCurrentSessionId(newSessions[0].id);
    }
  };

  const renameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id === id) {
        return { ...session, title: newTitle };
      }
      return session;
    }));
  };

  const updateCurrentSessionMessages = (newMessages: Message[], newTitle?: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          messages: newMessages,
          title: newTitle || session.title,
          timestamp: Date.now()
        };
      }
      return session;
    }));
  };

  // --------------------------

  const handleFileUpload = useCallback(async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const newFiles: FileContext[] = [];
    const newAttachments: string[] = [];
    
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      try {
        const base64Data = await fileToBase64(file);
        
        // Add to global knowledge base
        newFiles.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type,
          data: base64Data, // Raw base64 for API
          size: file.size
        });

        // If it's an image, add to pending attachments for UI preview
        if (file.type.startsWith('image/')) {
          newAttachments.push(`data:${file.type};base64,${base64Data}`);
        }

      } catch (err) {
        console.error("Error reading file", file.name, err);
        alert(`فشل تحميل الملف: ${file.name}`);
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    setPendingAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
      timestamp: Date.now()
    };

    // Calculate new title if it's the first message
    let newTitle = undefined;
    if (messages.length === 0) {
      // Use first 5 words as title
      newTitle = input.split(' ').slice(0, 5).join(' ') || 'صورة مرفقة';
    }

    // Optimistic update
    const updatedMessages = [...messages, userMessage];
    updateCurrentSessionMessages(updatedMessages, newTitle);
    
    setInput('');
    setPendingAttachments([]); // Clear pending attachments
    setIsProcessing(true);

    try {
      const responseText = await generateResponse(
        userMessage.content,
        files,
        updatedMessages // Pass full history of CURRENT session to keep memory
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };

      updateCurrentSessionMessages([...updatedMessages, botMessage], newTitle);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "عذراً، حدث خطأ أثناء المعالجة. تأكد من اتصالك بالإنترنت ومن صلاحية مفتاح API.",
        timestamp: Date.now(),
        isError: true
      };
      updateCurrentSessionMessages([...updatedMessages, errorMessage], newTitle);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <LoadingIcon />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-screen w-full`}>
      <div className="flex h-full bg-gray-100 dark:bg-dark-bg text-right overflow-hidden font-sans transition-colors duration-300">
        {/* Sidebar (Desktop: always visible, Mobile: toggleable) */}
        <div className="hidden md:flex md:flex-col w-80 bg-white dark:bg-dark-surface border-l border-gray-200 dark:border-dark-border z-10 transition-colors duration-300">
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-dark-border shrink-0">
             <div className="flex items-center gap-3">
               <ZGLogo />
               <h1 className="text-xl font-bold text-gray-800 dark:text-dark-text">Paramedical AI</h1>
             </div>
             
             {/* Desktop Theme Toggle */}
             <button 
               onClick={toggleTheme}
               className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
               title="Toggle Theme"
             >
               {isDarkMode ? <SunIcon /> : <MoonIcon />}
             </button>
          </div>
          <div className="flex-1 overflow-hidden relative">
             <FileSidebar 
               files={files} 
               setFiles={setFiles}
               isOpen={true} // Always open on desktop
               onClose={() => {}} 
               // Chat Props
               sessions={sessions}
               currentSessionId={currentSessionId}
               onNewChat={createNewSession}
               onSwitchChat={setCurrentSessionId}
               onDeleteChat={deleteSession}
               onRenameChat={renameSession}
             />
          </div>
        </div>

        {/* Mobile Sidebar Logic */}
        <div className="md:hidden">
          <FileSidebar 
            files={files} 
            setFiles={setFiles}
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            // Chat Props
            sessions={sessions}
            currentSessionId={currentSessionId}
            onNewChat={createNewSession}
            onSwitchChat={setCurrentSessionId}
            onDeleteChat={deleteSession}
            onRenameChat={renameSession}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-dark-bg transition-colors duration-300">
          <ChatArea 
            messages={messages}
            input={input}
            setInput={setInput}
            isLoading={isProcessing}
            onSend={handleSendMessage}
            onToggleSidebar={() => setIsSidebarOpen(true)}
            onUpload={handleFileUpload}
            pendingAttachments={pendingAttachments}
            onRemoveAttachment={removePendingAttachment}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        </div>
      </div>
    </div>
  );
};

export default App;