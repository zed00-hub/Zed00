
import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import FileSidebar from './components/FileSidebar';
import ChatArea from './components/ChatArea';
import LoginPage from './components/LoginPage';
import { FileContext, Message, ChatSession, QuizSession, MessageVersion, ChecklistSession } from './types';
import { generateResponseStream, BotSettings } from './services/geminiService';
import { ZGLogo, SunIcon, MoonIcon, LoadingIcon } from './components/Icons';
import { BookOpen, MessageSquare, Sparkles, Settings, ClipboardList, ListChecks } from 'lucide-react';
import QuizContainer from './components/Quiz/QuizContainer';
import MnemonicsContainer from './components/Mnemonics/MnemonicsContainer';
import ChecklistContainer from './components/Checklist/ChecklistContainer';
import { fileToBase64 } from './utils/fileHelpers';
import { INITIAL_COURSES } from './data/courses';
import { useAuth } from './contexts/AuthContext';
import { saveSessionToFirestore, loadSessionsFromFirestore, deleteSessionFromFirestore } from './services/chatService';
import { saveQuizToFirestore, loadQuizzesFromFirestore, deleteQuizFromFirestore } from './services/quizService';
import { saveChecklistToFirestore, loadChecklistsFromFirestore, deleteChecklistFromFirestore } from './services/checklistService';
import ReloadPrompt from './components/ReloadPrompt';
import SettingsModal from './components/SettingsModal';
import AdminPanel from './components/AdminPanel';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { loadCoursesFromFirestore, isAdmin } from './services/coursesService';
import { trackTimeSpent, trackNewConversation, trackNewQuiz } from './services/analyticsService';
import { Crown, Bell } from 'lucide-react';
import { getUnreadAdminMessages, markMessageAsRead, AdminMessage } from './services/notificationService';

