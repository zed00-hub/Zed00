
import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import FileSidebar from './components/FileSidebar';
import ChatArea from './components/ChatArea';
import LoginPage from './components/LoginPage';
import { FileContext, Message, ChatSession, QuizSession, QuizResultData } from './types';
import { generateResponseStream, BotSettings } from './services/geminiService';
import { ZGLogo, SunIcon, MoonIcon, LoadingIcon } from './components/Icons';
import { BookOpen, MessageSquare, Sparkles, Settings } from 'lucide-react';
import QuizContainer from './components/Quiz/QuizContainer';
import MnemonicsContainer from './components/Mnemonics/MnemonicsContainer';
import { fileToBase64 } from './utils/fileHelpers';
import { INITIAL_COURSES } from './data/courses';
import { useAuth } from './contexts/AuthContext';
import { saveSessionToFirestore, loadSessionsFromFirestore, deleteSessionFromFirestore } from './services/chatService';
import { saveQuizToFirestore, loadQuizzesFromFirestore, deleteQuizFromFirestore } from './services/quizService';
import ReloadPrompt from './components/ReloadPrompt';
import SettingsModal from './components/SettingsModal';
import AdminPanel from './components/AdminPanel';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { loadCoursesFromFirestore, isAdmin } from './services/coursesService';
import { trackTimeSpent, trackNewConversation, trackNewQuiz } from './services/analyticsService';
import { Crown } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const appMode = location.pathname.includes('quiz') ? 'quiz' : (location.pathname.includes('mnemonics') ? 'mnemonics' : 'chat');

  const handleModeChange = (mode: 'chat' | 'quiz' | 'mnemonics') => {
    if (mode === 'chat') navigate('/conversation');
    else if (mode === 'quiz') navigate('/quiz');
    else navigate('/mnemonics');
  };

  // Initialize files with the pre-loaded courses
  const [files, setFiles] = useState<FileContext[]>(INITIAL_COURSES);

  // Load shared courses from Firestore on mount
  const loadSharedCourses = useCallback(async () => {
    try {
      const sharedCourses = await loadCoursesFromFirestore();
      setFiles(prev => {
        // Merge: keep INITIAL_COURSES and add Firestore courses (avoid duplicates)
        const initialIds = INITIAL_COURSES.map(c => c.id);
        const newCourses = sharedCourses.filter(c => !initialIds.includes(c.id));
        return [...INITIAL_COURSES, ...newCourses];
      });
    } catch (error) {
      console.error('Error loading shared courses:', error);
    }
  }, []);



  useEffect(() => {
    loadSharedCourses();
  }, [loadSharedCourses]);

  // Initialize Chat Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'default',
      title: 'محادثة جديدة',
      messages: [],
      timestamp: Date.now()
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');

  // Initialize Quiz Sessions
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load user data (Sessions and Quizzes) from Firestore
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        console.log("App: Loading data for user", user.id);
        setIsDataLoaded(false);

        try {
          // Load Chats
          const fetchedSessions = await loadSessionsFromFirestore(user.id);
          if (fetchedSessions.length > 0) {
            setSessions(fetchedSessions);
            setCurrentSessionId(fetchedSessions[0].id);
          } else {
            // Create default chat session
            const newId = Date.now().toString();
            const newSession: ChatSession = {
              id: newId,
              title: 'محادثة جديدة',
              messages: [],
              timestamp: Date.now()
            };
            setSessions([newSession]);
            setCurrentSessionId(newId);
            saveSessionToFirestore(user.id, newSession);
          }

          // Load Quizzes
          const fetchedQuizzes = await loadQuizzesFromFirestore(user.id);
          setQuizSessions(fetchedQuizzes);
          // Auto-select the most recent quiz if available (like conversations)
          if (fetchedQuizzes.length > 0) {
            setCurrentQuizId(fetchedQuizzes[0].id);
          } else {
            setCurrentQuizId(null);
          }

        } catch (error) {
          console.error("App: Error loading data:", error);
          // Fallback for chat
          const newId = Date.now().toString();
          setSessions([{
            id: newId,
            title: 'محادثة جديدة',
            messages: [],
            timestamp: Date.now()
          }]);
          setCurrentSessionId(newId);
        } finally {
          setIsDataLoaded(true);
        }
      } else {
        // Logout state - reset to default
        setSessions([{
          id: 'default',
          title: 'محادثة جديدة',
          messages: [],
          timestamp: Date.now()
        }]);
        setCurrentSessionId('default');
        setQuizSessions([]);
        setCurrentQuizId(null);
        setIsDataLoaded(true);
      }
    };

    loadData();
  }, [user?.id]);

  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Ref for aborting AI response
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Function to stop AI generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  }, []);

  // Track Time Spent
  useEffect(() => {
    if (!user?.id) return;

    // Track every minute
    const interval = setInterval(() => {
      // Only track if document is visible (user is active)
      if (document.visibilityState === 'visible') {
        trackTimeSpent(user.id);
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [user?.id]);

  // Get settings from context
  const { settings } = useSettings();

  // Helper to get current session object
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession.messages;

  // Toggle Dark Mode
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // --- Chat Session Management ---

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
      trackNewConversation(user.id);
    }
  };

  const deleteSession = (id: string) => {
    if (sessions.length === 1) {
      const resetSession = { ...sessions[0], messages: [], title: 'محادثة جديدة', timestamp: Date.now() };
      setSessions([resetSession]);
      if (user?.id) saveSessionToFirestore(user.id, resetSession);
      return;
    }

    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);

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
    setSessions(prev => {
      return prev.map(session => {
        if (session.id === currentSessionId) {
          const updatedSession = {
            ...session,
            messages: newMessages,
            title: newTitle || session.title,
            timestamp: Date.now()
          };
          if (user?.id) {
            saveSessionToFirestore(user.id, updatedSession);
          }
          return updatedSession;
        }
        return session;
      });
    });
  };

  // --- Save Quiz Result to Chat History ---
  const saveQuizResultToChat = useCallback((quizResult: QuizResultData) => {
    // Build a formatted text message for the quiz result
    const lines: string[] = [
      `📊 **نتيجة الاختبار: ${quizResult.subjectName}**`,
      ``,
      `🎯 **النقاط:** ${quizResult.score}/${quizResult.totalQuestions} (${quizResult.percentage}%)`,
      ``,
      `---`,
      ``
    ];

    // Add each question with answer details
    quizResult.questions.forEach((q, index) => {
      const statusIcon = q.isCorrect ? '✅' : '❌';
      lines.push(`**س${index + 1}:** ${q.questionText}`);
      lines.push(`${statusIcon} إجابتك: ${q.userAnswer}`);
      if (!q.isCorrect) {
        lines.push(`✔️ الإجابة الصحيحة: ${q.correctAnswer}`);
      }
      lines.push(``);
    });

    // Create a regular text message (not quiz_result type) for reliable storage
    const quizResultMessage: Message = {
      id: Date.now().toString(),
      role: 'model',
      content: lines.join('\n'),
      timestamp: Date.now()
      // Note: We don't use type: 'quiz_result' anymore to ensure reliable Firestore storage
    };

    // Add to current chat session
    const updatedMessages = [...messages, quizResultMessage];
    updateCurrentSessionMessages(updatedMessages);
  }, [messages, currentSessionId, user?.id]);

  // --- Quiz Session Management ---

  const createNewQuiz = () => {
    // Just reset `currentQuizId` to null, calls to `onQuizUpdate` in QuizContainer will create the actual session object
    setCurrentQuizId(null);
  };

  const updateQuizSession = (updatedSession: QuizSession | null) => {
    if (!updatedSession) {
      // Clearing session (Restart)
      setCurrentQuizId(null);
      return;
    }

    // Check if new session to track analytics
    const isNew = !quizSessions.some(q => q.id === updatedSession.id);

    setQuizSessions(prev => {
      const exists = prev.find(q => q.id === updatedSession.id);
      if (exists) {
        return prev.map(q => q.id === updatedSession.id ? updatedSession : q);
      } else {
        return [updatedSession, ...prev];
      }
    });

    // If it's a new session, set it as active
    if (!currentQuizId || currentQuizId !== updatedSession.id) {
      setCurrentQuizId(updatedSession.id);
    }

    if (user?.id) {
      saveQuizToFirestore(user.id, updatedSession);
      if (isNew) {
        trackNewQuiz(user.id);
      }
    }
  };

  const deleteQuiz = (id: string) => {
    const newQuizzes = quizSessions.filter(q => q.id !== id);
    setQuizSessions(newQuizzes);

    if (id === currentQuizId) {
      setCurrentQuizId(null); // Go to new quiz screen
    }

    if (user?.id) {
      deleteQuizFromFirestore(user.id, id);
    }
  };

  const renameQuiz = (id: string, newTitle: string) => {
    let updatedQuiz: QuizSession | undefined;
    setQuizSessions(prev => prev.map(quiz => {
      if (quiz.id === id) {
        updatedQuiz = { ...quiz, title: newTitle };
        return updatedQuiz;
      }
      return quiz;
    }));

    if (updatedQuiz && user?.id) {
      saveQuizToFirestore(user.id, updatedQuiz);
    }
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
      newTitle = input.split(' ').slice(0, 5).join(' ') || 'صورة مرفقة';
    }

    // Optimistic update
    const updatedMessages = [...messages, userMessage];
    updateCurrentSessionMessages(updatedMessages, newTitle);

    setInput('');
    setPendingAttachments([]);
    setIsProcessing(true);

    // Create placeholder bot message for streaming
    const botMessageId = (Date.now() + 1).toString();
    const botMessage: Message = {
      id: botMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now()
    };

    // Add empty bot message immediately
    const messagesWithBot = [...updatedMessages, botMessage];
    updateCurrentSessionMessages(messagesWithBot, newTitle);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let streamedContent = '';
      let wasAborted = false;

      // Check for abort during streaming
      signal.addEventListener('abort', () => {
        wasAborted = true;
      });

      await generateResponseStream(
        userMessage.content,
        files,
        messages,
        (chunk) => {
          if (wasAborted) return; // Stop processing if aborted

          // Update bot message content in real-time
          streamedContent += chunk;
          const updatedBot: Message = {
            ...botMessage,
            content: streamedContent
          };
          updateCurrentSessionMessages([...updatedMessages, updatedBot], newTitle);
        },
        settings // Pass user settings
      );

      // Final update with complete content (only if not aborted)
      if (!wasAborted) {
        const finalBot: Message = {
          ...botMessage,
          content: streamedContent || 'عذراً، لم أتمكن من إنشاء إجابة.'
        };
        updateCurrentSessionMessages([...updatedMessages, finalBot], newTitle);
      }

    } catch (error: any) {
      // Don't show error if it was just aborted by user
      if (error?.name === 'AbortError' || signal.aborted) {
        console.log('Generation stopped by user');
        return;
      }

      console.error(error);

      let errorContent = "عذراً، حدث خطأ. تأكد من اتصالك بالإنترنت.";

      if (error?.message) {
        if (error.message.startsWith("QUOTA_EXCEEDED:")) {
          errorContent = error.message.replace("QUOTA_EXCEEDED: ", "");
        } else if (error.message.startsWith("API_KEY_INVALID:")) {
          errorContent = error.message.replace("API_KEY_INVALID: ", "");
        } else {
          errorContent = error.message;
        }
      }

      const errorMessage: Message = {
        id: botMessageId,
        role: 'model',
        content: errorContent,
        timestamp: Date.now(),
        isError: true
      };
      updateCurrentSessionMessages([...updatedMessages, errorMessage], newTitle);
    } finally {
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  };

  if (isAuthLoading || (user && !isDataLoaded)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <LoadingIcon />
          <p className="text-gray-600 dark:text-gray-300 text-sm">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Check for admin route here, AFTER all hooks are declared to avoid "Rules of Hooks" violation
  if (location.pathname === '/admin') {
    return <AdminPanel />;
  }

  const activeQuiz = currentQuizId ? quizSessions.find(q => q.id === currentQuizId) : null;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} fixed inset-0 w-full overflow-hidden`}>
      <div className="flex h-full bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 dark:from-dark-bg dark:via-slate-900 dark:to-slate-800 text-right overflow-hidden font-sans transition-colors duration-300">
        {/* Sidebar (Desktop: always visible, Mobile: toggleable) */}
        <div className="hidden md:flex md:flex-col w-80 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-l border-gray-200/50 dark:border-dark-border/50 z-10 transition-colors duration-300 shadow-xl">
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
              // Quiz Props
              quizSessions={quizSessions}
              currentQuizId={currentQuizId}
              onNewQuiz={createNewQuiz}
              onSwitchQuiz={setCurrentQuizId}
              onDeleteQuiz={deleteQuiz}
              onRenameQuiz={renameQuiz}
              // App Mode
              appMode={appMode}
              onModeChange={handleModeChange}
              // Theme & Settings
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenAdmin={() => navigate('/admin')}
              isAdmin={isAdmin(user?.email)}
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
            // Quiz Props
            quizSessions={quizSessions}
            currentQuizId={currentQuizId}
            onNewQuiz={createNewQuiz}
            onSwitchQuiz={setCurrentQuizId}
            onDeleteQuiz={deleteQuiz}
            onRenameQuiz={renameQuiz}
            // App Mode
            appMode={appMode}
            onModeChange={handleModeChange}
            // Theme & Settings
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAdmin={() => navigate('/admin')}
            isAdmin={isAdmin(user?.email)}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-50/50 via-white to-gray-50/50 dark:from-dark-bg dark:via-slate-900 dark:to-slate-800 transition-colors duration-300">

          {/* Mode Switcher (Visible on Mobile/Desktop) */}
          <div className="flex justify-center pt-4 pb-2 gap-2">
            <div className="bg-gray-100 dark:bg-dark-surface p-1 rounded-xl flex shadow-inner overflow-x-auto max-w-full">
              <button
                onClick={() => handleModeChange('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${appMode === 'chat'
                  ? 'bg-white dark:bg-dark-bg text-medical-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>محادثة</span>
              </button>
              <button
                onClick={() => handleModeChange('quiz')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${appMode === 'quiz'
                  ? 'bg-white dark:bg-dark-bg text-medical-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>اختبارات</span>
              </button>
              <button
                onClick={() => handleModeChange('mnemonics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${appMode === 'mnemonics'
                  ? 'bg-white dark:bg-dark-bg text-amber-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>حيل حفظية</span>
              </button>
            </div>
          </div>

          <Routes>
            <Route
              path="/conversation"
              element={
                <ChatArea
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  isLoading={isProcessing}
                  onSend={handleSendMessage}
                  onStopGeneration={stopGeneration}
                  onToggleSidebar={() => setIsSidebarOpen(true)}
                  onUpload={handleFileUpload}
                  pendingAttachments={pendingAttachments}
                  onRemoveAttachment={removePendingAttachment}
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                />
              }
            />
            <Route
              path="/quiz"
              element={
                <div className="flex-1 overflow-hidden relative">
                  <div className="absolute inset-0">
                    <QuizContainer
                      files={files}
                      activeQuizSession={activeQuiz}
                      onQuizUpdate={updateQuizSession}
                      onSaveQuizResult={saveQuizResultToChat}
                    />
                  </div>
                  {/* Mobile Sidebar Toggle for Quiz Mode */}
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-dark-surface/80 shadow-sm z-50 text-gray-500"
                  >
                    <ZGLogo />
                  </button>
                </div>
              }
            />
            <Route
              path="/mnemonics"
              element={
                <div className="flex-1 overflow-hidden relative">
                  <div className="absolute inset-0">
                    <MnemonicsContainer />
                  </div>
                  {/* Mobile Sidebar Toggle for Mnemonics Mode */}
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-dark-surface/80 shadow-sm z-50 text-gray-500"
                  >
                    <ZGLogo />
                  </button>
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/conversation" replace />} />
          </Routes>
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ReloadPrompt />
    </div>
  );
};


// Wrap with SettingsProvider
const App: React.FC = () => (
  <SettingsProvider>
    <AppContent />
  </SettingsProvider>
);

export default App;