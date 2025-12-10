
export interface FileContext {
  id: string;
  name: string;
  type: string;
  data?: string; // Base64 string, optional for pre-loaded text files
  content?: string; // Raw text content for pre-loaded files
  size: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isError?: boolean;
  attachments?: string[]; // Array of Data URLs (images)
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number; // Last activity
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string;
  isLoading: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// --- Quiz Types ---

export type QuizType = 'single' | 'multiple'; // 'single' = One correct answer, 'multiple' = All or Nothing (QCM)

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswers: number[]; // Array of indices (0-3). For single, just one element.
  explanation: string;
}

export interface QuizConfig {
  sourceType: 'subject' | 'file';
  subject?: string;
  fileContext?: FileContext; // For file-based quizzes
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  quizType: QuizType;
}

export interface QuizState {
  isActive: boolean;
  config: QuizConfig | null;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  userAnswers: { [questionId: number]: number[] }; // questionId -> array of selectedOptionIndices
  score: number;
  isFinished: boolean;
}

export interface QuizSession {
  id: string;
  title: string;
  createdAt: number;
  config: QuizConfig;
  questions: QuizQuestion[];
  userAnswers: { [questionId: number]: number[] };
  score: number;
  isFinished: boolean;
  currentQuestionIndex: number; // To resume where left off
}

// --- Mnemonic Types ---

export interface MnemonicRequest {
  topic: string;
  language: 'ar' | 'en';
  context?: string; // Optional context (e.g., list of items)
}

export interface MnemonicResponse {
  mnemonic: string;
  breakdown: Array<{ char: string; meaning: string }>;
  explanation: string;
  funFact?: string;
}