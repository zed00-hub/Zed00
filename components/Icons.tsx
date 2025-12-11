
import React from 'react';
import {
  Send,
  Paperclip,
  FileText,
  X,
  Bot,
  User,
  Loader2,
  BookOpen,
  Trash2,
  UploadCloud,
  Search,
  Sun,
  Moon,
  Plus,
  MessageSquare,
  Layers,
  Edit2,
  Check,
  LogOut,
  Mail,
  Lock,
  ArrowRight
} from 'lucide-react';

export const SendIcon = () => <Send size={20} />;
export const AttachIcon = () => <Paperclip size={20} />;
export const FileIcon = () => <FileText size={20} />;
export const CloseIcon = () => <X size={16} />;
export const XIcon = () => <X size={14} />; // Smaller X for actions
export const BotIcon = () => <Bot size={24} />;
export const UserIcon = () => <User size={24} />;
export const LoadingIcon = () => <Loader2 size={24} className="animate-spin" />;
export const LogoIcon = () => <BookOpen size={32} />;
export const TrashIcon = () => <Trash2 size={16} />;
export const UploadIcon = () => <UploadCloud size={48} />;
export const SearchIcon = () => <Search size={16} />;
export const SunIcon = () => <Sun size={20} />;
export const MoonIcon = () => <Moon size={20} />;
export const PlusIcon = () => <Plus size={20} />;
export const ChatIcon = () => <MessageSquare size={18} />;
export const LayersIcon = () => <Layers size={18} />;
export const EditIcon = () => <Edit2 size={14} />;
export const CheckIcon = () => <Check size={14} />;
export const LogOutIcon = () => <LogOut size={18} />;
export const MailIcon = () => <Mail size={18} />;
export const LockIcon = () => <Lock size={18} />;
export const ArrowRightIcon = () => <ArrowRight size={18} />;

// Google Logo SVG
export const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// Custom Z.G Logo Component - Using the new PARABOT logo
export const ZGLogo = () => (
  <img
    src="/logo.png"
    alt="PARABOT"
    className="w-10 h-10 object-contain"
  />
);

export { BookOpen };
