
import React, { useState, useCallback, useEffect } from 'react';
import FileSidebar from './components/FileSidebar';
import ChatArea from './components/ChatArea';
import LoginPage from './components/LoginPage';
import { FileContext, Message, ChatSession } from './types';
import { generateResponse } from './services/geminiService';
import { ZGLogo, SunIcon, MoonIcon, LoadingIcon } from './components/Icons';
import { BookOpen, MessageSquare } from 'lucide-react';
import QuizContainer from './components/Quiz/QuizContainer';
import { fileToBase64 } from './utils/fileHelpers';
import { INITIAL_COURSES } from './data/courses';
import { useAuth } from './contexts/AuthContext';
import { saveSessionToFirestore, loadSessionsFromFirestore, deleteSessionFromFirestore } from './services/chatService';

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
  const [isSessionsLoaded, setIsSessionsLoaded] = useState(false);

  // Load user sessions from Firestore
  useEffect(() => {
    const loadSessions = async () => {
      if (user?.id) {
        console.log("App: Loading sessions for user", user.id);
        setIsSessionsLoaded(false);

        try {
          const fetched = await loadSessionsFromFirestore(user.id);
          console.log("App: Fetched sessions:", fetched.length);

          if (fetched.length > 0) {
            setSessions(fetched);
            setCurrentSessionId(fetched[0].id);
          } else {
            // If no sessions, create a new one and save it (don't await - let it save in background)
            const newId = Date.now().toString();
            const newSession: ChatSession = {
              id: newId,
              title: 'محادثة جديدة',
              messages: [],
              timestamp: Date.now()
            };
            setSessions([newSession]);
            setCurrentSessionId(newId);
            // Save in background - don't block UI
            saveSessionToFirestore(user.id, newSession).then(() => {
              console.log("App: Created and saved new session", newId);
            }).catch(err => {
              console.error("App: Failed to save new session:", err);
            });
          }
        } catch (error) {
          console.error("App: Error loading sessions:", error);
          // On error, still create a local session
          const newId = Date.now().toString();
          setSessions([{
            id: newId,
            title: 'محادثة جديدة',
            messages: [],
            timestamp: Date.now()
          }]);
          setCurrentSessionId(newId);
        } finally {
          // Always set loaded to true
          setIsSessionsLoaded(true);
        }
      } else {
        // Logout state - reset to default
        console.log("App: No user, resetting to default session");
        setSessions([{
          id: 'default',
          title: 'محادثة جديدة',
          messages: [],
          timestamp: Date.now()
        }]);
        setCurrentSessionId('default');
        setIsSessionsLoaded(true);
      }
    };

    loadSessions();
  }, [user?.id]);

  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]); // New state for images waiting to be sent
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [appMode, setAppMode] = useState<'chat' | 'quiz'>('chat');

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

    if (user?.id) {
      saveSessionToFirestore(user.id, newSession);
    }
  };

  const deleteSession = (id: string) => {
    // Prevent deleting the last session, just clear it instead
    if (sessions.length === 1) {
      const resetSession = { ...sessions[0], messages: [], title: 'محادثة جديدة', timestamp: Date.now() };
      setSessions([resetSession]);
      if (user?.id) saveSessionToFirestore(user.id, resetSession);
      return;
    }

    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);

    // If we deleted the active session, switch to the first available one
    if (id === currentSessionId) {
      setCurrentSessionId(newSessions[0].id);
    }

    if (user?.id) {
      deleteSessionFromFirestore(user.id, id);
    }
  };

  const renameSession = (id: string, newTitle: string) => {
    let updatedSession: ChatSession | undefined;
    setSessions(prev => prev.map(session => {
      if (session.id === id) {
        updatedSession = { ...session, title: newTitle };
        return updatedSession;
      }
      return session;
    }));

    if (updatedSession && user?.id) {
      saveSessionToFirestore(user.id, updatedSession);
    }
  };

  const updateCurrentSessionMessages = (newMessages: Message[], newTitle?: string) => {
    console.log("updateCurrentSessionMessages: Called with", newMessages.length, "messages, title:", newTitle, "sessionId:", currentSessionId, "userId:", user?.id);

    setSessions(prev => {
      return prev.map(session => {
        if (session.id === currentSessionId) {
          const updatedSession = {
            ...session,
            messages: newMessages,
            title: newTitle || session.title,
            timestamp: Date.now()
          };
          console.log("updateCurrentSessionMessages: Updated session:", updatedSession.id, "with title:", updatedSession.title);

          if (user?.id) {
            console.log("updateCurrentSessionMessages: Saving session with", newMessages.length, "messages to Firestore");
            saveSessionToFirestore(user.id, updatedSession)
              .then(() => console.log("updateCurrentSessionMessages: Session saved successfully to Firestore"))
              .catch(err => console.error("updateCurrentSessionMessages: Failed to save session:", err));
          }

          return updatedSession;
        }
        return session;
      });
    });
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

        // Add all files to pending attachments for UI preview (images show preview, others show icon)
        if (file.type.startsWith('image/')) {
          newAttachments.push(`data:${file.type};base64,${base64Data}`);
        } else {
          // For non-image files, store a special format: "file:name:type"
          newAttachments.push(`file:${file.name}:${file.type}`);
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
        messages // Pass history (excluding current duplication which is added by service)
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };

      updateCurrentSessionMessages([...updatedMessages, botMessage], newTitle);
    } catch (error: any) {
      console.error(error);

      // Extract the actual error message from the service
      let errorContent = "عذراً، حدث خطأ أثناء المعالجة. تأكد من اتصالك بالإنترنت ومن صلاحية مفتاح API.";

      if (error?.message) {
        // Check if it's a quota exceeded error
        if (error.message.startsWith("QUOTA_EXCEEDED:")) {
          errorContent = error.message.replace("QUOTA_EXCEEDED: ", "");
        }
        // Check if it's an API key error
        else if (error.message.startsWith("API_KEY_INVALID:")) {
          errorContent = error.message.replace("API_KEY_INVALID: ", "");
        }
        // Use the error message if it's in a recognizable format
        else if (error.message.includes(" / ")) {
          errorContent = error.message;
        }
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: errorContent,
        timestamp: Date.now(),
        isError: true
      };
      updateCurrentSessionMessages([...updatedMessages, errorMessage], newTitle);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAuthLoading || (user && !isSessionsLoaded)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <LoadingIcon />
          <p className="text-gray-600 dark:text-gray-300 text-sm">جاري تحميل المحادثات...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-screen w-full`}>
      <div className="flex h-full bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 dark:from-dark-bg dark:via-slate-900 dark:to-slate-800 text-right overflow-hidden font-sans transition-colors duration-300">
        {/* Sidebar (Desktop: always visible, Mobile: toggleable) */}
        <div className="hidden md:flex md:flex-col w-80 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border-l border-gray-200/50 dark:border-dark-border/50 z-10 transition-colors duration-300 shadow-xl">
          <div className="h-18 flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-dark-border/50 shrink-0 bg-gradient-to-r from-gray-50/50 to-white dark:from-dark-bg/50 dark:to-dark-surface/50">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gradient-to-br from-medical-100 to-medical-200 dark:from-medical-900/40 dark:to-medical-800/40 rounded-xl shadow-sm">
                <ZGLogo />
              </div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-dark-text">Paramedical AI</h1>
            </div>

            {/* Desktop Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/80 transition-all hover:scale-110 active:scale-95 shadow-sm"
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
              onClose={() => { }}
              // Chat Props
              sessions={sessions}
              currentSessionId={currentSessionId}
              onNewChat={createNewSession}
              onSwitchChat={setCurrentSessionId}
              onDeleteChat={deleteSession}
              onRenameChat={renameSession}
              // App Mode
              appMode={appMode}
              onModeChange={setAppMode}
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
            // App Mode
            appMode={appMode}
            onModeChange={setAppMode}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-50/50 via-white to-gray-50/50 dark:from-dark-bg dark:via-slate-900 dark:to-slate-800 transition-colors duration-300">

          {/* Mode Switcher (Visible on Mobile/Desktop) */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="bg-gray-100 dark:bg-dark-surface p-1 rounded-xl flex shadow-inner">
              <button
                onClick={() => setAppMode('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${appMode === 'chat'
                  ? 'bg-white dark:bg-dark-bg text-medical-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>محادثة</span>
              </button>
              <button
                onClick={() => setAppMode('quiz')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${appMode === 'quiz'
                  ? 'bg-white dark:bg-dark-bg text-medical-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>اختبارات</span>
              </button>
            </div>
          </div>

          {appMode === 'chat' ? (
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
          ) : (
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0">
                <QuizContainer files={files} />
              </div>
              {/* Mobile Sidebar Toggle for Quiz Mode */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-dark-surface/80 shadow-sm z-50 text-gray-500"
              >
                <ZGLogo />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;