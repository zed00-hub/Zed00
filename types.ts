export interface FileContext {
    id: string;
    name: string;
    type: string;
    data?: string; // base64
    size: number;
    content?: string; // text content
    category?: string;
}

export interface Message {
    id: string;
    role: 'user' | 'model' | 'admin';
    content: string;
    timestamp: number;
    attachments?: string[];
    isEdited?: boolean;
    originalContent?: string;
    editedVersions?: MessageVersion[];
    currentVersionIndex?: number;
    isError?: boolean;
}

export interface MessageVersion {
    content: string;
    timestamp: number;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

export interface QuizSession {
    id: string;
    title: string;
    createdAt: number;
    config: QuizConfig;
    questions: QuizQuestion[];
    userAnswers: Record<string, number[]>; // questionId -> answers indices
    score: number;
    isFinished: boolean;
    currentQuestionIndex: number;
    lastUpdated: number;
}

export interface QuizConfig {
    questionCount: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    quizType: 'single' | 'multiple';
    sourceType: 'file' | 'subject';
    fileContext?: FileContext;
    subject?: string;
}

export interface QuizQuestion {
    id: number | string;
    question: string;
    options: string[];
    correctAnswers: number[];
    explanation: string;
}

export interface QuizState {
    isActive: boolean;
    config: QuizConfig | null;
    questions: QuizQuestion[];
    currentQuestionIndex: number;
    userAnswers: Record<string, number[]>;
    score: number;
    isFinished: boolean;
}

export interface ChecklistSession {
    id: string;
    title: string;
    createdAt: number;
    items: ChecklistItem[];
    progress: number; // 0-100
    summary?: string;
    estimatedTime?: string;
    tips?: string[];
}

export interface ChecklistItem {
    id: string;
    title: string;
    description?: string;
    isCompleted: boolean;
    subItems?: ChecklistItem[];
}

export interface ChecklistResponse {
    title: string;
    summary: string;
    items: ChecklistItem[];
    estimatedTime?: string;
    tips?: string[];
}

export interface MnemonicResponse {
    mnemonic: string;
    breakdown: { char: string; meaning: string }[];
    explanation: string;
    funFact: string;
}