const AppContent: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const appMode = location.pathname.includes('quiz') ? 'quiz' : (location.pathname.includes('mnemonics') ? 'mnemonics' : (location.pathname.includes('checklist') ? 'checklist' : 'chat'));

  const handleModeChange = (mode: 'chat' | 'quiz' | 'mnemonics' | 'checklist') => {
    if (mode === 'chat') navigate('/conversation');
    else if (mode === 'quiz') navigate('/quiz');
    else if (mode === 'checklist') navigate('/checklist');
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

  // Initialize Checklist Sessions
  const [checklistSessions, setChecklistSessions] = useState<ChecklistSession[]>([]);
  const [currentChecklistId, setCurrentChecklistId] = useState<string | null>(null);
  const [checklistKey, setChecklistKey] = useState(0);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load user data (Sessions and Quizzes) from Firestore
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        console.log("App: Loading data for user", user.id);
        setIsDataLoaded(false);

        try {
          const [fetchedSessions, fetchedQuizzes, fetchedChecklists] = await Promise.all([
            loadSessionsFromFirestore(user.id),
            loadQuizzesFromFirestore(user.id),
            loadChecklistsFromFirestore(user.id)
          ]);

          // Handle Chats
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
            await saveSessionToFirestore(user.id, newSession);
          }

          // Handle Quizzes
          setQuizSessions(fetchedQuizzes);
          // We don't automatically set currentQuizId, user chooses from sidebar
          if (fetchedQuizzes.length > 0) {
            setCurrentQuizId(fetchedQuizzes[0].id);
          } else {
            setCurrentQuizId(null);
          }

          // Handle Checklists
          setChecklistSessions(fetchedChecklists);
          if (fetchedChecklists.length > 0) {
            setCurrentChecklistId(fetchedChecklists[0].id);
          } else {
            setCurrentChecklistId(null);
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
        setChecklistSessions([]);
        setCurrentChecklistId(null);
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

  // Admin Messages State
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [showAdminMessageModal, setShowAdminMessageModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      // Poll for messages periodically or just on load
      getUnreadAdminMessages(user.id).then(msgs => {
        setAdminMessages(msgs);
        // Removed auto-popup: setShowAdminMessageModal(true);
      });
    }
  }, [user?.id]);

  const handleCloseAdminMessage = async () => {
    if (user?.id) {
      for (const msg of adminMessages) {
        await markMessageAsRead(user.id, msg.id);
      }
    }
    setShowAdminMessageModal(false);
    setAdminMessages([]);
  };

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

  // Note: Quiz results are automatically saved in quiz history via onQuizUpdate
  // No need to duplicate them in chat history

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

    // Save to Firestore
    if (user?.id) {
      console.log("App: Saving quiz to Firestore:", updatedSession.id, updatedSession.title, "isFinished:", updatedSession.isFinished);
      saveQuizToFirestore(user.id, updatedSession).then(() => {
        console.log("App: Quiz saved successfully to Firestore");
      }).catch(err => {
        console.error("App: Failed to save quiz:", err);
      });
      if (isNew) {
        trackNewQuiz(user.id);
      }
    } else {
      console.warn("App: No user id, cannot save quiz to Firestore");
    }
  };

  const deleteQuiz = async (id: string) => {
    if (!user?.id) return;
    try {
      await deleteQuizFromFirestore(user.id, id);
      setQuizSessions(prev => prev.filter(q => q.id !== id));
      if (currentQuizId === id) setCurrentQuizId(null);
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  const renameQuiz = async (id: string, newTitle: string) => {
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

  // --- Checklist Management ---
  const createNewChecklist = () => {
    setCurrentChecklistId(null);
    setChecklistKey(prev => prev + 1);
  };

  const deleteChecklist = async (id: string) => {
    if (!user?.id) return;
    try {
      await deleteChecklistFromFirestore(user.id, id);
      setChecklistSessions(prev => prev.filter(s => s.id !== id));
      if (currentChecklistId === id) setCurrentChecklistId(null);
    } catch (error) {
      console.error('Error deleting checklist:', error);
    }
  };

  const updateChecklistSession = (session: ChecklistSession) => {
    setChecklistSessions(prev => {
      const exists = prev.find(s => s.id === session.id);
      if (exists) {
        return prev.map(s => s.id === session.id ? session : s);
      } else {
        return [session, ...prev];
      }
    });

    // If we were in "New Checklist" mode (null), switch to this new session
    if (currentChecklistId === null) {
      setCurrentChecklistId(session.id);
    }
  };

  const renameChecklist = async (id: string, newTitle: string) => {
    let updatedSession: ChecklistSession | undefined;
    setChecklistSessions(prev => prev.map(session => {
      if (session.id === id) {
        updatedSession = { ...session, title: newTitle };
        return updatedSession;
      }
      return session;
    }));

    if (updatedSession && user?.id) {
      await saveChecklistToFirestore(user.id, updatedSession);
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

  // --- Message Edit Handler ---
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (isProcessing) return; // Prevent editing during generation

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== 'user') return;

    const originalMessage = messages[messageIndex];

    // Mark message as edited and preserve original content
    const editedMessage: Message = {
      ...originalMessage,
      content: newContent,
      isEdited: true,
      originalContent: originalMessage.originalContent || originalMessage.content,
    };

    // Get the bot response that followed this user message (if exists)
    const botResponseIndex = messageIndex + 1;
    const existingBotResponse = messages[botResponseIndex];

    // Keep all messages up to user message, replace user message with edited version
    const messagesBeforeBot = [...messages.slice(0, messageIndex), editedMessage];

    // Remove old bot response temporarily
    const messagesWithoutOldBot = messagesBeforeBot;

    // Update UI immediately with edited message
    updateCurrentSessionMessages(messagesWithoutOldBot);

    // Start processing new response
    setIsProcessing(true);

    // Create new bot message
    const newBotMessageId = Date.now().toString();
    const newBotMessage: Message = {
      id: existingBotResponse?.id || newBotMessageId, // Reuse ID if editing
      role: 'model',
      content: '',
      timestamp: Date.now()
    };

    // Initialize edit history for bot response
    if (existingBotResponse) {
      // Preserve all previous versions
      const previousVersions: MessageVersion[] = existingBotResponse.editedVersions || [
        {
          content: existingBotResponse.originalContent || existingBotResponse.content,
          timestamp: existingBotResponse.timestamp
        }
      ];

      // Add current content as another version if not already there
      if (existingBotResponse.content !== existingBotResponse.originalContent) {
        previousVersions.push({
          content: existingBotResponse.content,
          timestamp: existingBotResponse.timestamp
        });
      }

      newBotMessage.editedVersions = previousVersions;
      newBotMessage.originalContent = existingBotResponse.originalContent || existingBotResponse.content;
      newBotMessage.isEdited = true;
      newBotMessage.currentVersionIndex = previousVersions.length; // Point to new version
    }

    const messagesWithNewBot = [...messagesWithoutOldBot, newBotMessage];
    updateCurrentSessionMessages(messagesWithNewBot);

    // Create abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let streamedContent = '';
      let wasAborted = false;

      signal.addEventListener('abort', () => {
        wasAborted = true;
      });

      // Get message history before the edited message for context
      const historyForRegeneration = messages.slice(0, messageIndex);

      await generateResponseStream(
        newContent,
        files,
        historyForRegeneration,
        (chunk) => {
          if (wasAborted) return;

          streamedContent += chunk;
          const updatedBot: Message = {
            ...newBotMessage,
            content: streamedContent
          };
          updateCurrentSessionMessages([...messagesWithoutOldBot, updatedBot]);
        },
        settings
      );

      if (!wasAborted) {
        const finalBot: Message = {
          ...newBotMessage,
          content: streamedContent || 'عذراً، لم أتمكن من إنشاء إجابة.'
        };

        // Add new response as latest version
        if (finalBot.editedVersions) {
          finalBot.editedVersions.push({
            content: finalBot.content,
            timestamp: Date.now()
          });
          finalBot.currentVersionIndex = finalBot.editedVersions.length - 1;
        }

        updateCurrentSessionMessages([...messagesWithoutOldBot, finalBot]);
      }

    } catch (error: any) {
      if (error?.name === 'AbortError' || signal.aborted) {
        console.log('Regeneration stopped by user');
        return;
      }

      console.error('Regeneration error:', error);

      const errorMessage: Message = {
        id: newBotMessageId,
        role: 'model',
        content: 'عذراً، حدث خطأ أثناء إعادة التوليد.',
        timestamp: Date.now(),
        isError: true
      };
      updateCurrentSessionMessages([...messagesWithoutOldBot, errorMessage]);
    } finally {
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  };

  // --- Version Navigation Handler ---
  const handleNavigateVersion = (messageId: string, direction: 'prev' | 'next') => {
    setSessions(prev => {
      return prev.map(session => {
        if (session.id === currentSessionId) {
          const updatedMessages = session.messages.map(msg => {
            if (msg.id === messageId && msg.editedVersions) {
              const currentIndex = msg.currentVersionIndex ?? 0;
              const totalVersions = msg.editedVersions.length;

              let newIndex = currentIndex;
              if (direction === 'prev' && currentIndex > 0) {
                newIndex = currentIndex - 1;
              } else if (direction === 'next' && currentIndex < totalVersions - 1) {
                newIndex = currentIndex + 1;
              }

              return {
                ...msg,
                content: msg.editedVersions[newIndex].content,
                currentVersionIndex: newIndex
              };
            }
            return msg;
          });

          const updatedSession = {
            ...session,
            messages: updatedMessages,
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

  // --- Continue Response Handler ---
  const handleContinueResponse = async (messageId: string) => {
    if (isProcessing) return;

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== 'model') return;

    const targetMessage = messages[messageIndex];

    // Find the user message that preceded this response
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    const userMessage = userMessageIndex >= 0 ? messages[userMessageIndex] : null;
    if (!userMessage) return;

    setIsProcessing(true);

    // Create prompt to continue the response
    const continuePrompt = `أكمل إجابتك السابقة من حيث توقفت. الإجابة السابقة كانت:
---
${targetMessage.content}
---
أكمل من حيث توقفت بدون تكرار ما قيل.`;

    // Create abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let streamedContent = targetMessage.content;
      let wasAborted = false;

      signal.addEventListener('abort', () => {
        wasAborted = true;
      });

      // Get message history before the target message for context
      const historyForContinuation = messages.slice(0, messageIndex);

      await generateResponseStream(
        continuePrompt,
        files,
        historyForContinuation,
        (chunk) => {
          if (wasAborted) return;

          streamedContent += chunk;
          const updatedMessages = messages.map((msg, idx) =>
            idx === messageIndex ? { ...msg, content: streamedContent } : msg
          );
          updateCurrentSessionMessages(updatedMessages);
        },
        settings
      );

      if (!wasAborted) {
        const finalMessages = messages.map((msg, idx) =>
          idx === messageIndex ? { ...msg, content: streamedContent } : msg
        );
        updateCurrentSessionMessages(finalMessages);
      }

    } catch (error: any) {
      if (error?.name === 'AbortError' || signal.aborted) {
        console.log('Continue stopped by user');
        return;
      }

      console.error('Continue error:', error);
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

            {/* Desktop Theme Toggle & Notifications */}
            <div className="flex items-center gap-1">
              {adminMessages.length > 0 && (
                <button
                  onClick={() => setShowAdminMessageModal(true)}
                  className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all relative group"
                  title="إشعارات جديدة"
                >
                  <Bell size={20} className="animate-pulse" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-surface"></span>
                </button>
              )}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/80 transition-all hover:scale-110 active:scale-95 shadow-sm"
                title="Toggle Theme"
              >
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <FileSidebar
              files={files}
              setFiles={setFiles}
              isOpen={true} // Always open on desktop
              onClose={() => { }}
              // Chat Props
              chatSessions={sessions}
              currentSessionId={currentSessionId}
              onSessionSelect={setCurrentSessionId}
              onNewChat={createNewSession}
              onDeleteSession={deleteSession}
              onRenameSession={renameSession}
              // Quiz Props
              quizSessions={quizSessions}
              currentQuizId={currentQuizId}
              onQuizSelect={setCurrentQuizId}
              onNewQuiz={createNewQuiz}
              onDeleteQuiz={deleteQuiz}
              onRenameQuiz={renameQuiz}
              // Checklist Props
              checklistSessions={checklistSessions}
              currentChecklistId={currentChecklistId}
              onChecklistSelect={setCurrentChecklistId}
              onNewChecklist={createNewChecklist}
              onDeleteChecklist={deleteChecklist}
              // App Mode
              appMode={appMode}
              onModeChange={handleModeChange}
              // Theme & Settings
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenAdmin={() => navigate('/admin')}
              isAdmin={isAdmin(user?.email)}
              onRenameChecklist={renameChecklist}
            />
          </div>
        </div>

        {/* Mobile Sidebar Logic */}
        <div className="md:hidden">
          <FileSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            files={files}
            onFileSelect={() => { }}
            chatSessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={setCurrentSessionId}
            onNewChat={createNewSession}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            onOpenSettings={() => setIsSettingsOpen(true)}
            quizSessions={quizSessions}
            currentQuizId={currentQuizId}
            onQuizSelect={setCurrentQuizId}
            onNewQuiz={createNewQuiz}
            onDeleteQuiz={deleteQuiz}
            onRenameQuiz={renameQuiz}
            appMode={appMode}
            onModeChange={handleModeChange}
            // Checklist Props
            checklistSessions={checklistSessions}
            currentChecklistId={currentChecklistId}
            onChecklistSelect={setCurrentChecklistId}
            onNewChecklist={createNewChecklist}
            onDeleteChecklist={deleteChecklist}
            onOpenAdmin={() => navigate('/admin')}
            isAdmin={isAdmin(user?.email)}
            onRenameChecklist={renameChecklist}
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
              <button
                onClick={() => handleModeChange('checklist')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${appMode === 'checklist'
                  ? 'bg-white dark:bg-dark-bg text-teal-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>Chekiha</span>
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
                  onEditMessage={handleEditMessage}
                  onNavigateVersion={handleNavigateVersion}
                  onContinueResponse={handleContinueResponse}
                  adminMessagesCount={adminMessages.length}
                  onOpenAdminMessages={() => setShowAdminMessageModal(true)}
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
                    />
                  </div>
                  {/* Mobile Sidebar Toggle for Quiz Mode */}
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-dark-surface/80 shadow-sm z-50 text-gray-500 flex items-center gap-2"
                  >
                    {adminMessages.length > 0 && (
                      <div className="relative">
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-dark-surface animate-pulse"></span>
                        <Bell size={18} className="text-amber-500" />
                      </div>
                    )}
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
                    className="md:hidden absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-dark-surface/80 shadow-sm z-50 text-gray-500 flex items-center gap-2"
                  >
                    {adminMessages.length > 0 && (
                      <div className="relative">
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-dark-surface animate-pulse"></span>
                        <Bell size={18} className="text-amber-500" />
                      </div>
                    )}
                    <ZGLogo />
                  </button>
                </div>
              }
            />
            <Route
              path="/checklist"
              element={
                <div className="flex-1 overflow-hidden relative">
                  <div className="absolute inset-0">
                    <ChecklistContainer
                      key={currentChecklistId || `new-${checklistKey}`}
                      initialSession={checklistSessions.find(s => s.id === currentChecklistId)}
                      onSaveSession={updateChecklistSession}
                      userId={user?.id}
                      onNewChecklist={createNewChecklist}
                    />
                  </div>
                  {/* Mobile Sidebar Toggle for Checklist Mode */}
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden absolute top-4 right-4 p-2 rounded-lg bg-white/80 dark:bg-dark-surface/80 shadow-sm z-50 text-gray-500 flex items-center gap-2"
                  >
                    {adminMessages.length > 0 && (
                      <div className="relative">
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-dark-surface animate-pulse"></span>
                        <Bell size={18} className="text-amber-500" />
                      </div>
                    )}
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

      {/* Admin Message Modal */}
      {showAdminMessageModal && adminMessages.length > 0 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-amber-500 relative">
            <button
              onClick={() => setShowAdminMessageModal(false)}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              ✖
            </button>
            <div className="absolute -top-6 -right-6 bg-amber-500 text-white p-4 rounded-full shadow-lg">
              <Bell size={32} className="animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-6 mt-2 text-right">
              إشعارات جديدة ({adminMessages.length})
            </h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {adminMessages.map(msg => (
                <div key={msg.id} className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800/30">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed text-lg font-medium text-right">
                    {msg.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 text-left" dir="ltr">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={handleCloseAdminMessage}
              className="w-full mt-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-amber-500/20 active:scale-[0.98]"
            >
              علم، تم القراءة
            </button>
          </div>
        </div>
      )}
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