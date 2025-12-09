
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
